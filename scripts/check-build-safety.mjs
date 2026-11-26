// Fails CI if any build/install hook could change a database schema or drop data.
import { readFileSync, existsSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const vercel = existsSync("vercel.json") ? JSON.parse(readFileSync("vercel.json", "utf8")) : {};
const hooks = { ...Object.fromEntries(Object.entries(pkg.scripts ?? {}).filter(([k]) => /^(pre|post)?(build|install|prepare|vercel-build|start)$/.test(k))),
  "vercel.buildCommand": vercel.buildCommand ?? "", "vercel.installCommand": vercel.installCommand ?? "" };
const banned = /prisma\s+(db\s+push|migrate\s+(reset|dev))|accept-data-loss|force-reset/i;
const bad = Object.entries(hooks).filter(([, cmd]) => banned.test(String(cmd)));
if (bad.length) { console.error("Unsafe database step in build hooks:", bad); process.exit(1); }
console.log("Build safety: no schema push, reset or data-loss flag in build/install hooks.");
