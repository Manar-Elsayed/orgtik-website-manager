const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');

test('WM account deletion shares suite authority, blocks unsafe deletion, and revokes access without losing history or billing', { timeout: 90000 }, async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-user-removal-'));
  Object.assign(process.env, { MOCK_AUTH_FILE: path.join(folder, 'accounts.json'), MOCK_AUTH_STORE: 'file', MOCK_JOURNAL: 'memory', MOCK_SANDBOX: `wm-user-removal-${process.pid}`, MOCK_PUBLIC_URL: '', VERCEL: '', KV_REST_API_URL: '', KV_REST_API_TOKEN: '', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', MOCK_CLOCK: 'frozen', MOCK_NOW: '2026-10-15T10:00:00Z' });
  process.argv.push('--only=sos,admin,wm');
  const server = http.createServer(require('../api/index'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = async (route, token, method = 'GET', body, version) => {
    const response = await fetch(origin + route, { method, headers: { connection: 'close', ...(token ? { authorization: 'Bearer ' + token } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...(version ? { 'if-match': version } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000) });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const good = response => { assert.ok(response.status < 300, JSON.stringify(response.body)); return response.body?.data; };
  const login = (email, password, target) => call('/sos/api/auth/login', null, 'POST', { email, password, ...(target ? { mode: 'staff', target } : {}) });
  const route = '/wm/v2/admin/users', password = 'FixturePassword!2026';
  try {
    const wmAdmin = good(await login('mona.adel@orgtik.test', 'Local@2026', 'wm')), token = wmAdmin.tokens.accessToken;
    const centralAdmin = good(await login('mona.adel@orgtik.test', 'Local@2026', 'admin'));
    const target = good(await call(route, token, 'POST', { firstName: 'Delete', lastName: 'Fixture', email: 'delete@account-removal.fixture.test', password, roles: ['wm_viewer'] }));
    const staffSession = good(await login(target.email, password, 'wm'));
    const workspaceSession = good(await login(target.email, password));
    assert.ok(workspaceSession.workspaceContext);
    const identity = require('./identity'), S = require('../apps/admin').getStore();
    const find = async id => good(await call(route + '?pageSize=100', token)).find(user => user.id === id);
    const self = await find(wmAdmin.user.id);
    const selfDelete = await call(route + '/' + self.id, token, 'DELETE', undefined, self.version);
    assert.equal(selfDelete.status, 409); assert.equal(selfDelete.body.error.code, 'self_lockout');
    assert.equal((await call(route + '/' + target.id, staffSession.tokens.accessToken, 'DELETE', undefined, target.version)).status, 403);

    const limitedRole = good(await call('/wm/v2/admin/roles', token, 'POST', { label: 'Account deletion permission fixture', permissions: ['settings:view', 'users:view', 'users:manage'] }));
    const limited = good(await call(route, token, 'POST', { firstName: 'Limited', lastName: 'Manager', email: 'limited@account-removal.fixture.test', password, roles: [limitedRole.key] }));
    const limitedSession = good(await login(limited.email, password, 'wm'));
    const denied = await call(route + '/' + target.id, limitedSession.tokens.accessToken, 'DELETE', undefined, target.version);
    assert.equal(denied.status, 403); assert.equal(denied.body.error.code, 'suite_admin_required');

    const owner = good(await call('/sos/api/auth/register', null, 'POST', { email: 'owner@account-removal.fixture.test', name: 'Workspace Owner', password }));
    const ownerRow = await find(owner.user.id);
    const blocked = await call(route + '/' + ownerRow.id, token, 'DELETE', undefined, ownerRow.version);
    assert.equal(blocked.status, 409); assert.equal(blocked.body.error.code, 'ownership_transfer_required');
    assert.equal(identity.findUser(ownerRow.id).deletedAt, undefined);

    const renamed = good(await call(route + '/' + target.id, token, 'PATCH', { lastName: 'Retained history' }, target.version));
    assert.equal((await call(route + '/' + target.id, token, 'DELETE', undefined, target.version)).status, 412);
    const retainBilling = () => structuredClone({ invoices: S.db.invoices, workspaces: S.db.workspaces.map(workspace => ({ id: workspace.id, state: workspace.state, lines: workspace.lines })) });
    const billing = retainBilling();
    const others = () => structuredClone(S.db.workspaces.map(workspace => ({ id: workspace.id, members: workspace.members.filter(member => member.userKey !== target.key) })));
    const otherMembers = others();
    const row = identity.findUser(target.id), beforeName = identity.fullName(row);
    assert.equal((await call(route + '/' + target.id, token, 'DELETE', undefined, renamed.version)).status, 204);
    assert.equal(identity.findUser(target.id), row, 'historical identity references still resolve to the retained record');
    assert.equal(identity.fullName(row), beforeName); assert.ok(row.deletedAt); assert.equal(row.isActive, false);
    assert.ok(Object.values(identity.grants).every(scope => !scope[target.key]), 'all sign-in grants are removed');
    assert.deepEqual(retainBilling(), billing, 'deletion does not remove billed lines, invoices, or workspaces');
    assert.deepEqual(others(), otherMembers, 'other memberships stay unchanged');
    assert.ok(S.db.workspaces.flatMap(workspace => workspace.members).filter(member => member.userKey === target.key).every(member => member.status === 'removed' && Object.values(member.toolGrants || {}).every(grant => !grant.assigned)));
    assert.ok(!(await find(target.id)), 'the account disappears from the WM user directory');
    const centralUsers = good(await call('/sos/api/users?limit=100', centralAdmin.tokens.accessToken));
    assert.ok(!centralUsers.some(user => user.id === target.id), 'the central directory also hides the deleted account');
    assert.equal((await call('/wm/v2/admin/me', staffSession.tokens.accessToken)).status, 401);
    assert.equal((await call('/sos/api/auth/me', workspaceSession.tokens.accessToken)).status, 401);
    assert.equal((await call('/sos/api/auth/refresh', null, 'POST', { refreshToken: staffSession.tokens.refreshToken })).status, 401);
    assert.equal((await call('/sos/api/auth/refresh', null, 'POST', { refreshToken: workspaceSession.tokens.refreshToken })).status, 401);
    assert.ok((await login(target.email, password, 'wm')).status >= 400);
    assert.equal((await call(route + '/' + target.id, token, 'DELETE', undefined, renamed.version)).status, 404);
    const audit = require('../apps/wm').exportState().data.content.audit;
    assert.ok(audit.some(entry => entry.entry === target.key && entry.action === 'user_delete'));
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    const relative = path.relative(os.tmpdir(), folder); assert.ok(relative.startsWith('wm-user-removal-') && !relative.includes(path.sep));
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
