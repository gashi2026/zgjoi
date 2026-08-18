"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireRole, hashPassword } from "@/lib/server/auth";
import { setSetting } from "@/lib/server/settings";
import { categories as baseCategories } from "@/lib/data";

const slugify = (s: string) =>
  s.toLowerCase().replace(/ë/g, "e").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ------------------------------------------------------------- users */

/** Full account edit: identity, contact, role, password, photo. */
export async function updateUser(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const city = String(formData.get("city") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const personalNo = String(formData.get("personalNo") ?? "").replace(/\D/g, "");
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
  if (!id || name.length < 2) return;

  const data: Record<string, unknown> = {
    name,
    city: city || null,
    phone: phone || null,
  };

  if (email && email.includes("@")) {
    const clash = await db.user.findFirst({ where: { email, NOT: { id } } });
    if (!clash) data.email = email;
  }
  if (personalNo) data.personalNoLast4 = personalNo.slice(-4);
  if (password.length >= 8) data.passwordHash = await hashPassword(password);
  // never let an admin lock themselves out of the admin area
  if (["CLIENT", "PRO", "SUPPORT", "ADMIN"].includes(role) && id !== admin.id) {
    data.role = role;
  }

  await db.user.update({ where: { id }, data });

  if (formData.has("avatarUrl")) {
    await setSetting(`avatar:${id}`, avatarUrl || null);
  }

  // promoted to PRO but has no profile yet? create a starter one
  if (data.role === "PRO") {
    const existing = await db.proProfile.findUnique({ where: { userId: id } });
    if (!existing) {
      await db.proProfile.create({
        data: {
          userId: id,
          slug: `${slugify(name)}-${id.slice(-4)}`,
          categorySlug: "riparime",
          about: "Profil i krijuar nga administrata.",
          priceFrom: 1500,
          serviceCities: city ? [city] : [],
          verification: "PENDING",
        },
      });
    }
  }

  revalidatePath("/admin/perdoruesit");
}

/** Everything on the professional's profile. */
export async function updateProProfile(formData: FormData) {
  await requireRole("ADMIN");
  const profileId = String(formData.get("profileId"));
  if (!profileId) return;

  const categorySlug = String(formData.get("categorySlug") ?? "").trim();
  const subcategory = String(formData.get("subcategory") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();
  const experience = String(formData.get("experience") ?? "").trim();
  const priceFromEur = Number(formData.get("priceFrom") ?? 0);
  const radiusKm = Number(formData.get("radiusKm") ?? 25);
  const citiesRaw = String(formData.get("serviceCities") ?? "");
  const iban = String(formData.get("iban") ?? "").replace(/\s/g, "");
  const verification = String(formData.get("verification") ?? "");

  const serviceCities = citiesRaw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const data: Record<string, unknown> = {
    about: about || "Profil i krijuar nga administrata.",
    experience: experience || null,
    radiusKm: Number.isFinite(radiusKm) && radiusKm > 0 ? Math.round(radiusKm) : 25,
    serviceCities,
  };
  if (categorySlug) data.categorySlug = categorySlug;
  if (Number.isFinite(priceFromEur) && priceFromEur > 0) {
    data.priceFrom = Math.round(priceFromEur * 100);
  }
  if (iban) data.ibanLast4 = iban.slice(-4);
  if (["PENDING", "APPROVED", "REJECTED"].includes(verification)) {
    data.verification = verification;
    if (verification === "APPROVED") data.verifiedAt = new Date();
  }

  await db.proProfile.update({ where: { id: profileId }, data });

  // the specialisation is kept as the profile's headline service
  if (subcategory) {
    const price = (data.priceFrom as number) ?? 1500;
    const existing = await db.proService.findFirst({ where: { profileId } });
    if (existing) {
      await db.proService.update({ where: { id: existing.id }, data: { name: subcategory, price } });
    } else {
      await db.proService.create({ data: { profileId, name: subcategory, price } });
    }
  }

  revalidatePath("/admin/perdoruesit");
}

export async function createUser(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "CLIENT");
  const city = String(formData.get("city") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
  const categorySlug = String(formData.get("categorySlug") ?? "").trim();
  const subcategory = String(formData.get("subcategory") ?? "").trim();
  const personalNo = String(formData.get("personalNo") ?? "").replace(/\D/g, "");
  const priceFrom = Number(formData.get("priceFrom") ?? 15);

  if (name.length < 2 || !email.includes("@") || password.length < 8) return;
  if (!["CLIENT", "PRO", "SUPPORT", "ADMIN"].includes(role)) return;
  if (await db.user.findUnique({ where: { email } })) return;

  const user = await db.user.create({
    data: {
      email, name,
      city: city || null,
      phone: phone || null,
      passwordHash: await hashPassword(password),
      role: role as "CLIENT" | "PRO" | "SUPPORT" | "ADMIN",
      emailVerified: new Date(),
      personalNoLast4: personalNo ? personalNo.slice(-4) : null,
    },
  });

  if (avatarUrl) await setSetting(`avatar:${user.id}`, avatarUrl);

  if (role === "PRO") {
    const cents = Math.max(100, Math.round((Number.isFinite(priceFrom) ? priceFrom : 15) * 100));
    const profile = await db.proProfile.create({
      data: {
        userId: user.id,
        slug: `${slugify(name)}-${user.id.slice(-4)}`,
        categorySlug: categorySlug || "riparime",
        about: subcategory ? `Specializuar në ${subcategory}.` : "Profil i krijuar nga administrata.",
        priceFrom: cents,
        serviceCities: city ? [city] : [],
        verification: "APPROVED",
        verifiedAt: new Date(),
      },
    });
    if (subcategory) {
      await db.proService.create({ data: { profileId: profile.id, name: subcategory, price: cents } });
    }
  }

  revalidatePath("/admin/perdoruesit");
}

export async function suspendUser(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (!id || id === admin.id) return;
  await db.user.update({ where: { id }, data: { suspendedAt: new Date() } });
  await db.session.deleteMany({ where: { userId: id } });
  revalidatePath("/admin/perdoruesit");
}

export async function unsuspendUser(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (!id) return;
  await db.user.update({ where: { id }, data: { suspendedAt: null } });
  revalidatePath("/admin/perdoruesit");
}

export async function deleteUser(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (!id || id === admin.id) return;
  await db.session.deleteMany({ where: { userId: id } });
  await db.user.delete({ where: { id } }).catch(() => {});
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
  await db.proProfile.update({ where: { id: profileId }, data: { verification: "REJECTED" } });
  revalidatePath("/admin/perdoruesit");
  revalidatePath("/admin");
}

/* -------------------------------------------------------- categories */

export async function seedCategories() {
  await requireRole("ADMIN");
  if ((await db.category.count()) > 0) return;
  await db.category.createMany({
    data: baseCategories.map((c, i) => ({ slug: c.slug, name: c.name, icon: c.icon, position: i, active: true })),
    skipDuplicates: true,
  });
  revalidatePath("/admin/kategorite");
}

export async function createCategory(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "sparkles").trim() || "sparkles";
  if (name.length < 2) return;
  const slug = slugify(String(formData.get("slug") ?? "").trim() || name);
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
  await db.category.update({ where: { id }, data: { name, icon: icon || "sparkles" } });
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
  await db.review.update({ where: { id }, data: { state: "PUBLISHED", flagReason: null } });
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

/* ------------------------------------------------------ site settings */

export async function saveSiteSettings(formData: FormData) {
  await requireRole("ADMIN");
  await setSetting("site", {
    heroTitle: String(formData.get("heroTitle") ?? "").trim(),
    heroAccent: String(formData.get("heroAccent") ?? "").trim(),
    heroSubtitle: String(formData.get("heroSubtitle") ?? "").trim(),
    logoUrl: String(formData.get("logoUrl") ?? "").trim(),
  });
  revalidatePath("/");
  revalidatePath("/admin/kategorite");
}

export async function saveHoneycomb(formData: FormData) {
  await requireRole("ADMIN");
  const map: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("cell:")) {
      const slug = String(value);
      if (slug && slug !== "—") map[key.slice(5)] = slug;
    }
  }
  await setSetting("honeycomb", map);
  revalidatePath("/");
  revalidatePath("/admin/kategorite");
}
