"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireRole, hashPassword } from "@/lib/server/auth";
import { setSetting } from "@/lib/server/settings";
import { categories as baseCategories } from "@/lib/data";

/* ------------------------------------------------------------- users */

export async function updateUser(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!id || name.length < 2) return;

  await db.user.update({
    where: { id },
    data: { name, city: city || null, phone: phone || null },
  });
  revalidatePath("/admin/perdoruesit");
}

export async function suspendUser(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (!id || id === admin.id) return; // never suspend yourself
  await db.user.update({ where: { id }, data: { suspendedAt: new Date() } });
  await db.session.deleteMany({ where: { userId: id } }); // log them out
  revalidatePath("/admin/perdoruesit");
}

export async function unsuspendUser(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (!id) return;
  await db.user.update({ where: { id }, data: { suspendedAt: null } });
  revalidatePath("/admin/perdoruesit");
}

/* ----------------------------------------------------- verifications */

export async function approvePro(formData: FormData) {
  await requireRole("ADMIN");
  const profileId = String(formData.get("profileId"));
  if (!profileId) return;
  await db.proProfile.update({
    where: { id: profileId },
    data: { verification: "APPROVED", verifiedAt: new Date() },
  });
  revalidatePath("/admin/perdoruesit");
  revalidatePath("/admin");
}

export async function rejectPro(formData: FormData) {
  await requireRole("ADMIN");
  const profileId = String(formData.get("profileId"));
  if (!profileId) return;
  await db.proProfile.update({
    where: { id: profileId },
    data: { verification: "REJECTED" },
  });
  revalidatePath("/admin/perdoruesit");
  revalidatePath("/admin");
}

/* -------------------------------------------------------- categories */

export async function seedCategories() {
  await requireRole("ADMIN");
  const existing = await db.category.count();
  if (existing > 0) return;
  await db.category.createMany({
    data: baseCategories.map((c, i) => ({
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      position: i,
      active: true,
    })),
    skipDuplicates: true,
  });
  revalidatePath("/admin/kategorite");
}

export async function createCategory(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const icon = String(formData.get("icon") ?? "sparkles").trim() || "sparkles";
  if (name.length < 2) return;
  const slug = (slugRaw || name)
    .toLowerCase()
    .replace(/ë/g, "e").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return;
  const last = await db.category.findFirst({ orderBy: { position: "desc" } });
  await db.category.upsert({
    where: { slug },
    create: { slug, name, icon, position: (last?.position ?? 0) + 1 },
    update: { name, icon },
  });
  revalidatePath("/admin/kategorite");
}

export async function updateCategory(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();
  if (!id || name.length < 2) return;
  await db.category.update({
    where: { id },
    data: { name, icon: icon || "sparkles" },
  });
  revalidatePath("/admin/kategorite");
}

export async function toggleCategory(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (!id) return;
  const cat = await db.category.findUnique({ where: { id } });
  if (!cat) return;
  await db.category.update({ where: { id }, data: { active: !cat.active } });
  revalidatePath("/admin/kategorite");
}

export async function deleteCategory(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (!id) return;
  await db.category.delete({ where: { id } });
  revalidatePath("/admin/kategorite");
}

/* ----------------------------------------------------------- reviews */

export async function flagReview(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return;
  await db.review.update({
    where: { id },
    data: { state: "FLAGGED", flagReason: reason || "Shqyrtim nga administrata" },
  });
  revalidatePath("/admin/vleresimet");
}

export async function removeReview(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (!id) return;
  await db.review.update({ where: { id }, data: { state: "REMOVED" } });
  revalidatePath("/admin/vleresimet");
}

export async function restoreReview(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (!id) return;
  await db.review.update({
    where: { id },
    data: { state: "PUBLISHED", flagReason: null },
  });
  revalidatePath("/admin/vleresimet");
}

/* ------------------------------------------------------ support state */

export async function setTicketState(formData: FormData) {
  await requireRole("ADMIN", "SUPPORT");
  const id = String(formData.get("id"));
  const state = String(formData.get("state"));
  if (!id || !["OPEN", "WAITING", "RESOLVED"].includes(state)) return;
  await db.supportTicket.update({
    where: { id },
    data: { state: state as "OPEN" | "WAITING" | "RESOLVED" },
  });
  revalidatePath("/admin/mbeshtetja");
}

/* -------------------------------------------------------- create user */


export async function createUser(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "CLIENT");
  const city = String(formData.get("city") ?? "").trim();
  const categorySlug = String(formData.get("categorySlug") ?? "").trim();

  if (name.length < 2 || !email.includes("@") || password.length < 8) return;
  if (!["CLIENT", "PRO", "SUPPORT", "ADMIN"].includes(role)) return;

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return;

  const user = await db.user.create({
    data: {
      email,
      name,
      city: city || null,
      passwordHash: await hashPassword(password),
      role: role as "CLIENT" | "PRO" | "SUPPORT" | "ADMIN",
      emailVerified: new Date(), // admin-created accounts are trusted
    },
  });

  // a PRO needs a profile so they can appear and receive leads
  if (role === "PRO") {
    const slugBase = name.toLowerCase()
      .replace(/ë/g, "e").replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await db.proProfile.create({
      data: {
        userId: user.id,
        slug: `${slugBase}-${user.id.slice(-4)}`,
        categorySlug: categorySlug || "riparime",
        about: "Profil i krijuar nga administrata.",
        priceFrom: 1500,
        serviceCities: city ? [city] : [],
        verification: "APPROVED",
        verifiedAt: new Date(),
      },
    });
  }

  revalidatePath("/admin/perdoruesit");
}

/* ------------------------------------------------------ site settings */


export async function saveSiteSettings(formData: FormData) {
  await requireRole("ADMIN");
  const site = {
    heroTitle: String(formData.get("heroTitle") ?? "").trim(),
    heroAccent: String(formData.get("heroAccent") ?? "").trim(),
    heroSubtitle: String(formData.get("heroSubtitle") ?? "").trim(),
    logoUrl: String(formData.get("logoUrl") ?? "").trim(),
  };
  await setSetting("site", site);
  revalidatePath("/");
  revalidatePath("/admin/faqja");
}

export async function saveHoneycomb(formData: FormData) {
  await requireRole("ADMIN");
  const map: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("cell:")) {
      const cell = key.slice(5);
      const slug = String(value);
      if (slug && slug !== "—") map[cell] = slug;
    }
  }
  await setSetting("honeycomb", map);
  revalidatePath("/");
  revalidatePath("/admin/faqja");
}
