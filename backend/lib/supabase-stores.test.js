const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const journal = require('./journal');
const accounts = require('./auth-store');
const sessions = require('./session-store');
const {presentationStorage} = require('./presentation-storage');
const {RealDate} = require('./clock');

const realm = 'store-contract-test';
const meta = {epoch:'epoch-one', seedAt:'2026-10-16T00:00:00Z', clock:'2026-10-16T00:00:00Z'};
const secret = 'fixture-session-signing-secret-with-32-bytes';
const env = {MOCK_PERSISTENCE:'supabase', MOCK_SANDBOX:realm, SUPABASE_URL:'https://fixture.supabase.co', SUPABASE_SECRET_KEY:['sb', 'secret', 'fixture_only_not_a_real_credential'].join('_'), MOCK_SESSION_SECRET:secret};
const entry = {epoch:meta.epoch, app:'wm', method:'PATCH', url:'/v2/admin/example', headers:{authorization:'Bearer must-be-removed', cookie:'must-be-removed', 'x-mock-replay':'must-be-removed', 'content-type':'application/json'}, body:'{}'};
const expected = {expectedEpoch:meta.epoch, expectedRevision:0};
const operation = {id:'attempt-one', workspaceId:'workspace-one', actor:{userId:7, impersonatedBy:8}, fingerprint:'request-fingerprint', result:{id:'result-one'}};
const account = (id, email = `person${id}@example.test`) => JSON.stringify({user:{id, email, passwordHash:'scrypt:fixture-hash'}, grants:{wm:{role:'viewer'}}, registration:null});
const document = (revision = 1) => ({schema:1, realm, revision, state:sessions.emptyState()});
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function client(handler) {
  const calls = [];
  return {realm, calls, async rpc(action, payload = {}) {
    calls.push({action, payload:structuredClone(payload)});
    return structuredClone(await handler(action, payload, calls.length));
  }};
}
async function withEnv(values, fn) {
  const keys = [...new Set(['MOCK_PERSISTENCE', 'MOCK_JOURNAL', 'MOCK_AUTH_STORE', 'MOCK_SANDBOX', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'MOCK_SESSION_SECRET', 'MOCK_AUTH_SECRET', 'VERCEL', ...Object.keys(values)])];
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) values[key] === undefined ? delete process.env[key] : process.env[key] = values[key];
  try { return await fn(); }
  finally { for (const key of keys) before[key] === undefined ? delete process.env[key] : process.env[key] = before[key]; }
}

test('Supabase journal pins paged snapshots while the journal grows and returns only the original revision', async () => {
  const history = Array.from({length:12}, (_, n) => `entry-${n+1}`);
  const rpc = client((action, payload, call) => {
    assert.equal(action, 'journal_snapshot');
    if (call === 1) { assert.deepEqual(payload, {from:0}); return {status:'ok', meta, revision:10, entries:history.slice(0, 8), next:8}; }
    assert.deepEqual(payload, {from:8, meta, revision:10});
    return {status:'ok', meta, revision:10, entries:history.slice(8, 10), next:10};
  });
  const store = journal.supabaseStore({client:rpc});
  assert.equal(store.kind, 'supabase'); assert.equal(store.atomicIdentity, true);
  assert.deepEqual(await store.snapshot(), {meta, revision:10, entries:history.slice(0, 10)});
  assert.equal(rpc.calls.length, 2);
});

test('Supabase journal restarts a reset snapshot without mixing old and new epochs', async () => {
  const reset = {...meta, epoch:'epoch-two'};
  const rpc = client((_action, payload, call) => {
    if (call === 1) return {status:'ok', meta, revision:3, entries:['old-one'], next:1};
    if (call === 2) { assert.deepEqual(payload, {from:1, meta, revision:3}); return {status:'conflict'}; }
    assert.deepEqual(payload, {from:0});
    return {status:'ok', meta:reset, revision:2, entries:['new-one', 'new-two'], next:2};
  });
  assert.deepEqual(await journal.supabaseStore({client:rpc}).snapshot(), {meta:reset, revision:2, entries:['new-one', 'new-two']});
  assert.equal(rpc.calls.length, 3);
});

test('Supabase journal rejects incomplete or inconsistent pages and bounds reset retries', async t => {
  const invalid = [
    {revision:-1, entries:[], next:0}, {revision:1.1, entries:[], next:0}, {revision:1, entries:[{}], next:1},
    {revision:2, entries:[], next:0}, {revision:1, entries:['one'], next:0}, {revision:1, entries:['one'], next:2},
    {revision:1, entries:'one', next:1}, {revision:1, entries:['one'], next:'1'},
  ];
  for (const [index, value] of invalid.entries()) await t.test(`invalid page ${index}`, async () => {
    const rpc = client(() => ({status:'ok', meta, ...value}));
    await assert.rejects(journal.supabaseStore({client:rpc}).snapshot(), {status:503});
    assert.equal(rpc.calls.length, 1);
  });
  for (const second of [{status:'ok', meta, revision:3, entries:['two'], next:2}, {status:'ok', meta:{...meta, epoch:'other'}, revision:2, entries:['two'], next:2}]) {
    const rpc = client((_action, _payload, call) => call === 1 ? {status:'ok', meta, revision:2, entries:['one'], next:1} : second);
    await assert.rejects(journal.supabaseStore({client:rpc}).snapshot(), {status:503});
  }
  const unstable = client((_action, _payload, call) => call % 2 ? {status:'ok', meta, revision:2, entries:['one'], next:1} : {status:'conflict'});
  await assert.rejects(journal.supabaseStore({client:unstable}).snapshot(), {status:503});
  assert.equal(unstable.calls.length, 8);
  const store = journal.supabaseStore({client:client(() => assert.fail('Invalid offsets must not contact storage'))});
  for (const offset of [-1, 1.5, NaN, Number.MAX_SAFE_INTEGER+1]) await assert.rejects(store.snapshot(offset), TypeError);
});

test('Supabase journal offsets and polling use exact committed positions including an empty store', async () => {
  const rpc = client((_action, payload) => {
    assert.equal(payload.from, 7);
    return {status:'ok', meta, revision:3, entries:[], next:3};
  });
  const store = journal.supabaseStore({client:rpc});
  assert.deepEqual(await store.poll(7), {meta, revision:3, entries:[]});
  assert.deepEqual(await store.read(7), []);
  assert.deepEqual(await journal.supabaseStore({client:client(() => ({status:'ok', meta:null, revision:0, entries:[], next:0}))}).snapshot(), {meta:null, revision:0, entries:[]});
});

test('Supabase journal commits operation context and account CAS in the same RPC with credentials excluded from replay', async () => {
  const changes = [{id:'7', expected:null, value:account(7)}];
  const rpc = client((action, payload) => {
    assert.equal(action, 'journal_commit');
    assert.deepEqual(payload.identity, {changes});
    assert.equal(payload.expectedRevision, 0); assert.equal(payload.expectedEpoch, meta.epoch);
    assert.equal(payload.operation.key, hash(JSON.stringify(['workspace-one', '7', 'attempt-one'])));
    assert.deepEqual(payload.operation.receipt, {fingerprint:operation.fingerprint, result:operation.result});
    const saved = JSON.parse(payload.raw);
    assert.deepEqual(saved.context, {workspaceId:'workspace-one', actor:{userId:7, impersonatedBy:8}, operationId:'attempt-one'});
    assert.deepEqual(saved.headers, {'content-type':'application/json'});
    assert.equal(saved.identity, undefined);
    return {status:'ok', sequence:1, result:operation.result};
  });
  const store = journal.supabaseStore({client:rpc});
  assert.deepEqual(await store.commit(entry, {...expected, operation, identity:{changes, accountsKey:'unused-redis-key', emailsKey:'unused-redis-key'}}), {sequence:1, replayed:false, result:operation.result});
  assert.equal(rpc.calls.length, 1);
  assert.equal(entry.headers.authorization, 'Bearer must-be-removed');
});

test('Supabase journal validates operation and identity deltas before contacting storage', async () => {
  const rpc = client(() => assert.fail('Invalid input must not contact storage'));
  const store = journal.supabaseStore({client:rpc});
  const rejected = [
    [{...entry, epoch:'wrong'}, expected], [entry, {...expected, expectedRevision:-1}], [entry, {...expected, expectedEpoch:''}],
    [entry, {...expected, operation:{...operation, id:''}}], [entry, {...expected, operation:{...operation, actor:{userId:null}}}],
    [entry, {...expected, operation:{...operation, result:{nested:{refreshToken:'never-persist'}}}}],
    [entry, {...expected, identity:{changes:'invalid'}}],
    [entry, {...expected, identity:{changes:[{id:'7', expected:null, value:account(7)}, {id:7, expected:null, value:account(7)}]}}],
    [entry, {...expected, identity:{changes:[{id:'7', expected:null, value:account(8)}]}}],
    [entry, {...expected, identity:{changes:[{id:'7', expected:null, value:JSON.stringify({user:{id:7, email:'a@test.test', password:'plaintext'}})}]}}],
  ];
  for (const [value, condition] of rejected) await assert.rejects(store.commit(value, condition), TypeError);
  await assert.rejects(store.commit({...entry, body:'x'.repeat(journal.MAX_BODY)}, expected), {status:503});
  await assert.rejects(store.commit(entry, {...expected, identity:{changes:[{id:'7', expected:null, value:account(7)+' '.repeat(journal.MAX_BODY)}]}}), {status:503});
  assert.equal(rpc.calls.length, 0);
});

test('Supabase journal maps concurrency, capacity and idempotency responses without acknowledging invalid sequences', async () => {
  for (const [status, code, http] of [['conflict', 'journal_conflict', 409], ['account_conflict', 'account_conflict', 409], ['operation_conflict', 'operation_conflict', 409], ['full', 'journal_unavailable', 503]]) {
    const store = journal.supabaseStore({client:client(() => ({status}))});
    await assert.rejects(store.commit(entry, expected), {status:http, code});
  }
  for (const sequence of [0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER+1, undefined]) await assert.rejects(journal.supabaseStore({client:client(() => ({status:'ok', sequence}))}).commit(entry, expected), {status:503});
  const duplicate = journal.supabaseStore({client:client(() => ({status:'duplicate', sequence:3, result:{id:'original-result'}}))});
  assert.deepEqual(await duplicate.commit(entry, {...expected, operation}), {sequence:3, replayed:true, result:{id:'original-result'}});
  assert.deepEqual(await duplicate.lookupOperation(operation, {expectedEpoch:meta.epoch}), {sequence:3, replayed:true, result:{id:'original-result'}});
  const missing = journal.supabaseStore({client:client(() => ({status:'missing'}))});
  assert.equal(await missing.lookupOperation(operation, {expectedEpoch:meta.epoch}), null);
  await assert.rejects(missing.lookupOperation(null, {expectedEpoch:meta.epoch}), TypeError);
  await assert.rejects(missing.lookupOperation(operation), TypeError);
});

test('Supabase journal reset requires a confirmed empty new epoch rather than an incomplete success response', async () => {
  const replacement = {...meta, epoch:'epoch-two'};
  for (const reply of [{status:'ok'}, {status:'ok', meta}, {status:'ok', meta:replacement, revision:3, entries:['unreset']}, {status:'missing', meta:replacement, revision:0, entries:[]}]) {
    await assert.rejects(journal.supabaseStore({client:client(() => reply)}).reset(replacement, expected), {status:503});
  }
  const rpc = client((action, payload) => {
    assert.equal(action, 'journal_reset'); assert.deepEqual(payload, {...expected, meta:replacement});
    return {status:'ok', meta:replacement, revision:0, entries:[]};
  });
  assert.deepEqual(await journal.supabaseStore({client:rpc}).reset(replacement, expected), {meta:replacement, revision:0, entries:[]});
  assert.equal(rpc.calls.length, 1);
});

test('Supabase journal action-specific success states and metadata are validated before acknowledgement', async () => {
  for (const status of ['missing', 'duplicate']) {
    const store = journal.supabaseStore({client:client(() => ({status, meta, sequence:1}))});
    await assert.rejects(store.getMeta(), {status:503});
    await assert.rejects(store.initialize(meta), {status:503});
    await assert.rejects(store.setMeta(meta), {status:503});
    await assert.rejects(store.clear(), {status:503});
  }
  for (const value of [undefined, {}, {epoch:''}, {epoch:42}, []]) {
    const store = journal.supabaseStore({client:client(() => ({status:'ok', meta:value}))});
    await assert.rejects(store.getMeta(), {status:503});
    await assert.rejects(store.initialize(meta), {status:503});
  }
  assert.equal(await journal.supabaseStore({client:client(() => ({status:'ok', meta:null}))}).getMeta(), null);
  await assert.rejects(journal.supabaseStore({client:client(() => ({status:'ok', sequence:2}))}).commit(entry, expected), {status:503});
  await assert.rejects(journal.supabaseStore({client:client(() => ({status:'missing', sequence:1}))}).commit(entry, expected), {status:503});
  await assert.rejects(journal.supabaseStore({client:client(() => ({status:'ok', sequence:1}))}).lookupOperation(operation, {expectedEpoch:meta.epoch}), {status:503});
});

test('Supabase account records retain exact CAS text and handoffs use hashed one-use keys with bounded expiry', async () => {
  const raw = account(7), changes = [{id:'7', expected:raw, value:account(7, 'changed@example.test')}], handoffs = new Map();
  const at = RealDate.now();
  const rpc = client((action, payload) => {
    if (action === 'accounts_read') return {status:'ok', accounts:{7:raw}};
    if (action === 'accounts_commit') { assert.deepEqual(payload.changes, changes); return {status:'ok'}; }
    if (action === 'accounts_reset_test_fixtures') return {status:'ok'};
    assert.equal(payload.key, hash('one-use-code'));
    assert.ok(!JSON.stringify(payload).includes('one-use-code'));
    if (action === 'handoff_put') {
      assert.ok(payload.expiresAt >= at+60000 && payload.expiresAt <= RealDate.now()+60000);
      handoffs.set(payload.key, payload.value); return {status:'ok'};
    }
    if (action === 'handoff_take') { const value = handoffs.get(payload.key) || null; handoffs.delete(payload.key); return {status:'ok', value}; }
    if (action === 'claim_legacy') return {status:'ok', claimed:payload.expiresAt > at};
    assert.fail(`Unexpected action ${action}`);
  });
  const store = accounts.supabaseStore({client:rpc});
  assert.deepEqual(await store.accounts(), new Map([['7', raw]]));
  await store.commit([]); assert.equal(rpc.calls.length, 1);
  await store.commit(changes); await store.resetTestFixtures();
  const value = {userId:7, expiresAt:at+10*60*1000};
  await store.putHandoff('one-use-code', value);
  assert.deepEqual(await store.takeHandoff('one-use-code'), value);
  assert.equal(await store.takeHandoff('one-use-code'), null);
  assert.equal(await store.claimLegacy('one-use-code', at+60000), true);
  assert.equal(await store.claimLegacy('one-use-code', at-1), false);
});

test('Supabase account responses reject invalid record collections and map account CAS conflicts', async () => {
  for (const value of [null, undefined, [], 'records', {7:{}}, {7:1}]) await assert.rejects(accounts.supabaseStore({client:client(() => ({status:'ok', accounts:value}))}).accounts(), {status:503});
  for (const status of ['conflict', 'account_conflict']) await assert.rejects(accounts.supabaseStore({client:client(() => ({status}))}).commit([{id:'7', expected:null, value:account(7)}]), {status:409});
  for (const status of ['full', 'missing', 'duplicate']) await assert.rejects(accounts.supabaseStore({client:client(() => ({status}))}).takeHandoff('code'), {status:503});
});

test('Supabase session keys remain independent of provider credentials and are scoped by realm', async () => {
  const store = sessions.supabaseStore({client:client(() => ({status:'ok', document:null})), realm, secret});
  const key = await store.signingKey();
  assert.deepEqual(key, sessions.deriveKey(secret, realm));
  key.fill(0); assert.notDeepEqual(await store.signingKey(), key);
  const rotated = sessions.supabaseStore({client:client(() => ({status:'ok', document:null})), realm, env:{...env, SUPABASE_SECRET_KEY:['sb', 'secret', 'rotated_only_not_a_real_credential'].join('_')}});
  assert.deepEqual(await rotated.signingKey(), sessions.deriveKey(secret, realm));
  assert.notDeepEqual(await sessions.supabaseStore({client:client(() => ({})), realm:'another-realm', secret}).signingKey(), await store.signingKey());
  assert.throws(() => sessions.supabaseStore({client:client(() => ({})), realm, secret:'too-short'}), {code:'session_store_unavailable'});
  assert.deepEqual(await store.read(), {...document(0), state:sessions.emptyState()});
});

test('Supabase sessions send revision CAS without mutating caller state and map conflicts', async () => {
  const state = sessions.emptyState(); state.userVersions['7'] = 2;
  const rpc = client((action, payload) => {
    assert.equal(action, 'security_cas'); assert.equal(payload.expectedRevision, 4);
    assert.deepEqual(payload.document, {schema:1, realm, revision:5, state});
    return {status:'ok', document:payload.document};
  });
  const store = sessions.supabaseStore({client:rpc, realm, secret});
  const saved = await store.compareAndSwap(4, state); saved.state.userVersions['7'] = 999;
  assert.equal(state.userVersions['7'], 2);
  for (const revision of [-1, 1.5, '4', Number.MAX_SAFE_INTEGER]) await assert.rejects(store.compareAndSwap(revision, state));
  assert.equal(rpc.calls.length, 1);
  for (const status of ['conflict', 'full']) await assert.rejects(sessions.supabaseStore({client:client(() => ({status})), realm, secret}).compareAndSwap(0, state), {status:status === 'conflict' ? 409 : 503});
});

test('Supabase sessions reject malformed documents and CAS success at an unrelated revision', async () => {
  const malformed = [undefined, false, 0, '', {...document(), realm:'another-realm'}, {...document(), schema:2}, {...document(), revision:'1'}, {...document(), state:{sessions:[], families:{}, handoffs:{}, userVersions:{}}}, {...document(), state:{sessions:{}, families:{}, handoffs:{}}}];
  for (const value of malformed) await assert.rejects(sessions.supabaseStore({client:client(() => ({status:'ok', document:value})), realm, secret}).read(), {status:503});
  for (const value of [document(0), document(9), null, undefined]) await assert.rejects(sessions.supabaseStore({client:client(() => ({status:'ok', document:value})), realm, secret}).compareAndSwap(0, sessions.emptyState()), {status:503});
});

test('Supabase takes precedence over configured Redis or local stores and never falls back on incomplete configuration', async () => {
  await withEnv({...env, KV_REST_API_URL:'https://redis.test', KV_REST_API_TOKEN:'unused-redis-token', MOCK_JOURNAL:'memory', MOCK_AUTH_STORE:'file'}, async () => {
    assert.equal(journal.pickStore({dataDir:'unused'}).store.kind, 'supabase');
    assert.equal(accounts.pickStore({dataDir:'unused'}).kind, 'supabase');
    assert.equal(sessions.pickStore({dataDir:'unused', hosted:true}).kind, 'supabase');
    assert.ok(presentationStorage());
  });
  for (const broken of [{SUPABASE_URL:undefined}, {SUPABASE_SECRET_KEY:undefined}]) await withEnv({...env, ...broken, KV_REST_API_URL:'https://redis.test', KV_REST_API_TOKEN:'unused-redis-token', MOCK_JOURNAL:'memory'}, async () => {
    assert.throws(() => journal.pickStore({dataDir:'unused'}), {status:503});
    assert.throws(() => accounts.pickStore({dataDir:'unused'}), {status:503});
    assert.throws(() => sessions.pickStore({dataDir:'unused', hosted:true}), {status:503});
    assert.throws(() => presentationStorage(), {status:503});
  });
  await withEnv({...env, MOCK_SESSION_SECRET:undefined, KV_REST_API_URL:'https://redis.test', KV_REST_API_TOKEN:'fixture-unused'}, async () => {
    assert.throws(() => sessions.pickStore({dataDir:'unused', hosted:true}), {status:503});
  });
  await withEnv({...env, MOCK_PERSISTENCE:'typo'}, async () => {
    assert.throws(() => journal.pickStore({dataDir:'unused'})); assert.throws(() => accounts.pickStore({dataDir:'unused'}));
    assert.throws(() => sessions.pickStore({dataDir:'unused'})); assert.throws(() => presentationStorage());
  });
});

test('Supabase presentation data uses only its isolated RPC namespace and fails closed on errors', async () => {
  const originalFetch = globalThis.fetch, calls = [];
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, env.SUPABASE_URL+'/rest/v1/rpc/orgtik_persistence');
      assert.equal(init.headers.apikey, env.SUPABASE_SECRET_KEY);
      assert.equal(init.headers.authorization, undefined);
      const body = JSON.parse(init.body); calls.push(body);
      assert.equal(body.p_realm, realm);
      return Response.json({status:'ok', ...(body.p_action === 'presentation_load' ? {value:{theme:'dark'}} : {})});
    };
    const store = presentationStorage(env);
    assert.deepEqual(await store.load('workspace-one'), {theme:'dark'});
    await store.save('workspace-one', {theme:'light'});
    assert.deepEqual(calls.map(call => call.p_action), ['presentation_load', 'presentation_save']);
    assert.deepEqual(calls[1].p_payload, {workspace:'workspace-one', value:{theme:'light'}});
    globalThis.fetch = async () => Response.json({status:'conflict'});
    await assert.rejects(presentationStorage(env).load('workspace-one'));
    globalThis.fetch = async () => new Response('private error', {status:503});
    await assert.rejects(presentationStorage(env).save('workspace-one', {theme:'dark'}), error => error.status === 503 && !error.message.includes('private error'));
  } finally { globalThis.fetch = originalFetch; }
});
