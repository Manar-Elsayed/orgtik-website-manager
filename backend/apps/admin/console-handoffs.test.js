const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
test('Console pay links bind native owner invoices and staff invitations apply only after acceptance', { timeout: 90000 }, async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'orgtik-console-handoffs-'));
  Object.assign(process.env, { MOCK_AUTH_FILE: path.join(folder, 'accounts.json'), MOCK_AUTH_STORE: 'file', MOCK_JOURNAL: 'memory', MOCK_SANDBOX: `console-handoffs-${process.pid}`, MOCK_PUBLIC_URL: '', VERCEL: '', KV_REST_API_URL: '', KV_REST_API_TOKEN: '', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', MOCK_CLOCK: 'frozen', MOCK_NOW: '2026-10-07T09:00:00Z' });
  process.argv.push('--only=sos,admin'); const server = http.createServer(require('../../api/index')); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(app, endpoint, token, method = 'GET', body, operationId) {
    const response = await fetch(`${base}/${app}${endpoint}`, { method, signal: AbortSignal.timeout(20000), headers: { connection: 'close', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(operationId ? { 'idempotency-key': operationId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const raw = await response.json(); return { status: response.status, raw, data: raw.data };
  }
  const good = value => { assert.ok(value.status < 300, JSON.stringify(value.raw)); return value.data; };
  try {
    const identities = require('../../lib/identity'), store = () => require('../../apps/admin').getStore();
    const mona = good(await call('sos', '/api/auth/login', null, 'POST', { email: identities.findByKey('admin').email, password: 'Local@2026' }));
    const token = good(await call('sos', '/api/auth/workspace', mona.tokens.accessToken, 'POST', { mode: 'staff', target: 'admin' })).tokens.accessToken;
    const person = identities.findByKey('u9'), invitationBody = { email: person.email, roles: ['support'] }, invitation = good(await call('admin', '/v1/admin/console/staff/invitations', token, 'POST', invitationBody, 'native-staff-invite'));
    assert.equal(store().db.staffRoles[person.key], undefined);
    assert.equal(good(await call('admin', '/v1/admin/console/staff/invitations', token, 'POST', invitationBody, 'native-staff-invite')).id, invitation.id);
    const invitee = good(await call('sos', '/api/auth/login', null, 'POST', { email: person.email, password: 'Local@2026' }));
    assert.equal(good(await call('sos', '/v1/app/staff-invitations', invitee.tokens.accessToken))[0].id, invitation.id);
    const accepted = good(await call('sos', `/v1/app/staff-invitations/${invitation.id}/accept`, invitee.tokens.accessToken, 'POST', {}));
    assert.equal(accepted.state, 'accepted'); assert.equal(accepted.sessionAction, 'signed_out'); assert.deepEqual(store().db.staffRoles[person.key], ['support']);
    assert.equal((await call('sos', '/api/auth/me', invitee.tokens.accessToken)).status, 401);
    const nextLogin = good(await call('sos', '/api/auth/login', null, 'POST', { email: person.email, password: 'Local@2026' }));
    const nextStaff = good(await call('sos', '/api/auth/workspace', nextLogin.tokens.accessToken, 'POST', { mode: 'staff', target: 'admin' }));
    good(await call('admin', '/v1/admin/console/frame', nextStaff.tokens.accessToken));
    const draft = good(await call('admin', '/v1/admin/invoices', token, 'POST', { workspaceId: 'ws_nile', lines: [{ label: 'Native payment link handoff', amount: 50 }] }));
    const invoice = good(await call('admin', `/v1/admin/console/billing/invoices/${draft.id}/action`, token, 'POST', { action: 'issue' }, 'issue-native-owner-invoice'));
    assert.ok(invoice); const workspace = store().workspace(invoice.workspaceId), owner = workspace.members.find(row => row.role === 'owner' && row.status === 'active'), ownerPerson = identities.findByKey(owner.userKey);
    const originalMoney = { total: invoice.total, currency: invoice.currency, number: invoice.number };
    const link = good(await call('admin', '/v1/admin/console/billing/pay-links', token, 'POST', { invoiceId: invoice.id }, 'native-pay-link'));
    assert.equal((await call('sos', `/v1/app/pay-links/${link.id}`, nextLogin.tokens.accessToken)).status, 404);
    const buyer = good(await call('sos', '/api/auth/login', null, 'POST', { email: ownerPerson.email, password: 'Local@2026' }));
    const ownerToken = good(await call('sos', '/api/auth/workspace', buyer.tokens.accessToken, 'POST', { workspaceId: workspace.id, target: 'suite' })).tokens.accessToken;
    const view = good(await call('sos', `/v1/app/pay-links/${link.id}`, ownerToken)); assert.equal(view.invoice.id, invoice.id); assert.equal(view.canPay, true);
    const method = workspace.paymentMethods.find(row => row.kind === 'card' && !row.expired && row.last4 !== '0002'), payment = { paymentMethodId: method.id, operationId: 'native-owner-payment' };
    const paid = good(await call('sos', `/v1/app/pay-links/${link.id}`, ownerToken, 'POST', payment)); assert.equal(paid.paymentStatus, 'succeeded');
    const count = store().db.invoices.find(row => row.id === invoice.id).payments.length;
    assert.deepEqual(good(await call('sos', `/v1/app/pay-links/${link.id}`, ownerToken, 'POST', payment)), paid); assert.equal(store().db.invoices.find(row => row.id === invoice.id).payments.length, count);
    assert.equal((await call('sos', `/v1/app/pay-links/${link.id}`, ownerToken, 'POST', { ...payment, paymentMethodId: 'changed' })).status, 409);
    const current = store().db.invoices.find(row => row.id === invoice.id); assert.deepEqual({ total: current.total, currency: current.currency, number: current.number }, originalMoney);
    assert.equal(good(await call('sos', `/v1/app/pay-links/${link.id}`, ownerToken)).canPay, false);
    good(await call('admin', `/v1/admin/console/billing/pay-links/${link.id}/revoke`, token, 'POST', {}, 'revoke-native-link'));
    assert.equal((await call('sos', `/v1/app/pay-links/${link.id}`, ownerToken)).status, 410);
    const target = good(await call('admin', `/v1/admin/console/workspaces/${workspace.id}/view-as`, token, 'POST', { reason: 'Verify the actual owner handoff' }, 'native-view-as'));
    assert.equal(target.ownerUserId, ownerPerson.id);
    const preview = good(await call('sos', `/api/auth/login-as/${target.ownerUserId}`, token, 'POST', { workspaceId: workspace.id }));
    assert.equal(preview.workspaceContext.actor.readOnly, true); assert.equal(preview.workspaceContext.workspace.id, workspace.id);
    assert.equal((await call('sos', `/v1/app/pay-links/${link.id}`, preview.tokens.accessToken, 'POST', payment)).status, 423);
  } finally { await new Promise(resolve => server.close(resolve)); const resolved = fs.realpathSync(folder); if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('orgtik-console-handoffs-')) throw Error('Unexpected cleanup target.'); fs.rmSync(resolved, { recursive: true, force: true }); }
});
