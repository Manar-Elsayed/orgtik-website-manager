const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {imageStorage} = require('./image-storage');
const {replaceImage} = require('./media-replacement');

const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const token = role => `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({role})).toString('base64url')}.fixture-signature-only`;
const env = {MOCK_PERSISTENCE:'supabase', SUPABASE_URL:'https://fixture.supabase.co', SUPABASE_SERVICE_ROLE_KEY:token('service_role')};
const file = 'md_01-v2-fixture.png';
const rowFor = (bytes, name = file) => ({file:name, bytes:bytes.length, hash:digest(bytes)});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-supabase-media-'));
  t.after(() => {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith('wm-supabase-media-'));
    fs.rmSync(root, {recursive:true, force:true});
  });
  const objects = new Map(), calls = [];
  const fetcher = async (url, init) => {
    calls.push({url, init});
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.headers.apikey, env.SUPABASE_SERVICE_ROLE_KEY);
    assert.equal(init.headers.authorization, `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
    const pathname = new URL(url).pathname;
    if (init.method === 'POST') {
      assert.equal(init.headers['x-upsert'], 'false');
      assert.equal(init.headers['content-type'], 'application/octet-stream');
      assert.match(pathname, /^\/storage\/v1\/object\/orgtik-media\/[\w.-]+\/[a-f0-9]{64}$/);
      const key = pathname.replace('/storage/v1/object/', '');
      if (objects.has(key)) return Response.json({code:'ResourceAlreadyExists'}, {status:409});
      assert.ok(Buffer.isBuffer(init.body));
      objects.set(key, Buffer.from(init.body));
      return Response.json({Key:key}, {status:200});
    }
    assert.equal(init.method, 'GET');
    assert.match(pathname, /^\/storage\/v1\/object\/authenticated\/orgtik-media\//);
    const bytes = objects.get(pathname.replace('/storage/v1/object/authenticated/', ''));
    return bytes ? new Response(bytes) : Response.json({code:'NoSuchKey'}, {status:404});
  };
  return {root, objects, calls, fetcher, store:(name, options = {}) => imageStorage({uploadsDir:path.join(root, name), realm:'production', hosted:true, env, fetcher, ...options})};
}

test('Supabase media survives cold starts in private realm-scoped immutable objects', async t => {
  const f = fixture(t), bytes = Buffer.alloc(640 * 1024, 7), row = rowFor(bytes);
  await f.store('writer').write(file, bytes);
  assert.deepEqual(fs.readFileSync(path.join(f.root, 'writer', file)), bytes);
  assert.deepEqual(await f.store('cold').read(row), bytes);
  assert.deepEqual([...f.objects.keys()], [`orgtik-media/production/${row.hash}`]);
  await assert.rejects(f.store('other', {realm:'preview'}).read(row), {code:'media_content_unavailable'});
  assert.ok(f.calls.every(call => !call.url.includes('/public/') && !call.url.includes(env.SUPABASE_SERVICE_ROLE_KEY)));
});

test('concurrent duplicate uploads verify existing bytes without overwriting objects', async t => {
  const f = fixture(t), bytes = Buffer.from('same immutable image');
  await Promise.all([f.store('first').write(file, bytes), f.store('second').write('md_02-v2-copy.png', bytes)]);
  assert.equal(f.objects.size, 1);
  assert.equal(f.calls.filter(call => call.init.method === 'GET').length, 1);
  f.objects.set([...f.objects.keys()][0], Buffer.from('corrupt object'));
  await assert.rejects(f.store('corrupt').write(file, bytes), {code:'media_content_unavailable'});
  assert.equal(fs.existsSync(path.join(f.root, 'corrupt', file)), false);
  assert.equal(f.objects.get([...f.objects.keys()][0]).toString(), 'corrupt object');
});

test('legacy Storage duplicate status is accepted only after an authenticated content check', async t => {
  const f = fixture(t), bytes = Buffer.from('legacy duplicate');
  await f.store('first').write(file, bytes);
  const fetcher = (url, init) => init.method === 'POST' ? Promise.resolve(Response.json({error:'Duplicate'}, {status:400})) : f.fetcher(url, init);
  await f.store('second', {fetcher}).write(file, bytes);
  assert.deepEqual(await f.store('second').read(rowFor(bytes)), bytes);
});

test('selecting Supabase fails closed on invalid configuration even with a valid local cache and Redis configured', async t => {
  const f = fixture(t), bytes = Buffer.from('cached bytes'), uploadsDir = path.join(f.root, 'cached');
  fs.mkdirSync(uploadsDir); fs.writeFileSync(path.join(uploadsDir, file), bytes);
  const invalid = [
    {SUPABASE_URL:undefined}, {SUPABASE_SERVICE_ROLE_KEY:undefined},
    {SUPABASE_URL:'http://fixture.supabase.co'}, {SUPABASE_URL:'https://user:pass@fixture.supabase.co'},
    {SUPABASE_URL:'https://fixture.supabase.co/path'}, {SUPABASE_URL:'https://fixture.supabase.co?x=1'},
    {SUPABASE_URL:'https://fixture.supabase.co#fragment'}, {SUPABASE_SERVICE_ROLE_KEY:token('anon')},
    {SUPABASE_SERVICE_ROLE_KEY:'sb_publishable_fixture_key_with_32_characters'},
    {SUPABASE_SERVICE_ROLE_KEY:'malformed-service-role-key-with-32-characters'},
    {SUPABASE_SERVICE_ROLE_KEY:env.SUPABASE_SERVICE_ROLE_KEY+'\n'},
  ];
  for (const config of invalid) {
    const store = imageStorage({uploadsDir, realm:'production', hosted:false, env:{...env, KV_REST_API_URL:'https://redis.test', KV_REST_API_TOKEN:'redis-token', ...config}, fetcher:() => { throw new Error('Must not contact another provider'); }});
    await assert.rejects(store.read(rowFor(bytes)), {code:'media_content_unavailable'});
    await assert.rejects(store.write('md_02-v2-rejected.png', bytes), {code:'media_content_unavailable'});
  }
  for (const realm of ['../production', '.', '..', '%2fproduction']) await assert.rejects(f.store('invalid-realm', {realm}).write(file, bytes), {code:'media_content_unavailable'});
  assert.equal(fs.existsSync(path.join(uploadsDir, 'md_02-v2-rejected.png')), false);
});

test('server secret API keys are accepted without exposing them in object URLs', async t => {
  const f = fixture(t), bytes = Buffer.from('secret API key fixture');
  const secret = ['sb', 'secret', 'fixture_only_not_a_real_credential'].join('_');
  const store = f.store('secret', {env:{...env, SUPABASE_SECRET_KEY:secret}, fetcher:async (url, init) => {
    assert.equal(init.headers.apikey, secret);
    assert.equal(init.headers.authorization, undefined);
    assert.ok(!url.includes(secret));
    return new Response('', {status:200});
  }});
  await store.write(file, bytes);
});

test('Supabase outages reject writes before local or content metadata changes and conceal provider responses', async t => {
  const f = fixture(t), bytes = Buffer.from('new bytes');
  for (const status of [301, 401, 403, 429, 500, 503]) {
    const store = f.store(`status-${status}`, {fetcher:async () => new Response('private provider detail', {status})});
    await assert.rejects(store.write(file, bytes), error => error.code === 'media_content_unavailable' && error.status === 503 && error.message === 'media_content_unavailable');
    assert.equal(fs.existsSync(path.join(f.root, `status-${status}`, file)), false);
  }
  const store = f.store('network', {fetcher:async () => { throw new Error('private URL and credential'); }});
  await assert.rejects(store.read(rowFor(bytes)), {message:'media_content_unavailable'});
});

test('cold reads reject truncated, corrupt, missing and oversized object bodies', async t => {
  const f = fixture(t), bytes = Buffer.from('original bytes'), row = rowFor(bytes);
  for (const body of [Buffer.from('short'), Buffer.alloc(bytes.length, 1), Buffer.alloc(bytes.length + 1, 1)]) {
    await assert.rejects(f.store('bad', {fetcher:async () => new Response(body)}).read(row), {code:'media_content_unavailable'});
  }
  await assert.rejects(f.store('missing').read(row), {code:'media_content_unavailable'});
  let cancelled = false;
  const stream = new ReadableStream({start(controller) { controller.enqueue(Buffer.alloc(bytes.length + 1)); }, cancel() { cancelled = true; }});
  await assert.rejects(f.store('stream', {fetcher:async () => new Response(stream)}).read(row), {code:'media_content_unavailable'});
  assert.equal(cancelled, true);
  let read = false;
  await assert.rejects(f.store('header', {fetcher:async () => ({ok:true, headers:new Headers({'content-length':String(bytes.length+1)}), body:{getReader() { read = true; }}})}).read(row), {code:'media_content_unavailable'});
  assert.equal(read, false);
});

test('local caches are checked for integrity and invalid filenames and size limits never reach Storage', async t => {
  const f = fixture(t), bytes = Buffer.from('verified cache'), store = f.store('cache');
  await store.write(file, bytes);
  const calls = f.calls.length;
  assert.deepEqual(await store.read(rowFor(bytes)), bytes);
  assert.equal(f.calls.length, calls);
  fs.writeFileSync(path.join(f.root, 'cache', file), Buffer.alloc(bytes.length));
  assert.deepEqual(await store.read(rowFor(bytes)), bytes);
  const before = f.calls.length;
  for (const name of ['../escaped.png', 'md_01-../../escaped.png', 'invalid.png']) {
    await assert.rejects(store.write(name, bytes), {code:'media_content_unavailable'});
    await assert.rejects(store.read(rowFor(bytes, name)), {code:'media_content_unavailable'});
  }
  for (const invalid of [Buffer.alloc(0), Buffer.alloc(15*1024*1024+1), 'not a Buffer']) await assert.rejects(store.write(file, invalid), {code:'media_content_unavailable'});
  for (const row of [{...rowFor(bytes), hash:'invalid'}, {...rowFor(bytes), bytes:15*1024*1024+1}, {...rowFor(bytes), bytes:0}]) await assert.rejects(store.read(row), {code:'media_content_unavailable'});
  assert.equal(f.calls.length, before);
});

test('Supabase selection is explicit and local and Redis media stores retain existing behavior', async t => {
  const f = fixture(t), bytes = Buffer.from('local and Redis rollback'), row = rowFor(bytes);
  const local = f.store('local', {hosted:false, env:{SUPABASE_URL:env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY:env.SUPABASE_SERVICE_ROLE_KEY}, fetcher:() => assert.fail('Local mode must not contact Supabase')});
  await local.write(file, bytes); assert.deepEqual(await local.read(row), bytes);
  const chunks = new Map(), redisEnv = {KV_REST_API_URL:'https://redis.fixture.test', KV_REST_API_TOKEN:'redis-token'};
  const fetcher = async (url, init) => {
    assert.equal(url, redisEnv.KV_REST_API_URL);
    const [command, key, value] = JSON.parse(init.body);
    assert.ok(key.startsWith('orgtik:wm-images:production:'));
    if (command === 'SET') chunks.set(key, value);
    return Response.json({result:command === 'SET' ? 'OK' : chunks.get(key) || null});
  };
  await f.store('redis-writer', {env:redisEnv, fetcher}).write(file, bytes);
  assert.deepEqual(await f.store('redis-cold', {env:redisEnv, fetcher}).read(row), bytes);
});

test('replacement runtime retains original and replacement image versions across Supabase cold starts', async t => {
  const f = fixture(t), media = {id:'md_01', file:'brand-cards.webp', version:1, kind:'image', source:'website'}, state = {mediaVersions:{}}, store = {audit:[]};
  const original = fs.readFileSync(path.resolve(__dirname, '../../../apps/website/landing-directions/public/assets/brand-cards.webp'));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
  await replaceImage({lib:{media:new Map([[media.id, media]])}, state, store, uploadsDir:path.join(f.root, 'runtime'), imageStore:f.store('runtime'), now:() => '2026-10-16T00:00:00Z', who:{user:{key:'fixture'}}, key:media.id, file:{buffer:png, mimetype:'image/png', originalname:'replacement.png'}, version:1});
  assert.equal(media.version, 2);
  assert.equal(f.objects.size, 2);
  assert.deepEqual(await f.store('runtime-cold').read(state.mediaVersions.md_01[0]), original);
  assert.deepEqual(await f.store('runtime-cold').read(state.mediaVersions.md_01[1]), png);
  const before = structuredClone({media, state, store});
  await assert.rejects(replaceImage({lib:{media:new Map([[media.id, media]])}, state, store, uploadsDir:path.join(f.root, 'runtime'), imageStore:f.store('runtime-failed', {fetcher:async () => new Response('', {status:503})}), now:() => '2026-10-16T00:00:00Z', who:{user:{key:'fixture'}}, key:media.id, file:{buffer:png, mimetype:'image/png', originalname:'failed.png'}, version:2}), {code:'media_content_unavailable'});
  assert.deepEqual({media, state, store}, before);
});
