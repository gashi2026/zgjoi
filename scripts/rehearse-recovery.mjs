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
  // Compare catalog definitions instead of DDL statement order. Restoring an
  // archive can legitimately reorder CREATE/ALTER statements in a later dump.
  // Keep grants, policies, constraints, defaults and routines in the comparison.
  const definitions = {
    schemas: `SELECT nspname AS name, pg_get_userbyid(nspowner) AS owner, CASE WHEN nspacl IS NULL THEN NULL ELSE ARRAY(SELECT item::text FROM unnest(nspacl) item ORDER BY item::text) END AS acl FROM pg_namespace WHERE nspname='public'`,
    relations: `SELECT c.relname AS name, c.relkind::text AS kind, pg_get_userbyid(c.relowner) AS owner, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls, CASE WHEN c.relacl IS NULL THEN NULL ELSE ARRAY(SELECT item::text FROM unnest(c.relacl) item ORDER BY item::text) END AS acl, c.reloptions FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')`,
    columns: `SELECT c.relname AS table_name, a.attname AS name, a.attnum AS position, format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull AS not_null, a.attidentity::text AS identity, a.attgenerated::text AS generated, pg_get_expr(d.adbin,d.adrelid) AS default_value FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f') AND a.attnum>0 AND NOT a.attisdropped`,
    constraints: `SELECT c.relname AS table_name, co.conname AS name, co.contype::text AS type, co.convalidated AS validated, pg_get_constraintdef(co.oid) AS definition FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`,
    indexes: `SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public'`,
    policies: `SELECT tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname='public'`,
    enums: `SELECT t.typname AS name, e.enumlabel AS label, e.enumsortorder AS position FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public'`,
    routines: `SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS arguments, pg_get_functiondef(p.oid) AS definition, CASE WHEN p.proacl IS NULL THEN NULL ELSE ARRAY(SELECT item::text FROM unnest(p.proacl) item ORDER BY item::text) END AS acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p')`,
    triggers: `SELECT c.relname AS table_name, t.tgname AS name, t.tgenabled::text AS enabled, pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal`,
    views: `SELECT viewname AS name, definition FROM pg_views WHERE schemaname='public'`,
    sequences: `SELECT sequencename, sequenceowner, data_type::text, start_value, min_value, max_value, increment_by, cycle, cache_size, last_value FROM pg_sequences WHERE schemaname='public'`,
    defaultPrivileges: `SELECT pg_get_userbyid(d.defaclrole) AS owner, COALESCE(n.nspname,'*') AS schema_name, d.defaclobjtype::text AS object_type, CASE WHEN d.defaclacl IS NULL THEN NULL ELSE ARRAY(SELECT item::text FROM unnest(d.defaclacl) item ORDER BY item::text) END AS acl FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='public' OR d.defaclnamespace=0`,
  };
  const schema = {};
  for (const [name, query] of Object.entries(definitions))
    schema[name] = JSON.parse(sql(database, `SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) FROM (${query}) t`));
  return { records, schema };
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
  // PostgreSQL creates an empty public schema even from template0. Remove only
  // that empty schema in our newly created target so the archive restores its ACL.
  sql(target, "DROP SCHEMA public");
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
