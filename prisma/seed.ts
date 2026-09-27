import { allowedCategorySlugs } from "../lib/service-categories";
/** Catalog-only seed for local/staging development. Never creates/promotes users. */
import { PrismaClient } from "@prisma/client";
import { categories } from "../lib/data";
const db = new PrismaClient({ log: [] });
async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  const local = ["127.0.0.1", "localhost"].includes(url.hostname);
  const marker = await db.setting.findUnique({
    where: { key: "_staging_environment" },
  });
  const value = marker?.value as { kind?: string } | undefined;
  if (!local && value?.kind !== "staging")
    throw new Error(
      "Catalog seed is restricted to local/staging databases. Production categories are managed through the authenticated admin UI.",
    );
  await db.$transaction(async (tx) => {
    for (const [position, c] of categories.entries()) await tx.category.upsert({
      where: { slug: c.slug }, create: { slug: c.slug, name: c.name, icon: c.icon, position, active: true },
      update: { name: c.name, icon: c.icon, position },
    });
    await tx.category.updateMany({ where: { slug: { notIn: allowedCategorySlugs } }, data: { active: false } });
    await tx.auditLog.create({
      data: { action: "CATALOG_SEEDED", target: "categories" },
    });
  });
  console.log(
    "Catalog seed completed. Existing categories, accounts and credentials were preserved.",
  );
}
main()
  .catch(() => {
    console.error(
      "Catalog seed failed. Confirm an isolated database and its migration state.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
