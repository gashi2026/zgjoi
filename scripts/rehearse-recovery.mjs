import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";

// This rehearsal cannot target a hosted database. It uses the CI service's own
// PostgreSQL client tools, so pg_dump and pg_restore match its server version.
const source = new URL(process.env.DATABASE_URL || "");
const container = process.env.PG_TEST_CONTAINER || "";
assert(process.env.CI === "true" && source.hostname === "127.0.0.1" &&
  source.pathname === "/zgjoi_test" && source.username === "postgres" &&
  /^[a-f0-9]{12,64}$/.test(container), "Recovery rehearsal requires the disposable CI PostgreSQL service");
const target = `zgjoi_restore_${randomBytes(6).toString("hex")}`;
function pg(command, args, input) {
  return execFileSync("docker", ["exec", "-i", container, command, ...args], {
    input, maxBuffer: 32 * 1024 * 1024, timeout: 120000,
    stdio: ["pipe", "pipe", "pipe"],
  });
}
function sql(database, statement) {
  return pg("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", database, "-At", "-c", statement]).toString().trim();
}
const digest = (value) => createHash("sha256").update(value).digest("hex");
function snapshot(database) {
  const tables = JSON.parse(sql(database, `SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public'`));
  assert(tables.includes("User") && tables.includes("ServiceRequest") && tables.includes("Payment"));
  const records = {};
  for (const table of tables) {
    assert(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table));
    const rows = sql(database, `SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public."${table}" t`);
    records[table] = { count: JSON.parse(rows).length, sha256: digest(rows) };
  }
  const schema = pg("pg_dump", ["-U", "postgres", "-d", database, "--schema-only", "--schema=public"]).toString()
    .split("\n").filter((line) => !line.startsWith("--") && !line.startsWith("\\restrict") && !line.startsWith("\\unrestrict")).join("\n");
  return { records, schema: digest(schema) };
}
const started = Date.now();
let created = false;
try {
  const before = snapshot("zgjoi_test");
  assert(before.records.User.count >= 6 && before.records.ServiceRequest.count > 0 && before.records.Message.count > 100,
    "Restore must exercise populated marketplace data, not an empty database");
  const dump = pg("pg_dump", ["-U", "postgres", "-d", "zgjoi_test", "--format=custom", "--schema=public"]);
  // Never use --clean on the source or restore over an existing database.
  pg("createdb", ["-U", "postgres", "--template=template0", target]);
  created = true;
  pg("pg_restore", ["-U", "postgres", "-d", target, "--exit-on-error", "--single-transaction"], dump);
  assert.deepEqual(snapshot(target), before, "Restored rows, schema, indexes, constraints and grants must match");
  assert.deepEqual(snapshot("zgjoi_test"), before, "The rehearsal must leave the source unchanged");
  for (const role of ["anon", "authenticated"]) {
    // Assert actual denied access after restoration, not just a saved RLS flag.
    assert.throws(() => sql(target, `BEGIN; SET LOCAL ROLE ${role}; SELECT id FROM public."User" LIMIT 1; ROLLBACK;`),
      (error) => /permission denied/.test(String(error.stderr)), "Untrusted reads must remain denied");
  }
  console.log(JSON.stringify({ event: "disposable_restore_passed", tables: Object.keys(before.records).length,
    rowCountsAndDigestsMatch: true, schemaAndGrantsMatch: true, sourceUnchanged: true,
    deniedRoles: 2, elapsedMs: Date.now() - started,
    limitation: "CI synthetic database only; production backups, storage and recovery objectives still require rehearsal" }));
} finally {
  if (created) pg("dropdb", ["-U", "postgres", target]);
}
