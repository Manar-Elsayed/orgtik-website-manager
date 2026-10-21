-- Run with: supabase db query --linked --project-ref <dedicated-project> --file supabase/tests/persistence.sql
-- Every fixture and test-only trigger is rolled back. No existing realm is changed.
begin;

create function pg_temp.reject_contract_entry() returns trigger language plpgsql as $$
begin
  if new.realm like 'sql_contract_%' and new.entry::jsonb->>'forceFailure' = 'yes' then
    raise exception using errcode = 'P0001', message = 'Intentional transaction failure';
  end if;
  return new;
end;
$$;
create trigger orgtik_contract_failure before insert on orgtik.entries
  for each row execute function pg_temp.reject_contract_entry();

do $test$
declare
  r text := 'sql_contract_' || md5(random()::text);
  meta jsonb := '{"epoch":"a","seedAt":"2026-10-16T00:00:00.000Z","clock":0}';
  value jsonb;
  payload jsonb;
  raw_a text := '{"user":{"id":1,"email":"one@example.test","passwordHash":"test-only"},"grants":{}}';
  raw_b text := '{"user":{"id":2,"email":"two@example.test","passwordHash":"test-only"},"grants":{}}';
  raw_next text := '{"user":{"id":1,"email":"updated@example.test","passwordHash":"test-only"},"grants":{}}';
  op jsonb := jsonb_build_object('key', repeat('a',64), 'receipt', jsonb_build_object('fingerprint', 'request-a', 'result', jsonb_build_object('id',7)));
  i integer;
  denied boolean := false;
begin
  if has_function_privilege('anon', 'public.orgtik_persistence(text,text,jsonb)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.orgtik_persistence(text,text,jsonb)', 'EXECUTE')
    or has_function_privilege('anon', 'orgtik.persistence(text,text,jsonb)', 'EXECUTE')
    or has_schema_privilege('anon', 'orgtik', 'USAGE')
    or has_table_privilege('service_role', 'orgtik.accounts', 'SELECT') then
    raise exception 'Private persistence privileges failed';
  end if;
  if not has_function_privilege('service_role', 'public.orgtik_persistence(text,text,jsonb)', 'EXECUTE') then raise exception 'Server RPC privilege missing'; end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='orgtik' and c.relkind='r' and not c.relrowsecurity) then raise exception 'Private table missing RLS'; end if;
  execute 'set local role anon';
  begin perform public.orgtik_persistence(r,'accounts_read','{}'); exception when insufficient_privilege then denied := true; end;
  execute 'reset role';
  if not denied then raise exception 'Anonymous RPC was allowed'; end if;

  value := public.orgtik_persistence(r,'journal_initialize',jsonb_build_object('meta',meta));
  if value->'meta' <> meta then raise exception 'Journal initialization failed'; end if;
  value := public.orgtik_persistence(r,'journal_initialize','{"meta":{"epoch":"other"}}');
  if value->'meta' <> meta then raise exception 'Initialization replaced existing journal'; end if;
  value := public.orgtik_persistence(r,'accounts_commit',jsonb_build_object('changes',jsonb_build_array(jsonb_build_object('id','1','expected',null,'value',raw_a),jsonb_build_object('id','2','expected',null,'value',raw_b))));
  if value->>'status' <> 'ok' then raise exception 'Account initialization failed'; end if;
  value := public.orgtik_persistence(r,'accounts_commit',jsonb_build_object('changes',jsonb_build_array(jsonb_build_object('id','3','expected',null,'value',replace(raw_a,'"id":1','"id":3')))));
  if value->>'status' <> 'account_conflict' then raise exception 'Duplicate email was accepted'; end if;

  payload := jsonb_build_object('expectedEpoch','a','expectedRevision',0,'maxEntries',5000,'raw','{"epoch":"a","app":"wm"}', 'operation',op,'identity',jsonb_build_object('changes',jsonb_build_array(jsonb_build_object('id','1','expected',raw_a,'value',raw_next))));
  value := public.orgtik_persistence(r,'journal_commit',payload);
  if value->>'status' <> 'ok' or value->>'sequence' <> '1' or value#>>'{result,id}' <> '7' then raise exception 'Atomic commit failed'; end if;
  value := public.orgtik_persistence(r,'journal_commit',payload);
  if value->>'status' <> 'duplicate' or value->>'sequence' <> '1' then raise exception 'Idempotent retry failed'; end if;
  value := public.orgtik_persistence(r,'accounts_read','{}');
  if value#>>'{accounts,1}' <> raw_next then raise exception 'Identity effect missing'; end if;
  value := public.orgtik_persistence(r,'journal_commit',jsonb_set(payload,'{operation,receipt,fingerprint}','"different"'));
  if value->>'status' <> 'operation_conflict' then raise exception 'Operation reuse was accepted'; end if;
  value := public.orgtik_persistence(r,'journal_commit',payload - 'operation');
  if value->>'status' <> 'conflict' then raise exception 'Stale revision was accepted'; end if;
  value := public.orgtik_persistence(r,'journal_commit',jsonb_set(payload - 'operation','{expectedRevision}','1'));
  if value->>'status' <> 'account_conflict' then raise exception 'Stale account was accepted'; end if;

  -- Force a failure after the account UPDATE, and verify the function's whole transaction rolls back.
  begin
    perform public.orgtik_persistence(r,'journal_commit',jsonb_build_object('expectedEpoch','a','expectedRevision',1,'maxEntries',5000,'raw','{"epoch":"a","forceFailure":"yes"}','identity',jsonb_build_object('changes',jsonb_build_array(jsonb_build_object('id','1','expected',raw_next,'value',raw_a)))));
    raise exception using errcode='P0002', message='Missing forced rollback';
  exception when sqlstate 'P0001' then null; end;
  value := public.orgtik_persistence(r,'accounts_read','{}');
  if value#>>'{accounts,1}' <> raw_next then raise exception 'Failed append left an account update'; end if;
  value := public.orgtik_persistence(r,'journal_snapshot','{}');
  if value->>'revision' <> '1' then raise exception 'Failed append changed revision'; end if;

  -- Swapping ownership within a batch must satisfy uniqueness at transaction end.
  value := public.orgtik_persistence(r,'accounts_commit',jsonb_build_object('changes',jsonb_build_array(jsonb_build_object('id','1','expected',raw_next,'value',replace(raw_next,'updated@','two@')),jsonb_build_object('id','2','expected',raw_b,'value',replace(raw_b,'two@','updated@')))));
  if value->>'status' <> 'ok' then raise exception 'Email swap was rejected'; end if;
  for i in 1..17 loop
    value := public.orgtik_persistence(r,'journal_commit',jsonb_build_object('expectedEpoch','a','expectedRevision',i,'maxEntries',5000,'raw','{"epoch":"a"}'));
    if value->>'status' <> 'ok' then raise exception 'Paged fixture append failed'; end if;
  end loop;
  value := public.orgtik_persistence(r,'journal_snapshot','{}');
  if jsonb_array_length(value->'entries') <> 8 or value->>'revision' <> '18' or value->>'next' <> '8' then raise exception 'Initial snapshot page failed'; end if;
  value := public.orgtik_persistence(r,'journal_snapshot',jsonb_build_object('from',8,'meta',meta,'revision',18));
  if jsonb_array_length(value->'entries') <> 8 or value->>'next' <> '16' then raise exception 'Pinned snapshot page failed'; end if;
  value := public.orgtik_persistence(r,'journal_commit',jsonb_build_object('expectedEpoch','a','expectedRevision',18,'maxEntries',18,'raw','{"epoch":"a"}'));
  if value->>'status' <> 'full' then raise exception 'Journal capacity was ignored'; end if;

  value := public.orgtik_persistence(r,'handoff_put',jsonb_build_object('key',repeat('b',64),'value',jsonb_build_object('oneUse',true),'expiresAt',extract(epoch from clock_timestamp()+interval '1 minute')*1000));
  if value->>'status' <> 'ok' then raise exception 'Handoff save failed'; end if;
  value := public.orgtik_persistence(r,'handoff_take',jsonb_build_object('key',repeat('b',64)));
  if value#>>'{value,oneUse}' <> 'true' then raise exception 'Handoff consume failed'; end if;
  value := public.orgtik_persistence(r,'handoff_take',jsonb_build_object('key',repeat('b',64)));
  if value->'value' <> 'null'::jsonb then raise exception 'Handoff was reusable'; end if;
  value := public.orgtik_persistence(r,'claim_legacy',jsonb_build_object('key',repeat('c',64),'expiresAt',extract(epoch from clock_timestamp()+interval '1 minute')*1000));
  if value->>'claimed' <> 'true' then raise exception 'Legacy claim failed'; end if;
  value := public.orgtik_persistence(r,'claim_legacy',jsonb_build_object('key',repeat('c',64),'expiresAt',extract(epoch from clock_timestamp()+interval '1 minute')*1000));
  if value->>'claimed' <> 'false' then raise exception 'Legacy claim was reusable'; end if;

  payload := jsonb_build_object('expectedRevision',0,'document',jsonb_build_object('schema',1,'realm',r,'revision',1,'state',jsonb_build_object('sessions','{}'::jsonb,'families','{}'::jsonb,'handoffs','{}'::jsonb,'userVersions','{}'::jsonb)));
  value := public.orgtik_persistence(r,'security_cas',payload);
  if value->>'status' <> 'ok' then raise exception 'Security CAS failed'; end if;
  value := public.orgtik_persistence(r,'security_cas',payload);
  if value->>'status' <> 'conflict' then raise exception 'Stale security CAS was accepted'; end if;
  perform public.orgtik_persistence(r,'presentation_save','{"workspace":"w1","value":{"theme":"dark"}}');
  value := public.orgtik_persistence(r,'presentation_load','{"workspace":"w1"}');
  if value#>>'{value,theme}' <> 'dark' then raise exception 'Presentation save failed'; end if;
  value := public.orgtik_persistence(r||'_other','presentation_load','{"workspace":"w1"}');
  if value->'value' <> 'null'::jsonb then raise exception 'Presentation crossed realms'; end if;

  value := public.orgtik_persistence(r,'journal_reset','{"expectedEpoch":"a","expectedRevision":18,"meta":{"epoch":"b"}}');
  if value->>'status' <> 'ok' then raise exception 'Journal reset failed'; end if;
  value := public.orgtik_persistence(r,'accounts_read','{}');
  if value#>>'{accounts,1}' is null then raise exception 'Journal reset erased account'; end if;
  value := public.orgtik_persistence(r,'security_read','{}');
  if value#>>'{document,revision}' <> '1' then raise exception 'Journal reset erased security state'; end if;
  value := public.orgtik_persistence(r,'journal_snapshot',jsonb_build_object('from',8,'meta',meta,'revision',18));
  if value->>'status' <> 'conflict' then raise exception 'Reset did not invalidate snapshot'; end if;
  value := public.orgtik_persistence(r,'journal_lookup',jsonb_build_object('expectedEpoch','b','key',repeat('a',64),'fingerprint','request-a'));
  if value->>'status' <> 'missing' then raise exception 'Reset retained receipt'; end if;
end;
$test$;

select 'Supabase persistence transaction and privilege contracts passed' as result;
rollback;
