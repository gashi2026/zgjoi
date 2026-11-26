-- Staging-only synthetic fixtures. Never run the legacy prisma/seed.ts here.
-- Run inside a transaction after setting zgjoi_staging.credentials to a JSON
-- array of four objects {email,passwordHash}; use unique random passwords and
-- bcrypt cost 12. Keep passwords AND hashes out of committed SQL and logs.
-- Exact project identity and empty-table guards prevent accidental re-seeding.
DO $zgjoi_staging_fixtures$
DECLARE
  credentials jsonb := NULLIF(current_setting('zgjoi_staging.credentials', true),'')::jsonb;
  fixture_user record;
  fixture_hash text;
  user_id text;
  client_a text;
  pro_id text;
  admin_id text;
  profile_id text;
  ticket_id text;
  fixture_category record;
  existing_count bigint;
  fixture_table text;
BEGIN
  PERFORM set_config('lock_timeout','5s',true);
  PERFORM set_config('statement_timeout','30s',true);
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Expected postgres fixture role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."Setting" WHERE key='_staging_environment'
    AND value->>'kind'='staging' AND value->>'projectRef'='jxddfakvakropstpfrvx'
    AND value->>'fixtureVersion'='0') THEN
    RAISE EXCEPTION 'Not the initialized, unseeded Zgjoi staging database';
  END IF;
  FOREACH fixture_table IN ARRAY ARRAY['AuditLog','Availability','Category','Conversation','Coupon','Dispute','LeadCharge','Message','Payment','Payout','ProDocument','ProProfile','ProService','Question','Quote','Review','ServiceRequest','Session','SupportMessage','SupportTicket','User'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I',fixture_table) INTO existing_count;
    IF existing_count <> 0 THEN
      RAISE EXCEPTION 'Refusing to seed nonempty staging table %',fixture_table;
    END IF;
  END LOOP;
  IF credentials IS NULL OR jsonb_typeof(credentials)<>'array' THEN
    RAISE EXCEPTION 'Four privately generated bcrypt credentials are required';
  END IF;
  IF jsonb_array_length(credentials)<>4 OR
     (SELECT count(DISTINCT c->>'email') FROM jsonb_array_elements(credentials) c)<>4 THEN
    RAISE EXCEPTION 'Expected four distinct fixture credentials';
  END IF;

  FOR fixture_user IN SELECT * FROM (VALUES
    ('client-a@staging.zgjoi.invalid','Klient test A','CLIENT'),
    ('client-b@staging.zgjoi.invalid','Klient test B','CLIENT'),
    ('pro@staging.zgjoi.invalid','Profesionist test','PRO'),
    ('admin@staging.zgjoi.invalid','Administrator test','ADMIN')
  ) AS fixture(email,name,role) LOOP
    SELECT c->>'passwordHash' INTO fixture_hash FROM jsonb_array_elements(credentials) c
      WHERE c->>'email'=fixture_user.email;
    IF fixture_hash IS NULL OR fixture_hash !~ '^\$2[aby]\$12\$[./A-Za-z0-9]{53}$' THEN
      RAISE EXCEPTION 'Missing or invalid bcrypt credential for staging account';
    END IF;
    INSERT INTO public."User" (id,email,"passwordHash",name,role,city,"updatedAt")
      VALUES (gen_random_uuid()::text,fixture_user.email,fixture_hash,fixture_user.name,
        fixture_user.role::public."Role",'Prishtinë',now()) RETURNING id INTO user_id;
    IF fixture_user.email='client-a@staging.zgjoi.invalid' THEN client_a:=user_id; END IF;
    IF fixture_user.role='PRO' THEN pro_id:=user_id; END IF;
    IF fixture_user.role='ADMIN' THEN admin_id:=user_id; END IF;
  END LOOP;

  FOR fixture_category IN SELECT * FROM (VALUES
    ('elektricist','Elektricist [TEST]','zap',0),
    ('hidraulik','Hidraulik [TEST]','droplets',1),
    ('pastrim','Pastrim [TEST]','sparkles',2)
  ) AS fixture(slug,name,icon,position) LOOP
    INSERT INTO public."Category" (id,slug,name,icon,position,active)
      VALUES (gen_random_uuid()::text,fixture_category.slug,fixture_category.name,
        fixture_category.icon,fixture_category.position,true);
  END LOOP;

  INSERT INTO public."ProProfile" (id,"userId",slug,"categorySlug",about,"priceFrom",
    "serviceCities",verification,"weeklyBudget","weeklySpent","autoBid","updatedAt")
    VALUES (gen_random_uuid()::text,pro_id,'staging-elektricist','elektricist',
      'Profil sintetik vetëm për testim. Nuk është profesionist real.',2500,
      ARRAY['Prishtinë'],'PENDING',0,0,false,now()) RETURNING id INTO profile_id;
  INSERT INTO public."ProService" (id,"profileId",name,price)
    VALUES (gen_random_uuid()::text,profile_id,'Shërbim elektrik [TEST]',2500);
  INSERT INTO public."Availability" (id,"profileId",weekday,"startMin","endMin")
    VALUES (gen_random_uuid()::text,profile_id,0,540,1020);
  INSERT INTO public."SupportTicket" (id,"userId",subject,state,offline,"updatedAt")
    VALUES (gen_random_uuid()::text,client_a,'Bisedë mbështetjeje [TEST]','OPEN',false,now())
    RETURNING id INTO ticket_id;
  INSERT INTO public."SupportMessage" (id,"ticketId","senderId","fromAgent",body)
    VALUES
      (gen_random_uuid()::text,ticket_id,client_a,false,'Mesazh sintetik nga klienti për testim.'),
      (gen_random_uuid()::text,ticket_id,admin_id,true,'Përgjigje sintetike nga administratori për testim.');
  UPDATE public."Setting" SET value=jsonb_set(value,'{fixtureVersion}','1'::jsonb)
    WHERE key='_staging_environment';
END
$zgjoi_staging_fixtures$;
