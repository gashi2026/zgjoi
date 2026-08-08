/**
 * Seeds categories, questionnaires, settings and demo accounts.
 * Run with:  npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const db = new PrismaClient();

const categories = [
  { slug: "ndertim", name: "Ndërtim", icon: "home" },
  { slug: "hidraulik", name: "Hidraulik", icon: "droplets" },
  { slug: "elektricist", name: "Elektricist", icon: "zap" },
  { slug: "pastrim", name: "Pastrim", icon: "sparkles" },
  { slug: "piktor", name: "Piktor", icon: "paintbrush" },
  { slug: "kopsht", name: "Kopsht", icon: "leaf" },
  { slug: "transport", name: "Transport", icon: "truck" },
  { slug: "riparime", name: "Riparime", icon: "wrench" },
  { slug: "mobilje", name: "Montim mobiljesh", icon: "hammer" },
  { slug: "klima", name: "Klimatizim", icon: "wind" },
  { slug: "siguria", name: "Siguri & alarme", icon: "shield" },
  { slug: "internet", name: "Rrjete & internet", icon: "wifi" },
];

const questions: Record<string, any[]> = {
  piktor: [
    { key: "rooms", label: "Sa dhoma duhen lyer?", type: "number", options: [] },
    { key: "surface", label: "Çfarë duhet lyer?", type: "multi", options: ["Muret", "Tavani", "Dyert dhe dritaret", "Fasada"] },
    { key: "condition", label: "Në çfarë gjendjeje janë muret?", type: "single", options: ["Të reja, pa lyer", "Të lyera më parë", "Me dëmtime, duhen riparuar"] },
    { key: "paint", label: "Kush e siguron ngjyrën?", type: "single", options: ["Unë e siguroj", "Profesionisti ta sjellë"] },
  ],
  elektricist: [
    { key: "work", label: "Çfarë pune ju nevojitet?", type: "multi", options: ["Instalim i ri", "Riparim defekti", "Montim ndriçimi", "Panel dhe siguresa"] },
    { key: "points", label: "Sa pika elektrike përfshihen?", type: "number", options: [] },
    { key: "urgency", label: "Sa urgjente është?", type: "single", options: ["Sot", "Këtë javë", "Javën e ardhshme", "Nuk ka nxitim"] },
  ],
  hidraulik: [
    { key: "issue", label: "Për çfarë bëhet fjalë?", type: "single", options: ["Rrjedhje uji", "Kanalizim i bllokuar", "Montim bojleri", "Instalim banjoje"] },
    { key: "where", label: "Ku ndodhet problemi?", type: "multi", options: ["Banjë", "Kuzhinë", "Bodrum", "Jashtë"] },
    { key: "urgency", label: "Sa urgjente është?", type: "single", options: ["Urgjente — sot", "Këtë javë", "Fleksibël"] },
  ],
  pastrim: [
    { key: "type", label: "Çfarë lloj pastrimi?", type: "single", options: ["I përgjithshëm", "I thellë", "Pas ndërtimit", "Larje dritaresh"] },
    { key: "size", label: "Sa është sipërfaqja (m²)?", type: "number", options: [] },
    { key: "freq", label: "Sa shpesh?", type: "single", options: ["Një herë", "Javore", "Dy herë në muaj", "Mujore"] },
  ],
  ndertim: [
    { key: "scope", label: "Çfarë përfshin projekti?", type: "multi", options: ["Renovim i plotë", "Shtrim pllakash", "Mure dhe suvatim", "Izolim"] },
    { key: "size", label: "Sa është sipërfaqja (m²)?", type: "number", options: [] },
    { key: "start", label: "Kur dëshironi të nisë?", type: "single", options: ["Sa më shpejt", "Brenda muajit", "Në 2–3 muaj"] },
  ],
};

const defaultQuestions = [
  { key: "scope", label: "Përshkruani shkurt punën", type: "text", options: [] },
  { key: "urgency", label: "Kur ju nevojitet?", type: "single", options: ["Sot", "Këtë javë", "Këtë muaj", "Fleksibël"] },
];

function enc(plain: string) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const out = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv.toString("hex"), c.getAuthTag().toString("hex"), out.toString("hex")].join(":");
}

async function main() {
  console.log("→ settings");
  await db.setting.upsert({
    where: { key: "commission_bps" },
    create: { key: "commission_bps", value: 1500 },
    update: {},
  });
  await db.setting.upsert({
    where: { key: "lead_cost_cents" },
    create: { key: "lead_cost_cents", value: 400 },
    update: {},
  });

  console.log("→ categories and questionnaires");
  for (const [i, c] of categories.entries()) {
    const cat = await db.category.upsert({
      where: { slug: c.slug },
      create: { ...c, position: i },
      update: { name: c.name, icon: c.icon, position: i },
    });
    const qs = questions[c.slug] ?? defaultQuestions;
    for (const [j, q] of qs.entries()) {
      await db.question.upsert({
        where: { categoryId_key: { categoryId: cat.id, key: q.key } },
        create: { categoryId: cat.id, ...q, position: j },
        update: { label: q.label, type: q.type, options: q.options, position: j },
      });
    }
  }

  console.log("→ admin account");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@zgjoi.com";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "ndrysho-kete-menjehere";
  await db.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Administrator",
      passwordHash: await bcrypt.hash(adminPass, 12),
      role: "ADMIN",
    },
    update: { role: "ADMIN" },
  });

  console.log(`\n✓ Gati. Admin: ${adminEmail} / ${adminPass}`);
  console.log("  Ndrysho fjalëkalimin sapo të hysh.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
