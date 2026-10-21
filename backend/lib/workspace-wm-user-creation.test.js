const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');

test('WM account creation applies selected roles atomically and supports explicit No access without granting membership', { timeout: 60000 }, async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-user-creation-'));
  Object.assign(process.env, {
    MOCK_AUTH_FILE: path.join(folder, 'accounts.json'), MOCK_AUTH_STORE: 'file',
    MOCK_JOURNAL: 'memory', MOCK_SANDBOX: `wm-user-creation-${process.pid}`,
    MOCK_PUBLIC_URL: '', VERCEL: '', KV_REST_API_URL: '', KV_REST_API_TOKEN: '',
    UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '',
    MOCK_CLOCK: 'frozen', MOCK_NOW: '2026-10-15T10:00:00Z',
  });
  process.argv.push('--only=sos,admin,wm');
  const server = http.createServer(require('../api/index'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Native HTTP accepts every OS-selected ephemeral port, including fetch's denylist.
  const call = (route, token, method = 'GET', body, version) => new Promise((resolve, reject) => {
    const req = http.request(origin + route, { method, headers: {
      connection: 'close', ...(token ? { authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}), ...(version ? { 'if-match': version } : {}),
    } }, res => {
      let text = ''; res.setEncoding('utf8'); res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null }));
      res.on('error', reject);
    });
    req.setTimeout(20000, () => req.destroy(new Error('Account creation test request timed out')));
    req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined);
  });
  const good = result => { assert.ok(result.status < 300, JSON.stringify(result.body)); return result.body?.data; };
  const password = 'CreationFixture!2026', route = '/wm/v2/admin/users';
  const login = email => call('/sos/api/auth/login', null, 'POST', { email, password, mode: 'staff', target: 'wm' });
  try {
    const session = good(await call('/sos/api/auth/login', null, 'POST', {
      email: 'mona.adel@orgtik.test', password: 'Local@2026', mode: 'staff', target: 'wm',
    })), token = session.tokens.accessToken;
    const identity = require('./identity'), S = require('../apps/admin').getStore();
    const billing = () => structuredClone({ invoices: S.db.invoices, workspaces: S.db.workspaces.map(row => ({ id: row.id, lines: row.lines })) });
    const beforeBilling = billing(), members = S.workspace('ws_orgtik').members.length;
    const noAccess = good(await call(route, token, 'POST', {
      firstName: 'No', lastName: 'Access', email: 'no-access@creation.fixture.test', password, roles: [],
    }));
    assert.equal(noAccess.active, true, 'No access is separate from account activation');
    assert.deepEqual(noAccess.roles, []);
    assert.equal(identity.grants.website_manager[noAccess.key], undefined);
    assert.ok(!S.db.workspaces.some(workspace => workspace.members.some(member => member.userKey === noAccess.key)));
    assert.equal(S.workspace('ws_orgtik').members.length, members);
    assert.equal((await login(noAccess.email)).status, 403, 'an active No access account cannot sign in to WM');

    const custom = good(await call('/wm/v2/admin/roles', token, 'POST', {
      label: 'Initial access creation fixture', permissions: ['content:view'],
    }));
    const choices = ['wm_viewer', custom.key];
    const assigned = good(await call(route, token, 'POST', {
      firstName: 'Selected', lastName: 'Roles', email: 'selected-roles@creation.fixture.test', password, roles: choices,
    }));
    assert.deepEqual(assigned.roles, choices);
    assert.deepEqual(identity.grants.website_manager[assigned.key].roles, choices);
    const member = S.workspace('ws_orgtik').members.find(row => row.userKey === assigned.key);
    assert.equal(member.status, 'active'); assert.deepEqual(member.tools, []); assert.deepEqual(member.toolGrants, {});
    assert.deepEqual(identity.grants.global[assigned.key].roles, [], 'WM role choices never grant central suite roles');
    const staff = good(await login(assigned.email));
    assert.deepEqual([...staff.staffAccess.roles.wm].sort(), [...choices].sort());
    const listedRoles = good(await call('/wm/v2/admin/roles', token));
    assert.equal(listedRoles.find(row => row.key === custom.key).assignedCount, 1);
    assert.notEqual(listedRoles.find(row => row.key === custom.key).version, custom.version);

    const cleared = good(await call(route + '/' + assigned.id, token, 'PATCH', { roles: [] }, assigned.version));
    assert.deepEqual(cleared.roles, []); assert.equal(cleared.active, true);
    assert.equal((await login(assigned.email)).status, 403);
    assert.equal((await call('/wm/v2/admin/me', staff.tokens.accessToken)).status, 403, 'removing all roles revokes an existing WM session');

    const removedRole = good(await call('/wm/v2/admin/roles', token, 'POST', {
      label: 'Deleted initial role fixture', permissions: ['content:view'],
    }));
    assert.equal((await call('/wm/v2/admin/roles/' + removedRole.key, token, 'DELETE', undefined, removedRole.version)).status, 204);
    const identityCount = identity.users.length, memberCount = S.workspace('ws_orgtik').members.length;
    const invalidEmail = 'deleted-role@creation.fixture.test';
    const invalid = await call(route, token, 'POST', {
      firstName: 'Invalid', lastName: 'Role', email: invalidEmail, password, roles: [removedRole.key],
    });
    assert.equal(invalid.status, 422); assert.equal(invalid.body.error.code, 'invalid_roles');
    assert.equal(identity.users.length, identityCount);
    assert.ok(!identity.users.some(person => person.email === invalidEmail));
    assert.equal(S.workspace('ws_orgtik').members.length, memberCount, 'a stale deleted role cannot partially create membership');
    assert.deepEqual(billing(), beforeBilling, 'role choices do not alter billing or tool subscriptions');
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    const relative = path.relative(os.tmpdir(), folder);
    assert.ok(relative.startsWith('wm-user-creation-') && !relative.includes(path.sep));
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
