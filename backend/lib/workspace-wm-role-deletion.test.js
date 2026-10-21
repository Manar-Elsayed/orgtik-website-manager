const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');

test('deleting assigned and built-in WM roles removes only their access and protects Super admin', { timeout: 90000 }, async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-role-removal-'));
  Object.assign(process.env, { MOCK_AUTH_FILE: path.join(folder, 'accounts.json'), MOCK_AUTH_STORE: 'file', MOCK_JOURNAL: 'memory', MOCK_SANDBOX: `wm-role-removal-${process.pid}`, MOCK_PUBLIC_URL: '', VERCEL: '', KV_REST_API_URL: '', KV_REST_API_TOKEN: '', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', MOCK_CLOCK: 'frozen', MOCK_NOW: '2026-10-15T10:00:00Z' });
  process.argv.push('--only=sos,admin,wm');
  const server = http.createServer(require('../api/index')); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = async (route, token, method = 'GET', body, version) => {
    const response = await fetch(origin + route, { method, headers: { connection: 'close', ...(token ? { authorization: 'Bearer ' + token } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...(version ? { 'if-match': version } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000) });
    const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const good = response => { assert.ok(response.status < 300, JSON.stringify(response.body)); return response.body?.data; };
  const login = (email, target = 'wm') => call('/sos/api/auth/login', null, 'POST', { email, password: 'FixturePassword!2026', ...(target ? { mode: 'staff', target } : {}) });
  try {
    const admin = good(await call('/sos/api/auth/login', null, 'POST', { email: 'mona.adel@orgtik.test', password: 'Local@2026', mode: 'staff', target: 'wm' })), token = admin.tokens.accessToken;
    const route = '/wm/v2/admin/roles', usersRoute = '/wm/v2/admin/users';
    const role = good(await call(route, token, 'POST', { label: 'Deletion fixture editor', permissions: ['settings:view', 'content:view', 'content:edit'] }));
    const account = good(await call(usersRoute, token, 'POST', { firstName: 'Role', lastName: 'Removal fixture', email: 'assigned@role-removal.fixture.test', password: 'FixturePassword!2026', roles: ['wm_viewer', role.key], active: true, rolePaused: false }));
    const beforeSession = good(await login(account.email));
    assert.ok(beforeSession.staffAccess.permissions.wm.includes('content:edit'));
    const identity = require('./identity'), platform = require('../apps/admin');
    const globalBefore = structuredClone(identity.grants.global[account.key]);
    const toolsAndBilling = () => structuredClone(platform.exportState().db.workspaces.map(workspace => ({ id: workspace.id, lines: workspace.lines, members: workspace.members.map(member => ({ key: member.userKey, role: member.role, status: member.status, tools: member.tools, toolGrants: member.toolGrants })) })));
    const oldVersion = good(await call(route, token)).find(row => row.key === role.key).version;
    good(await call(usersRoute, token, 'POST', { firstName: 'Second', lastName: 'Removal fixture', email: 'second@role-removal.fixture.test', password: 'FixturePassword!2026', roles: [role.key], active: true, rolePaused: true }));
    assert.equal((await call(route + '/' + role.key, token, 'DELETE', undefined, oldVersion)).status, 412, 'an assignment made after confirmation was opened invalidates deletion');
    const stable = toolsAndBilling(), current = good(await call(route, token)).find(row => row.key === role.key);
    assert.equal(current.assignedCount, 2);
    assert.equal((await call(route + '/' + role.key, token, 'DELETE', undefined, current.version)).status, 204);
    assert.equal((await call('/wm/v2/admin/me', beforeSession.tokens.accessToken)).status, 401, 'old staff authority is revoked immediately');
    const afterSession = good(await login(account.email));
    assert.deepEqual(afterSession.staffAccess.roles.wm, ['wm_viewer']);
    assert.equal(afterSession.staffAccess.permissions.wm.includes('content:edit'), false);
    assert.deepEqual(identity.grants.global[account.key], globalBefore);
    assert.deepEqual(toolsAndBilling(), stable, 'role deletion does not change tool assignments, membership, or billing');
    const second = good(await call(usersRoute + '?pageSize=100', token)).find(user => user.email === 'second@role-removal.fixture.test');
    assert.deepEqual(second.roles, []); assert.equal(second.rolePaused, true); assert.equal(second.active, true);
    assert.equal((await login(second.email)).status, 403);

    const viewer = good(await call(route, token)).find(row => row.key === 'wm_viewer');
    assert.equal((await call(route + '/wm_viewer', token, 'DELETE', undefined, viewer.version)).status, 204);
    assert.equal((await login(account.email)).status, 403, 'removing the last WM role removes WM access');
    assert.equal((await login(account.email, null)).status, 200, 'the central account remains active');
    const retained = good(await call(usersRoute + '?pageSize=100', token)).find(user => user.id === account.id);
    assert.deepEqual(retained.roles, []); assert.equal(retained.active, true);
    assert.equal((await call(usersRoute + '/' + account.id, token, 'PATCH', { roles: ['wm_viewer'] }, retained.version)).status, 422, 'deleted defaults cannot be assigned again');
    const owner = good(await call(route, token)).find(row => row.key === 'wm_owner');
    assert.equal((await call(route + '/wm_owner', token, 'DELETE', undefined, owner.version)).status, 204);
    const superAdmin = good(await call(route, token)).find(row => row.key === 'wm_super_admin');
    assert.ok([403, 409].includes((await call(route + '/wm_super_admin', token, 'DELETE', undefined, superAdmin.version)).status));
    assert.ok(good(await call(route, token)).some(row => row.key === 'wm_super_admin'));
    assert.deepEqual(toolsAndBilling(), stable);
    assert.equal(identity.findUser(account.id).isActive, true);
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    const relative = path.relative(os.tmpdir(), folder); assert.ok(relative.startsWith('wm-role-removal-') && !relative.includes(path.sep));
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
