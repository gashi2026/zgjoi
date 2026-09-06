-- Run only against jxddfakvakropstpfrvx. All write probes are rolled back.
-- These are database checks, not website login or application authorization tests.
BEGIN;
DO $zgjoi_staging_checks$
DECLARE
  role_name text;
  table_name text;
  denied_deletes integer := 0;
  verified_sessions integer := 0;
  duplicate_email_rejected boolean := false;
  orphan_session_rejected boolean := false;
  client_id text;
  token_value text;
  session_id text;
  saved_email text;
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM public."Setting" WHERE key='_staging_environment'
      AND value->>'projectRef'='jxddfakvakropstpfrvx' AND value->>'fixtureVersion'='1'
  ) THEN
    RAISE EXCEPTION 'Expected initialized Zgjoi staging project';
  END IF;
  PERFORM set_config('lock_timeout','5s',true);
  PERFORM set_config('statement_timeout','30s',true);
  SELECT id,email INTO STRICT client_id,saved_email FROM public."User"
    WHERE email='client-a@staging.zgjoi.invalid' AND role='CLIENT';
  IF (SELECT count(*) FROM public."User") <> 4 OR
     (SELECT count(*) FROM public."User" WHERE role='CLIENT') <> 2 OR
     (SELECT count(*) FROM public."User" WHERE role='PRO') <> 1 OR
     (SELECT count(*) FROM public."User" WHERE role='ADMIN') <> 1 OR
     (SELECT count(*) FROM public."Category") <> 3 OR
     (SELECT count(*) FROM public."Session") <> 0 OR
     (SELECT count(*) FROM public."Payment") <> 0 OR
     (SELECT count(*) FROM public."Payout") <> 0 OR
     (SELECT count(*) FROM public."ServiceRequest") <> 0 THEN
    RAISE EXCEPTION 'Unexpected initial fixture counts';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public."ProProfile" p JOIN public."User" u ON u.id=p."userId"
    JOIN public."ProService" s ON s."profileId"=p.id
    JOIN public."Availability" a ON a."profileId"=p.id
    WHERE u.email='pro@staging.zgjoi.invalid' AND u.role='PRO'
      AND p.slug='staging-elektricist' AND p."autoBid"=false
      AND p."weeklyBudget"=0 AND p."stripeAccountId" IS NULL AND p."ibanEnc" IS NULL
  ) THEN RAISE EXCEPTION 'Professional fixture relation check failed'; END IF;
  IF (SELECT count(*) FROM public."SupportMessage" m JOIN public."SupportTicket" t
    ON t.id=m."ticketId" WHERE t."userId"=client_id) <> 2 THEN
    RAISE EXCEPTION 'Support fixture relation check failed';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    EXECUTE format('SET LOCAL ROLE %I',role_name);
    FOREACH table_name IN ARRAY ARRAY['AuditLog','Availability','Category','Conversation','Coupon','Dispute','LeadCharge','Message','Payment','Payout','ProDocument','ProProfile','ProService','Question','Quote','Review','ServiceRequest','Session','Setting','SupportMessage','SupportTicket','User'] LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE false',table_name);
        RAISE EXCEPTION 'Unexpected public API write permission';
      EXCEPTION WHEN insufficient_privilege THEN denied_deletes:=denied_deletes+1;
      END;
    END LOOP;
    RESET ROLE;
  END LOOP;

  BEGIN
    INSERT INTO public."User" (id,email,"passwordHash",name,role,"updatedAt")
      SELECT gen_random_uuid()::text,email,"passwordHash",name,role,now()
      FROM public."User" WHERE id=client_id;
  EXCEPTION WHEN unique_violation THEN duplicate_email_rejected:=true;
  END;
  BEGIN
    INSERT INTO public."Session" (id,"userId",token,"expiresAt") VALUES (
      gen_random_uuid()::text,gen_random_uuid()::text,gen_random_uuid()::text,now()+interval '1 hour');
  EXCEPTION WHEN foreign_key_violation THEN orphan_session_rejected:=true;
  END;

  FOREACH role_name IN ARRAY ARRAY['postgres','service_role'] LOOP
    EXECUTE format('SET LOCAL ROLE %I',role_name);
    token_value:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
    INSERT INTO public."Session" (id,"userId",token,"expiresAt")
      VALUES (gen_random_uuid()::text,client_id,token_value,now()+interval '1 hour') RETURNING id INTO session_id;
    UPDATE public."Session" SET "expiresAt"=now()+interval '2 hours' WHERE id=session_id;
    IF NOT EXISTS (SELECT 1 FROM public."Session" s JOIN public."User" u ON u.id=s."userId"
      WHERE s.token=token_value AND u.email=saved_email AND u.role='CLIENT' AND s."expiresAt">now()) THEN
      RAISE EXCEPTION 'Trusted-role session join failed';
    END IF;
    DELETE FROM public."Session" WHERE id=session_id;
    IF EXISTS (SELECT 1 FROM public."Session" WHERE id=session_id) THEN
      RAISE EXCEPTION 'Trusted-role session deletion failed';
    END IF;
    verified_sessions:=verified_sessions+1;
    RESET ROLE;
  END LOOP;
  IF denied_deletes<>44 OR verified_sessions<>2 OR NOT duplicate_email_rejected OR NOT orphan_session_rejected THEN
    RAISE EXCEPTION 'Staging integrity checks did not all pass';
  END IF;
  PERFORM set_config('zgjoi_staging.verification',jsonb_build_object(
    'fixture_accounts',4,'fixture_categories',3,'fixture_relations_valid',true,
    'denied_api_delete_probes',denied_deletes,'trusted_session_crud_checks',verified_sessions,
    'duplicate_email_rejected',duplicate_email_rejected,'orphan_session_rejected',orphan_session_rejected,
    'website_login_verified',false,'write_probe_changes_retained',false
  )::text,true);
END
$zgjoi_staging_checks$;
SELECT current_setting('zgjoi_staging.verification')::jsonb AS verification;
ROLLBACK;
