-- Zgjoi: restrict public API access while retaining trusted server access.
-- Applies only to the verified 22-table, Prisma-based application.
-- No application rows, columns, foreign keys or account credentials are changed.
-- A single DO statement makes these changes and assertions atomic.
DO $zgjoi_security$
DECLARE
  expected_tables constant text[] := ARRAY['AuditLog', 'Availability', 'Category', 'Conversation', 'Coupon', 'Dispute', 'LeadCharge', 'Message', 'Payment', 'Payout', 'ProDocument', 'ProProfile', 'ProService', 'Question', 'Quote', 'Review', 'ServiceRequest', 'Session', 'Setting', 'SupportMessage', 'SupportTicket', 'User'];
  actual_tables text[];
  table_name text;
  role_name text;
  privilege_name text;
  table_oid oid;
  public_oid oid;
BEGIN
  PERFORM pg_catalog.set_config('lock_timeout', '5s', true);
  PERFORM pg_catalog.set_config('statement_timeout', '30s', true);

  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Expected the verified postgres migration role';
  END IF;
  SELECT oid INTO public_oid FROM pg_catalog.pg_namespace WHERE nspname = 'public';
  SELECT array_agg(c.relname::text ORDER BY c.relname::text)
    INTO actual_tables
    FROM pg_catalog.pg_class c
    WHERE c.relnamespace = public_oid AND c.relkind IN ('r', 'p');
  IF actual_tables IS DISTINCT FROM expected_tables THEN
    RAISE EXCEPTION 'Public table inventory changed; inspect before retrying';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    WHERE c.relnamespace = public_oid AND c.relkind IN ('r','p')
      AND pg_catalog.pg_get_userbyid(c.relowner) <> 'postgres'
  ) THEN
    RAISE EXCEPTION 'Table ownership changed; inspect before retrying';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    WHERE c.relnamespace = public_oid AND a.attnum > 0
      AND NOT a.attisdropped AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Column privileges changed; inspect before retrying';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Unexpected privileged API role';
  END IF;

  -- PUBLIC is the PostgreSQL pseudo-role covering every role. Remove both
  -- inherited public usage and the two API roles' explicit usage.
  -- Existing postgres, pg_database_owner and service_role access is retained.
  REVOKE USAGE ON SCHEMA public FROM PUBLIC, anon, authenticated;

  FOREACH table_name IN ARRAY expected_tables LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated',
      table_name
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;

  -- Future Prisma migrations executed as postgres must opt in to API access.
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
  -- Implicit global PUBLIC function privileges are not modified. Schema USAGE
  -- denial remains the boundary; any future API/RPC exposure requires review.
  -- Supabase-managed roles' defaults in other schemas are unchanged.

  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF pg_catalog.has_schema_privilege(role_name, public_oid, 'USAGE') THEN
      RAISE EXCEPTION 'API role % still has public schema usage', role_name;
    END IF;
    FOREACH table_name IN ARRAY expected_tables LOOP
      table_oid := pg_catalog.to_regclass(format('public.%I', table_name));
      IF pg_catalog.has_any_column_privilege(role_name, table_oid, 'SELECT, INSERT, UPDATE')
         OR pg_catalog.has_table_privilege(role_name, table_oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN') THEN
        RAISE EXCEPTION 'API role % retains a privilege on %', role_name, table_name;
      END IF;
      IF NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class c WHERE c.oid = table_oid) THEN
        RAISE EXCEPTION 'RLS is not enabled on %', table_name;
      END IF;
    END LOOP;
  END LOOP;

  FOREACH role_name IN ARRAY ARRAY['postgres','service_role'] LOOP
    IF NOT pg_catalog.has_schema_privilege(role_name, public_oid, 'USAGE') THEN
      RAISE EXCEPTION 'Trusted role % lost schema usage', role_name;
    END IF;
    FOREACH table_name IN ARRAY expected_tables LOOP
      table_oid := pg_catalog.to_regclass(format('public.%I', table_name));
      FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
        IF NOT pg_catalog.has_table_privilege(role_name, table_oid, privilege_name) THEN
          RAISE EXCEPTION 'Trusted role % lost % on %', role_name, privilege_name, table_name;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END
$zgjoi_security$;
