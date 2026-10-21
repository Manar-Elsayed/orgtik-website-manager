const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');

test('central people requires verified staff administration while workspace directories stay scoped', { timeout: 90000 }, async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'orgtik-central-people-'));
  Object.assign(process.env, { MOCK_AUTH_FILE: path.join(folder, 'accounts.json'), MOCK_AUTH_STORE: 'file', MOCK_JOURNAL: 'memory', MOCK_SANDBOX: `central-people-${process.pid}`, MOCK_PUBLIC_URL: '', VERCEL: '', KV_REST_API_URL: '', KV_REST_API_TOKEN: '', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', MOCK_CLOCK: 'frozen', MOCK_NOW: '2026-10-15T10:00:00Z' });
  process.argv.push('--only=sos,admin,wm');
  const server = http.createServer(require('../api/index'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/sos`;
  const call = async (route, token, method = 'GET', body) => {
    const response = await fetch(base + route, { method, headers: { connection: 'close', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000) });
    return { status: response.status, body: await response.json() };
  };
  const good = response => { assert.ok(response.status < 300, JSON.stringify(response.body)); return response.body.data; };
  const login = (email, staffTarget) => call('/api/auth/login', null, 'POST', { email, password: 'Local@2026', ...(staffTarget ? { mode: 'staff', target: staffTarget } : {}) });
  try {
    const outsider = good(await call('/api/auth/register', null, 'POST', { email: 'external@central-people.fixture.test', name: 'Separate Customer', password: 'PrivateFixture!2026' }));
    const mona = good(await login('mona.adel@orgtik.test'));
    assert.ok(mona.workspaceContext);
    const originalToken = mona.tokens.accessToken;
    const scoped = good(await call('/api/users', originalToken));
    assert.ok(scoped.some(person => person.id === mona.user.id));
    assert.ok(!scoped.some(person => person.id === outsider.user.id));
    assert.equal((await call(`/api/users/${outsider.user.id}`, originalToken)).status, 404);

    const wm = good(await login('mona.adel@orgtik.test', 'wm'));
    assert.equal((await call('/api/users', wm.tokens.accessToken)).status, 403, 'WM identity cannot read the central directory without an admin transition');
    const prepared = good(await call('/api/auth/workspace', wm.tokens.accessToken, 'POST', { mode: 'staff', target: 'admin' }));
    const code = good(await call('/api/auth/handoff', prepared.tokens.accessToken, 'POST', { audience: 'staff:admin' }));
    const exchanged = good(await call('/api/auth/handoff/exchange', null, 'POST', { code: code.code, audience: 'staff:admin' }));
    const token = exchanged.tokens.accessToken;
    const profile = good(await call('/api/auth/me', token));
    assert.equal(profile.workspaceContext, null);
    assert.ok(profile.scopes.some(scope => scope.scope === 'platform_admin'));
    assert.ok(profile.staffAccess.permissions.admin.includes('staff:view'));
    const directory = await call('/api/users?limit=100', token);
    const people = good(directory);
    assert.ok(directory.body.meta.total >= 17, 'the central page receives its expected pagination envelope');
    assert.ok(people.some(person => person.id === outsider.user.id));
    assert.ok(good(await call('/api/users/all', token)).some(person => person.id === outsider.user.id));
    assert.equal(good(await call(`/api/users/${outsider.user.id}`, token)).email, outsider.user.email);
    assert.equal((await call('/api/auth/handoff/exchange', null, 'POST', { code: code.code, audience: 'staff:admin' })).status, 400, 'the central entry code can be used only once');
    assert.ok(good(await call('/api/auth/me', originalToken)).workspaceContext, 'opening administration does not replace or widen the original workspace session');
    assert.ok(!good(await call('/api/users', originalToken)).some(person => person.id === outsider.user.id));

    const finance = good(await login('hany.samir@orgtik.test', 'admin'));
    assert.equal((await call('/api/users', finance.tokens.accessToken)).status, 403);
    assert.equal((await call(`/api/users/${outsider.user.id}`, finance.tokens.accessToken)).status, 404);
    assert.equal((await call('/api/auth/workspace', outsider.tokens.accessToken, 'POST', { mode: 'staff', target: 'admin' })).status, 403);
    const viewer = good(await login('salma.nabil@orgtik.test', 'wm'));
    assert.equal((await call('/api/auth/workspace', viewer.tokens.accessToken, 'POST', { mode: 'staff', target: 'admin' })).status, 403);
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    const relative = path.relative(os.tmpdir(), folder);
    assert.ok(relative.startsWith('orgtik-central-people-') && !relative.includes(path.sep));
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
