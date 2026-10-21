const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

test('WM CRM action resolves retained lead references and contacts fallback under current CRM access', { timeout: 90000 }, async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-crm-target-'));
  Object.assign(process.env, { MOCK_AUTH_FILE: path.join(folder, 'accounts.json'), MOCK_AUTH_STORE: 'file', MOCK_JOURNAL: 'memory', MOCK_SANDBOX: `wm-crm-target-${process.pid}`, MOCK_PUBLIC_URL: '', VERCEL: '', KV_REST_API_URL: '', KV_REST_API_TOKEN: '', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', MOCK_CLOCK: 'frozen', MOCK_NOW: '2026-10-07T09:00:00Z' });
  process.argv.push('--only=sos,admin,sales,wm');
  const server = http.createServer(require('../api/index'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(app, route, token, method = 'GET', body) {
    const response = await fetch(`${base}/${app}${route}`, { method, signal: AbortSignal.timeout(20000), headers: { connection: 'close', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const json = await response.json();
    return { status: response.status, data: json.data, code: json.code || json.error?.code };
  }
  const good = response => { assert.ok(response.status < 300, `${response.status}: ${response.code}`); return response.data; };
  try {
    const staff = good(await call('sos', '/api/auth/login', null, 'POST', { email: 'mona.adel@orgtik.test', password: 'Local@2026', mode: 'staff', target: 'wm' }));
    const token = staff.tokens.accessToken;
    const target = id => call('wm', '/v2/admin/studio/lead-target/' + id, token);
    const sample = good(await target('ld_01'));
    assert.equal(sample.canOpen, true);
    assert.equal(sample.destination, 'list');
    assert.equal(sample.path, '/customers');
    assert.equal(sample.reason, 'crm_delivery_pending');
    assert.equal(new URL(sample.url).searchParams.get('workspaceId'), 'ws_orgtik');
    assert.equal(new URL(sample.url).searchParams.get('redirect'), '/customers');
    assert.equal((await target('not-a-lead')).status, 404);
    assert.equal((await call('wm', '/v2/admin/studio/lead-target/ld_01')).status, 401);
    good(await call('wm', '/v2/__mock/forms-live', token, 'POST', {}));
    const site = good(await call('wm', '/v2/public/site'));
    const submission = good(await call('wm', '/v2/public/leads', null, 'POST', { name: 'CRM Link Fixture', email: 'crm-link@fixture.test', message: 'Open the related CRM contact.', consent: true, privacyVersion: site.forms.privacyVersion }));
    assert.equal(submission.sales.state, 'sent');
    const linked = good(await target(submission.id));
    assert.equal(linked.canOpen, true);
    assert.equal(linked.destination, 'record');
    assert.equal(linked.path, '/customers/' + submission.sales.leadId);
    assert.equal(new URL(linked.url).searchParams.get('redirect'), linked.path);
    const ignoredQuery = good(await call('wm', '/v2/admin/studio/lead-target/' + submission.id + '?leadId=unrelated&workspaceId=foreign&redirect=https://example.invalid', token));
    assert.equal(ignoredQuery.path, linked.path);
    assert.equal(ignoredQuery.workspaceId, 'ws_orgtik');
    // The same staff session can perform the normal workspace + one-use SSO handoff.
    const workspace = good(await call('sos', '/api/auth/workspace', token, 'POST', { workspaceId: linked.workspaceId, mode: 'workspace' }));
    const handoff = good(await call('sos', '/api/auth/handoff', workspace.tokens.accessToken, 'POST', { audience: 'suite' }));
    const exchanged = good(await call('sos', '/api/auth/handoff/exchange', null, 'POST', { code: handoff.code, audience: 'suite' }));
    const reused = await call('sos', '/api/auth/handoff/exchange', null, 'POST', { code: handoff.code, audience: 'suite' });
    assert.equal(reused.status, 400);
    assert.equal(reused.code, 'handoff_expired');
    const sales = good(await call('sos', '/api/auth/workspace', exchanged.tokens.accessToken, 'POST', { workspaceId: 'ws_orgtik', target: 'sales' }));
    const contact = good(await call('sales', '/api/customers/' + submission.sales.leadId, sales.tokens.accessToken));
    assert.equal(contact.email, 'crm-link@fixture.test');
    const wm = require('../apps/wm'), before = wm.exportState();
    const missing = structuredClone(before);
    missing.data.ops.leads.find(([id]) => id === submission.id)[1].handoff.leadId = 'missing-crm-contact';
    wm.importState(missing);
    const fallback = good(await target(submission.id));
    assert.equal(fallback.canOpen, true);
    assert.equal(fallback.destination, 'list');
    assert.equal(fallback.path, '/customers');
    assert.equal(fallback.reason, 'crm_record_unavailable');
    wm.importState(before);
    const platform = require('../apps/admin'), snapshot = platform.exportState();
    const withoutCrm = structuredClone(snapshot), member = withoutCrm.db.workspaces.find(row => row.id === 'ws_orgtik').members.find(row => row.userKey === 'admin');
    member.toolGrants.crm.assigned = false;
    platform.importState(withoutCrm);
    const denied = good(await target(submission.id));
    assert.equal(denied.canOpen, false);
    assert.equal(denied.reason, 'crm_read_access_required');
    assert.equal(denied.url, null);
    const readOnly = structuredClone(snapshot);
    readOnly.db.workspaces.find(row => row.id === 'ws_orgtik').members.find(row => row.userKey === 'admin').toolGrants.crm.roles = ['viewer'];
    platform.importState(readOnly);
    assert.equal(good(await target(submission.id)).canOpen, true, 'read-only CRM members can open the contact');
    platform.importState(snapshot);
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    const resolved = fs.realpathSync(folder), parent = fs.realpathSync(os.tmpdir()) + path.sep;
    assert.ok(resolved.startsWith(parent) && path.basename(resolved).startsWith('wm-crm-target-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
