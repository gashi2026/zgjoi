"use server";
import { serviceCategory, allowedCategorySlugs } from "@/lib/service-categories";
import { activeServiceCategories } from "@/lib/server/service-catalog";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { requireRole } from "@/lib/server/auth";
import { invariant } from "@/lib/server/errors";
import { entityId, cleanText } from "@/lib/marketplace-validation";
import { categories as baseCategories } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
function refresh() {
  revalidatePath("/admin/kategorite");
  revalidatePath("/");
}
export async function seedCategories() {
  const actor = await requireRole("ADMIN");
  await db.$transaction(async (tx) => {
    for (const [position, c] of baseCategories.entries()) await tx.category.upsert({
      where: { slug: c.slug }, create: { slug: c.slug, name: c.name, icon: c.icon, position, active: true },
      update: { name: c.name, icon: c.icon, position },
    });
    await tx.category.updateMany({ where: { slug: { notIn: allowedCategorySlugs } }, data: { active: false } });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "CATEGORIES_SEEDED",
        target: "categories",
      },
    });
  });
  refresh();
}
export async function createCategory(fd: FormData) {
  const t = await getT();
  const actor = await requireRole("ADMIN");
  const name = cleanText(2, 100).parse(fd.get("name")),
    icon = cleanText(1, 80).parse(fd.get("icon") || "sparkles");
  const slug = slugify(String(fd.get("slug") || name));
  invariant(serviceCategory(slug)?.slug === slug, "CATEGORY", 400, t("actions.only14ApprovedCategories"));
  await db.$transaction(async (tx) => {
    const last = await tx.category.aggregate({ _max: { position: true } });
    const category = await tx.category.upsert({
      where: { slug },
      create: { slug, name, icon, position: (last._max.position ?? 0) + 1 },
      update: { name, icon },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "CATEGORY_SAVED",
        target: category.id,
      },
    });
  });
  refresh();
}
export async function updateCategory(fd: FormData) {
  const t = await getT();
  const actor = await requireRole("ADMIN"),
    id = entityId.parse(fd.get("id")),
    name = cleanText(2, 100).parse(fd.get("name")),
    icon = cleanText(1, 80).parse(fd.get("icon") || "sparkles");
  const existing = await db.category.findUniqueOrThrow({ where: { id } });
  invariant(serviceCategory(existing.slug), "CATEGORY", 400, t("actions.categoryIsntApprovedList"));
  await db.$transaction([
    db.category.update({ where: { id }, data: { name, icon } }),
    db.auditLog.create({
      data: { actorId: actor.id, action: "CATEGORY_SAVED", target: id },
    }),
  ]);
  refresh();
}
export async function toggleCategory(fd: FormData) {
  const actor = await requireRole("ADMIN"),
    id = entityId.parse(fd.get("id"));
  await db.$transaction(async (tx) => {
  const t = await getT();
    const c = await tx.category.findUniqueOrThrow({ where: { id } });
    invariant(serviceCategory(c.slug), "CATEGORY", 400, t("actions.categoryIsntApprovedList"));
    await tx.category.update({ where: { id }, data: { active: !c.active } });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "CATEGORY_VISIBILITY",
        target: id,
        meta: { active: !c.active },
      },
    });
  });
  refresh();
}
/** Retain referenced category slugs for historical jobs and profiles. */
export async function deleteCategory(fd: FormData) {
  const actor = await requireRole("ADMIN"),
    id = entityId.parse(fd.get("id"));
  await db.$transaction([
    db.category.update({ where: { id }, data: { active: false } }),
    db.auditLog.create({
      data: { actorId: actor.id, action: "CATEGORY_ARCHIVED", target: id },
    }),
  ]);
  refresh();
}
export async function saveSiteSettings(fd: FormData) {
  const t = await getT();
  const actor = await requireRole("ADMIN");
  const data = z
    .object({
      heroTitle: z.string().trim().max(120),
      heroAccent: z.string().trim().max(80),
      heroSubtitle: z.string().trim().max(500),
      logoUrl: z
        .string()
        .trim()
        .max(500)
        .refine(
          (s) =>
            !s ||
            (s.startsWith("/") && !s.startsWith("//")) ||
            /^https:\/\//.test(s),
          t("actions.useHttpsAddressLocal"),
        ),
    })
    .parse(
      Object.fromEntries(
        ["heroTitle", "heroAccent", "heroSubtitle", "logoUrl"].map((key) => [
          key,
          String(fd.get(key) ?? ""),
        ]),
      ),
    );
  await db.$transaction([
    db.setting.upsert({
      where: { key: "site" },
      create: { key: "site", value: data },
      update: { value: data },
    }),
    db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "SITE_SETTINGS_UPDATED",
        target: "site",
      },
    }),
  ]);
  refresh();
}
export async function saveHoneycomb(fd: FormData) {
  const t = await getT();
  const actor = await requireRole("ADMIN");
  const categories = await activeServiceCategories(),
    map: Record<string, string> = {};
  for (const [key, value] of fd.entries()) {
    if (key.startsWith("cell:")) {
      const cell = key.slice(5),
        slug = String(value);
      invariant(
        /^[\d.,-]{1,20}$/.test(cell),
        "CELL",
        400,
        t("actions.cellIsntValid"),
      );
      if (slug && slug !== "—") {
        invariant(
          categories.some((c) => c.slug === slug),
          "CATEGORY",
          400,
          t("actions.categoryIsntActive"),
        );
        map[cell] = slug;
      }
    }
  }
  await db.$transaction([
    db.setting.upsert({
      where: { key: "honeycomb" },
      create: { key: "honeycomb", value: map },
      update: { value: map },
    }),
    db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "HONEYCOMB_UPDATED",
        target: "honeycomb",
      },
    }),
  ]);
  refresh();
}

/** Per-category hiring paths: flip Book now or the paid estimate for one
 * approved category. Creates the category row when only the code default exists. */
export async function setHiringFlow(fd: FormData) {
  const t = await getT();
  const actor = await requireRole("ADMIN");
  const slug = z.string().min(1).max(80).parse(fd.get("slug"));
  const field = z.enum(["bookNowEnabled", "estimateEnabled"]).parse(fd.get("field"));
  const value = z.enum(["true", "false"]).parse(fd.get("value")) === "true";
  const category = serviceCategory(slug);
  invariant(category, "CATEGORY", 400, t("actions.categoryIsntApprovedList"));
  await db.$transaction(async (tx) => {
    await tx.category.upsert({
      where: { slug: category.slug },
      create: { slug: category.slug, name: category.name, icon: category.icon, [field]: value },
      update: { [field]: value },
    });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "CATEGORY_HIRING_FLOW", target: category.slug, meta: { field, value } } });
  });
  refresh();
}
