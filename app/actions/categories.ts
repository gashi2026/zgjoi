"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function guard() {
  const me = await currentUser();
  if (!me || me.role !== "ADMIN") redirect("/hyr?next=/admin/kategorite");
}

function back(params: string) {
  revalidatePath("/admin/kategorite");
  revalidatePath("/");
  redirect(`/admin/kategorite?${params}`);
}

/* Add a category — or quietly refresh one that already exists under the
   same name, rather than failing on the duplicate. */
export async function addCategory(fd: FormData) {
  await guard();

  const name = String(fd.get("name") ?? "").trim();
  const icon = String(fd.get("icon") ?? "").trim() || "sparkles";

  if (name.length < 2) back(`err=${encodeURIComponent("Shkruaj emrin e kategorisë.")}`);

  const slug = slugify(name);
  if (!slug) back(`err=${encodeURIComponent("Emri duhet të ketë shkronja ose numra.")}`);

  try {
    const existing = await db.category.findUnique({ where: { slug } });

    if (existing) {
      await db.category.update({
        where: { slug },
        data: { name, icon, active: true },
      });
      back(`ok=${encodeURIComponent(`"${name}" u përditësua.`)}`);
    }

    const last = await db.category.aggregate({ _max: { position: true } });

    await db.category.create({
      data: {
        id: crypto.randomUUID(),
        slug,
        name,
        icon,
        position: (last._max.position ?? 0) + 1,
        active: true,
      },
    });
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect
    const msg = e instanceof Error ? e.message : "Gabim i panjohur";
    back(`err=${encodeURIComponent(`Nuk u ruajt: ${msg.slice(0, 160)}`)}`);
  }

  back(`ok=${encodeURIComponent(`"${name}" u shtua.`)}`);
}

/* Save name + icon of an existing category. */
export async function saveCategory(fd: FormData) {
  await guard();

  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const icon = String(fd.get("icon") ?? "").trim() || "sparkles";

  if (!id) back(`err=${encodeURIComponent("Kategoria nuk u gjet.")}`);

  try {
    await db.category.update({
      where: { id },
      data: name.length >= 2 ? { name, icon } : { icon },
    });
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    const msg = e instanceof Error ? e.message : "Gabim i panjohur";
    back(`err=${encodeURIComponent(`Nuk u ruajt: ${msg.slice(0, 160)}`)}`);
  }

  back(`ok=${encodeURIComponent("Ndryshimet u ruajtën.")}`);
}
