import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const database = new URL(process.env.DATABASE_URL || "");
if (
  !process.env.CI ||
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  database.pathname !== "/zgjoi_test" ||
  database.username !== "postgres"
)
  throw new Error(
    "Only a disposable CI database named zgjoi_test on loopback is permitted",
  );
const directory = mkdtempSync(join(tmpdir(), "zgjoi-test-db-"));
const execute = (path) =>
  execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "db",
      "execute",
      "--file",
      path,
      "--schema",
      "prisma/schema.prisma",
    ],
    { stdio: "inherit", env: { ...process.env, CHECKPOINT_DISABLE: "1" } },
  );
try {
  const roles = join(directory, "roles.sql");
  writeFileSync(
    roles,
    `CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; GRANT USAGE ON SCHEMA public TO service_role; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;`,
  );
  execute(roles);
  execute("supabase/staging/bootstrap.sql");
  execute("supabase/staging/marketplace.sql");
  console.log(
    "Disposable Postgres: foundation bootstrap and marketplace upgrade both applied.",
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
