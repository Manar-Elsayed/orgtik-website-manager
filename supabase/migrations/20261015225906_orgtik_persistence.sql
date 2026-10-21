-- The suite authenticates and authorizes its own API requests. Only server credentials may
-- call this bridge; account records and replay entries never become public REST tables.
begin;

create schema if not exists orgtik;
revoke all on schema orgtik from public, anon, authenticated;

create table orgtik.journals (
  realm text primary key check (realm ~ '^[A-Za-z0-9_-]{1,100}$'),
  meta jsonb not null check (jsonb_typeof(meta) = 'object' and coalesce(jsonb_typeof(meta->'epoch') = 'string' and length(meta->>'epoch') > 0, false)),
  revision bigint not null default 0 check (revision >= 0)
);
create table orgtik.entries (
  realm text not null references orgtik.journals(realm) on delete cascade,
  sequence bigint not null check (sequence > 0),
  entry text not null check (octet_length(entry) <= 524288),
  primary key (realm, sequence)
);
create table orgtik.receipts (
  realm text not null references orgtik.journals(realm) on delete cascade,
  key text not null check (key ~ '^[a-f0-9]{64}$'),
  fingerprint text not null check (length(fingerprint) between 1 and 256),
  sequence bigint not null check (sequence > 0),
  receipt jsonb not null,
  primary key (realm, key)
);
create table orgtik.accounts (
  realm text not null check (realm ~ '^[A-Za-z0-9_-]{1,100}$'),
  id text not null,
  email text not null check (length(email) > 0),
  record text not null,
  primary key (realm, id),
  constraint accounts_realm_email_key unique (realm, email) deferrable initially deferred
);
create table orgtik.handoffs (
  realm text not null check (realm ~ '^[A-Za-z0-9_-]{1,100}$'),
  key text not null,
  value jsonb not null,
  expires_at timestamptz not null,
  primary key (realm, key)
);
create index handoffs_realm_expiry on orgtik.handoffs (realm, expires_at);
create table orgtik.security (
  realm text primary key check (realm ~ '^[A-Za-z0-9_-]{1,100}$'),
  revision bigint not null check (revision >= 0),
  document jsonb not null
);
create table orgtik.presentation (
  realm text not null check (realm ~ '^[A-Za-z0-9_-]{1,100}$'),
  workspace text not null check (length(workspace) between 1 and 200),
  document jsonb not null,
  primary key (realm, workspace)
);

alter table orgtik.journals enable row level security;
alter table orgtik.entries enable row level security;
alter table orgtik.receipts enable row level security;
alter table orgtik.accounts enable row level security;
alter table orgtik.handoffs enable row level security;
alter table orgtik.security enable row level security;
alter table orgtik.presentation enable row level security;
revoke all on all tables in schema orgtik from public, anon, authenticated, service_role;
alter default privileges in schema orgtik revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema orgtik revoke execute on functions from public, anon, authenticated;

-- Validate every account delta before changing any row. All callers hold the realm lock.
-- Keeping record as TEXT preserves the existing byte-for-byte compare-and-swap contract.
create function orgtik.apply_accounts(p_realm text, p_changes jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_change jsonb;
  v_record jsonb;
  v_current text;
  v_id text;
  v_count bigint;
begin
  if jsonb_typeof(p_changes) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Invalid account changes';
  end if;
  select count(distinct item->>'id') into v_count from jsonb_array_elements(p_changes) item;
  if v_count <> jsonb_array_length(p_changes) then
    raise exception using errcode = '22023', message = 'Duplicate account changes';
  end if;
  for v_change in select value from jsonb_array_elements(p_changes) loop
    v_id := v_change->>'id';
    if v_id is null or length(v_id) not between 1 and 200
      or jsonb_typeof(v_change->'value') is distinct from 'string'
      or not (v_change ? 'expected')
      or jsonb_typeof(v_change->'expected') not in ('null', 'string') then
      raise exception using errcode = '22023', message = 'Invalid account change';
    end if;
    select a.record into v_current from orgtik.accounts a where a.realm = p_realm and a.id = v_id;
    if v_current is distinct from (v_change->>'expected') then return false; end if;
    v_record := (v_change->>'value')::jsonb;
    if jsonb_typeof(v_record) is distinct from 'object'
      or (v_record#>>'{user,id}') is distinct from v_id
      or jsonb_typeof(v_record#>'{user,email}') is distinct from 'string'
      or length(btrim(v_record#>>'{user,email}')) = 0
      or (v_record->'user') ? 'password' then
      raise exception using errcode = '22023', message = 'Unsafe account change';
    end if;
  end loop;
  -- Check the final email ownership map, so swapping two emails in one batch is allowed.
  if exists (
    select email from (
      select a.email from orgtik.accounts a where a.realm = p_realm
        and not exists (select 1 from jsonb_array_elements(p_changes) c where c->>'id' = a.id)
      union all
      select lower(btrim((c->>'value')::jsonb#>>'{user,email}')) from jsonb_array_elements(p_changes) c
    ) final_accounts group by email having count(*) > 1
  ) then return false; end if;
  for v_change in select value from jsonb_array_elements(p_changes) loop
    insert into orgtik.accounts (realm, id, email, record)
      values (p_realm, v_change->>'id', lower(btrim((v_change->>'value')::jsonb#>>'{user,email}')), v_change->>'value')
      on conflict (realm, id) do update set email = excluded.email, record = excluded.record;
  end loop;
  return true;
end;
$$;

-- One RPC is one database transaction. Journal append, identity deltas and the receipt
-- commit together. A failed CAS or validation never acknowledges a partial mutation.
create function orgtik.persistence(p_realm text, p_action text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
set lock_timeout = '5s'
set statement_timeout = '10s'
as $$
declare
  v_meta jsonb;
  v_revision bigint;
  v_expected bigint;
  v_from bigint;
  v_bound bigint;
  v_next bigint;
  v_entries jsonb;
  v_receipt jsonb;
  v_operation jsonb;
  v_sequence bigint;
  v_raw text;
  v_value jsonb;
  v_document jsonb;
  v_expiry timestamptz;
  v_key text;
  v_workspace text;
  v_result jsonb;
begin
  if p_realm is null or p_realm !~ '^[A-Za-z0-9_-]{1,100}$'
    or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Invalid persistence request';
  end if;
  -- A realm-level lock orders identity writes against business writes across every app.
  perform pg_advisory_xact_lock(hashtextextended('orgtik:persistence:' || p_realm, 0));

  if p_action = 'accounts_read' then
    select coalesce(jsonb_object_agg(a.id, a.record), '{}'::jsonb) into v_value
      from orgtik.accounts a where a.realm = p_realm;
    return jsonb_build_object('status', 'ok', 'accounts', v_value);
  elsif p_action = 'accounts_commit' then
    if not orgtik.apply_accounts(p_realm, p_payload->'changes') then
      return jsonb_build_object('status', 'account_conflict');
    end if;
    return jsonb_build_object('status', 'ok');
  elsif p_action = 'accounts_reset_test_fixtures' then
    delete from orgtik.accounts a where a.realm = p_realm and a.email ~* '(\.test|@example\.com)$';
    return jsonb_build_object('status', 'ok');
  elsif p_action in ('handoff_put', 'handoff_take', 'claim_legacy') then
    v_key := p_payload->>'key';
    if v_key is null or v_key !~ '^[a-f0-9]{64}$' then
      raise exception using errcode = '22023', message = 'Invalid handoff key';
    end if;
    delete from orgtik.handoffs h where h.realm = p_realm and h.expires_at <= clock_timestamp();
    if p_action = 'handoff_take' then
      delete from orgtik.handoffs h where h.realm = p_realm and h.key = v_key returning h.value into v_value;
      return jsonb_build_object('status', 'ok', 'value', v_value);
    end if;
    if jsonb_typeof(p_payload->'expiresAt') is distinct from 'number' then
      raise exception using errcode = '22023', message = 'Invalid handoff expiry';
    end if;
    v_expiry := to_timestamp((p_payload->>'expiresAt')::double precision / 1000);
    if v_expiry <= clock_timestamp() then
      if p_action = 'claim_legacy' then return jsonb_build_object('status', 'ok', 'claimed', false); end if;
      return jsonb_build_object('status', 'conflict');
    end if;
    if p_action = 'claim_legacy' then
      insert into orgtik.handoffs (realm, key, value, expires_at)
        values (p_realm, 'used:' || v_key, 'true'::jsonb, v_expiry) on conflict do nothing;
      return jsonb_build_object('status', 'ok', 'claimed', found);
    end if;
    if not (p_payload ? 'value') then raise exception using errcode = '22023', message = 'Missing handoff value'; end if;
    insert into orgtik.handoffs (realm, key, value, expires_at)
      values (p_realm, v_key, p_payload->'value', least(v_expiry, clock_timestamp() + interval '60 seconds')) on conflict do nothing;
    if not found then return jsonb_build_object('status', 'conflict'); end if;
    return jsonb_build_object('status', 'ok');
  elsif p_action = 'security_read' then
    select s.document into v_document from orgtik.security s where s.realm = p_realm;
    return jsonb_build_object('status', 'ok', 'document', v_document);
  elsif p_action = 'security_cas' then
    v_expected := (p_payload->>'expectedRevision')::bigint;
    v_document := p_payload->'document';
    if v_expected is null or v_expected < 0 or v_expected > 9007199254740990
      or jsonb_typeof(v_document) is distinct from 'object'
      or v_document->>'schema' is distinct from '1'
      or v_document->>'realm' is distinct from p_realm
      or v_document->>'revision' is distinct from (v_expected + 1)::text
      or jsonb_typeof(v_document#>'{state,sessions}') is distinct from 'object'
      or jsonb_typeof(v_document#>'{state,families}') is distinct from 'object'
      or jsonb_typeof(v_document#>'{state,handoffs}') is distinct from 'object'
      or jsonb_typeof(v_document#>'{state,userVersions}') is distinct from 'object' then
      raise exception using errcode = '22023', message = 'Invalid security document';
    end if;
    select s.revision into v_revision from orgtik.security s where s.realm = p_realm;
    if coalesce(v_revision, 0) <> v_expected then return jsonb_build_object('status', 'conflict'); end if;
    insert into orgtik.security (realm, revision, document) values (p_realm, v_expected + 1, v_document)
      on conflict (realm) do update set revision = excluded.revision, document = excluded.document;
    return jsonb_build_object('status', 'ok', 'document', v_document);
  elsif p_action in ('presentation_load', 'presentation_save') then
    v_workspace := p_payload->>'workspace';
    if v_workspace is null or length(v_workspace) not between 1 and 200 then
      raise exception using errcode = '22023', message = 'Invalid presentation workspace';
    end if;
    if p_action = 'presentation_load' then
      select p.document into v_value from orgtik.presentation p where p.realm = p_realm and p.workspace = v_workspace;
      return jsonb_build_object('status', 'ok', 'value', v_value);
    end if;
    if not (p_payload ? 'value') then raise exception using errcode = '22023', message = 'Missing presentation value'; end if;
    insert into orgtik.presentation (realm, workspace, document) values (p_realm, v_workspace, p_payload->'value')
      on conflict (realm, workspace) do update set document = excluded.document;
    return jsonb_build_object('status', 'ok');
  end if;

  select j.meta, j.revision into v_meta, v_revision from orgtik.journals j where j.realm = p_realm;
  v_revision := coalesce(v_revision, 0);
  if p_action = 'journal_get_meta' then
    return jsonb_build_object('status', 'ok', 'meta', v_meta);
  elsif p_action in ('journal_initialize', 'journal_set_meta') then
    v_value := p_payload->'meta';
    if jsonb_typeof(v_value) is distinct from 'object' or jsonb_typeof(v_value->'epoch') is distinct from 'string' or length(v_value->>'epoch') = 0 then
      raise exception using errcode = '22023', message = 'Invalid journal metadata';
    end if;
    if p_action = 'journal_set_meta' then
      if v_meta->>'epoch' is distinct from v_value->>'epoch' then delete from orgtik.receipts r where r.realm = p_realm; end if;
      insert into orgtik.journals (realm, meta) values (p_realm, v_value)
        on conflict (realm) do update set meta = excluded.meta;
      v_meta := v_value;
    elsif v_meta is null then
      insert into orgtik.journals (realm, meta) values (p_realm, v_value);
      v_meta := v_value;
    end if;
    return jsonb_build_object('status', 'ok', 'meta', v_meta);
  elsif p_action = 'journal_snapshot' then
    v_from := coalesce((p_payload->>'from')::bigint, 0);
    if v_from < 0 or v_from > 9007199254740991 then raise exception using errcode = '22023', message = 'Invalid journal offset'; end if;
    v_bound := v_revision;
    if p_payload ? 'revision' then
      v_bound := (p_payload->>'revision')::bigint;
      if v_bound is null or v_bound < 0 or v_bound > v_revision or (p_payload->'meta') is distinct from v_meta then
        return jsonb_build_object('status', 'conflict');
      end if;
    end if;
    v_next := least(v_bound, v_from + 8);
    select coalesce(jsonb_agg(e.entry order by e.sequence), '[]'::jsonb) into v_entries
      from orgtik.entries e where e.realm = p_realm and e.sequence > v_from and e.sequence <= v_next;
    return jsonb_build_object('status', 'ok', 'meta', v_meta, 'revision', v_bound, 'entries', v_entries, 'next', v_next);
  elsif p_action in ('journal_commit', 'journal_lookup', 'journal_reset') then
    if v_meta is null or p_payload->>'expectedEpoch' is distinct from v_meta->>'epoch' then
      return jsonb_build_object('status', 'conflict');
    end if;
    if p_action = 'journal_lookup' then
      v_operation := jsonb_build_object('key', p_payload->'key', 'receipt', jsonb_build_object('fingerprint', p_payload->'fingerprint'));
    else v_operation := p_payload->'operation'; end if;
    if v_operation is not null and v_operation <> 'null'::jsonb then
      v_key := v_operation->>'key';
      v_receipt := v_operation->'receipt';
      if v_key is null or v_key !~ '^[a-f0-9]{64}$'
        or jsonb_typeof(v_receipt) is distinct from 'object'
        or jsonb_typeof(v_receipt->'fingerprint') is distinct from 'string'
        or length(v_receipt->>'fingerprint') not between 1 and 256 then
        raise exception using errcode = '22023', message = 'Invalid operation receipt';
      end if;
      select r.receipt, r.sequence into v_value, v_sequence from orgtik.receipts r where r.realm = p_realm and r.key = v_key;
      if found then
        if v_value->>'fingerprint' is distinct from v_receipt->>'fingerprint' then return jsonb_build_object('status', 'operation_conflict'); end if;
        return jsonb_build_object('status', 'duplicate', 'sequence', v_sequence)
          || case when v_value ? 'result' then jsonb_build_object('result', v_value->'result') else '{}'::jsonb end;
      end if;
    elsif p_action = 'journal_lookup' then raise exception using errcode = '22023', message = 'Missing operation receipt'; end if;
    if p_action = 'journal_lookup' then return jsonb_build_object('status', 'missing'); end if;
    v_expected := (p_payload->>'expectedRevision')::bigint;
    if v_expected is null or v_expected < 0 then raise exception using errcode = '22023', message = 'Invalid journal revision'; end if;
    if v_revision <> v_expected then return jsonb_build_object('status', 'conflict'); end if;
    if p_action = 'journal_reset' then
      v_value := p_payload->'meta';
      if jsonb_typeof(v_value) is distinct from 'object' or jsonb_typeof(v_value->'epoch') is distinct from 'string'
        or length(v_value->>'epoch') = 0 or v_value->>'epoch' = v_meta->>'epoch' then
        raise exception using errcode = '22023', message = 'Journal reset requires new metadata';
      end if;
      delete from orgtik.entries e where e.realm = p_realm;
      delete from orgtik.receipts r where r.realm = p_realm;
      update orgtik.journals set meta = v_value, revision = 0 where realm = p_realm;
      return jsonb_build_object('status', 'ok', 'meta', v_value, 'revision', 0, 'entries', '[]'::jsonb);
    end if;
    if (p_payload->>'maxEntries')::bigint is null or (p_payload->>'maxEntries')::bigint not between 1 and 100000 then
      raise exception using errcode = '22023', message = 'Invalid journal capacity';
    end if;
    if v_revision >= (p_payload->>'maxEntries')::bigint then return jsonb_build_object('status', 'full'); end if;
    v_raw := p_payload->>'raw';
    if jsonb_typeof(p_payload->'raw') is distinct from 'string'
      or (v_raw::jsonb->>'epoch') is distinct from v_meta->>'epoch'
      or octet_length(v_raw) + octet_length(coalesce(v_receipt, '{}'::jsonb)::text) > 524288 then
      raise exception using errcode = '22023', message = 'Invalid journal entry';
    end if;
    if p_payload ? 'identity' and p_payload->'identity' <> 'null'::jsonb then
      if not orgtik.apply_accounts(p_realm, p_payload#>'{identity,changes}') then return jsonb_build_object('status', 'account_conflict'); end if;
    end if;
    v_sequence := v_revision + 1;
    insert into orgtik.entries (realm, sequence, entry) values (p_realm, v_sequence, v_raw);
    update orgtik.journals set revision = v_sequence where realm = p_realm;
    if v_operation is not null and v_operation <> 'null'::jsonb then
      insert into orgtik.receipts (realm, key, fingerprint, sequence, receipt)
        values (p_realm, v_key, v_receipt->>'fingerprint', v_sequence, v_receipt);
    end if;
    return jsonb_build_object('status', 'ok', 'sequence', v_sequence)
      || case when v_receipt ? 'result' then jsonb_build_object('result', v_receipt->'result') else '{}'::jsonb end;
  elsif p_action = 'journal_clear' then
    delete from orgtik.entries e where e.realm = p_realm;
    delete from orgtik.receipts r where r.realm = p_realm;
    update orgtik.journals set revision = 0 where realm = p_realm;
    return jsonb_build_object('status', 'ok');
  end if;
  raise exception using errcode = '22023', message = 'Unsupported persistence action';
end;
$$;

revoke all on all functions in schema orgtik from public, anon, authenticated, service_role;
grant usage on schema orgtik to service_role;
grant execute on function orgtik.persistence(text, text, jsonb) to service_role;

-- The exposed wrapper does not elevate privileges. Its private implementation runs as
-- its owner and is inaccessible to anon/authenticated, including through direct RPC.
create function public.orgtik_persistence(p_realm text, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = ''
as $$ select orgtik.persistence(p_realm, p_action, p_payload); $$;
revoke all on function public.orgtik_persistence(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.orgtik_persistence(text, text, jsonb) to service_role;

-- Uploaded bytes are served through the suite API after authorization, never public URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('orgtik-media', 'orgtik-media', false, 15728640, array['application/octet-stream'])
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
commit;
