BEGIN READ ONLY;
DO $zgjoi_verify$
DECLARE
  table_name text;
  role_name text;
  denied_reads integer := 0;
  allowed_reads integer := 0;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    EXECUTE format('SET LOCAL ROLE %I', role_name);
    FOREACH table_name IN ARRAY ARRAY['AuditLog', 'Availability', 'Category', 'Conversation', 'Coupon', 'Dispute', 'LeadCharge', 'Message', 'Payment', 'Payout', 'ProDocument', 'ProProfile', 'ProService', 'Question', 'Quote', 'Review', 'ServiceRequest', 'Session', 'Setting', 'SupportMessage', 'SupportTicket', 'User'] LOOP
      BEGIN
        EXECUTE format('SELECT 1 FROM public.%I WHERE false', table_name);
        RAISE EXCEPTION 'Unexpected API access: % to %', role_name, table_name;
      EXCEPTION WHEN insufficient_privilege THEN
        denied_reads := denied_reads + 1;
      END;
    END LOOP;
    RESET ROLE;
  END LOOP;
  FOREACH role_name IN ARRAY ARRAY['postgres','service_role'] LOOP
    EXECUTE format('SET LOCAL ROLE %I', role_name);
    FOREACH table_name IN ARRAY ARRAY['AuditLog', 'Availability', 'Category', 'Conversation', 'Coupon', 'Dispute', 'LeadCharge', 'Message', 'Payment', 'Payout', 'ProDocument', 'ProProfile', 'ProService', 'Question', 'Quote', 'Review', 'ServiceRequest', 'Session', 'Setting', 'SupportMessage', 'SupportTicket', 'User'] LOOP
      EXECUTE format('SELECT 1 FROM public.%I WHERE false', table_name);
      allowed_reads := allowed_reads + 1;
    END LOOP;
    RESET ROLE;
  END LOOP;
  IF denied_reads <> 44 OR allowed_reads <> 44 THEN
    RAISE EXCEPTION 'Unexpected verification totals';
  END IF;
  PERFORM set_config('zgjoi_security.verification',jsonb_build_object('denied_api_reads',denied_reads,'allowed_trusted_reads',allowed_reads,'application_rows_returned',0)::text,true);
END
$zgjoi_verify$;
SELECT current_setting('zgjoi_security.verification')::jsonb AS verification;
ROLLBACK;
