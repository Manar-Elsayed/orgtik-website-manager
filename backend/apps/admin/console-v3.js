const crypto = require('node:crypto');
const { preferences, savePreferences } = require('../../lib/workspace-suite');
const { DEFINITIONS } = require('../../lib/connectors');
const clone = value => JSON.parse(JSON.stringify(value));
const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const hash = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');

function create({ getStore, identity, principal, applyDb, afterStaffAcceptance }) {
  const S = () => getStore();
  function authority(permission, write = false) {
    const p = principal(), rights = p?.context.staffAccess?.permissions.admin || [];
    if (!p || p.claims.mode !== 'staff' || p.claims.aud !== 'staff:admin' || !rights.includes(permission) && !(permission.endsWith(':edit') && rights.includes(permission.replace(':edit', ':full')))) throw fail(403, 'staff_permission_required', 'Your current staff role cannot use this Console action.');
    if (write && p.readOnly) throw fail(423, 'view_as_read_only', 'View-as is read-only.');
    return p;
  }
  function personalAuthority(write = false) {
    const p = principal();
    if (!p || p.claims.mode !== 'staff' || p.claims.aud !== 'staff:admin' || !p.context.staffAccess?.apps.includes('admin')) throw fail(403, 'staff_permission_required', 'Open Console with your current staff account.');
    if (write && p.readOnly) throw fail(423, 'view_as_read_only', 'View-as is read-only.');
    return p;
  }
  const state = () => S().db.consoleV3 || { version: 1, readMarks: {}, security: {}, releases: [], invitations: [], documents: {}, series: {}, manualRetryPauses: {}, taxChecks: [], payLinks: [], ticketSLAs: {} };
  function mutable() {
    S().db.consoleV3 ??= clone(state());
    if (S().db.consoleV3.version !== 1) throw fail(503, 'console_state_unavailable', 'Console configuration could not be loaded.');
    return S().db.consoleV3;
  }
  function recorded(req, permission, action) {
    const p = authority(permission, true), operationId = req.get('idempotency-key');
    if (!/^[\w.:-]{1,200}$/.test(operationId || '')) throw fail(422, 'operation_id_required', 'Use the original action reference.');
    const data = mutable(); data.operations ??= {};
    const key = `${p.actor.id}:${operationId}`, fingerprint = hash({ path: req.path, body: req.body });
    const prior = data.operations[key];
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw fail(409, 'operation_conflict', 'This reference belongs to a different action.');
      return clone(prior.result);
    }
    const beforeMRR = metricValues().mrrUsd, result = action(p, data), delta = S().pricing.toDecimals(metricValues().mrrUsd - beforeMRR, 2);
    if (delta) { const current = mutable(); current.movements ??= []; current.movements.push({ id: S().id('mrr'), at: at(), workspaceId: result.workspaceId || req.params.id, kind: delta > 0 ? 'expansion' : 'contraction', amountUsd: delta, operationId, by: p.actor.id }); }
    mutable().operations[key] = { fingerprint, result: clone(result) };
    return result;
  }
  function actor() { return identity.findUser(principal()?.user.id); }
  const at = () => S().iso(S().now());
  const log = (p, action, target, details = {}) => S().log(p.actor.key, action, String(target), details);
  const native = (selection, p, req, workspace, body = req.body) => require('./console-native-actions').invoke(S(), identity, selection, { method: 'POST', path: req.path, params: req.params, body, query: {}, get: name => req.get(name), p: { user: identity.findUser(p.user.id), key: p.actor.key, ws: workspace }, who: { user: identity.findUser(p.user.id), key: p.actor.key, permissions: p.context.staffAccess?.permissions.admin || [] } });
  function search(query) {
    const p = authority('overview:view'), rights = p.context.staffAccess.permissions.admin, rows = [];
    const push = (permission, type, values, label, path) => {
      if (!rights.includes(permission)) return;
      for (const row of values) rows.push({ id: `console:${type}:${row.id || row.key}`, tool: 'admin', title: label(row), path: path(row) });
    };
    push('workspaces:view', 'workspace', S().db.workspaces.filter(row => row.state !== 'deleted'), row => row.name, row => `/workspaces/${encodeURIComponent(row.id)}`);
    push('tools:view', 'tool', S().db.tools, row => row.name.en, row => `/tools/${encodeURIComponent(row.key)}`);
    push('plans:view', 'plan', S().db.plans.filter(row => row.tool), row => row.name.en, row => `/plans/${encodeURIComponent(row.id)}`);
    push('billing:view', 'invoice', S().db.invoices, row => `${row.number} · ${S().workspace(row.workspaceId)?.name || ''}`, row => `/invoices/${encodeURIComponent(row.id)}`);
    push('tickets:view', 'ticket', S().db.tickets, row => `${row.number} · ${row.subject}`, row => `/tickets/${encodeURIComponent(row.id)}`);
    if (query.length > 200) throw fail(422, 'invalid_query', 'Use a shorter search.');
    return query ? rows.filter(row => row.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 50) : [];
  }
  function notifications() {
    const p = authority('overview:view'), rights = p.context.staffAccess.permissions.admin, marks = state().readMarks[p.user.id] || [], rows = [];
    if (rights.includes('billing:view')) for (const invoice of S().db.invoices.filter(row => row.state === 'past_due')) rows.push({ id: `billing:${invoice.id}`, tool: 'admin', category: 'billing', title: `${invoice.number} · ${S().workspace(invoice.workspaceId)?.name || ''}`, path: `/invoices/${encodeURIComponent(invoice.id)}`, at: invoice.dueAt || invoice.issuedAt });
    if (rights.includes('tickets:view')) for (const ticket of S().db.tickets.filter(row => row.state === 'open')) rows.push({ id: `support:${ticket.id}`, tool: 'admin', title: `${ticket.number} · ${ticket.subject}`, path: `/tickets/${encodeURIComponent(ticket.id)}`, at: ticket.createdAt });
    const prefs = preferences(actor()).notificationPreferences || {};
    return prefs.inApp === false ? [] : rows.filter(row => !row.category || prefs[row.category] !== false).map(row => ({ ...row, read: marks.includes(row.id) })).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 100);
  }
  function metricValues() {
    const current = S(), workspaces = current.db.workspaces.filter(row => !['deleted', 'cancelled'].includes(row.state)), paying = line => ['active', 'cancelling', 'past_due', 'read_only'].includes(line.state);
    const mrr = workspace => workspace.lines.filter(line => paying(line) && current.db.plans.some(plan => plan.id === line.planId && plan.tool)).reduce((sum, line) => sum + current.pricing.monthlyAmount(line) / current.usdRate(line.snapshot.currency || workspace.currency), 0);
    const cohorts = new Map();
    for (const workspace of current.db.workspaces.filter(row => row.state !== 'deleted')) {
      const month = String(workspace.createdAt).slice(0, 7), cohort = cohorts.get(month) || { month, workspaces: 0, paying: 0, mrrUsd: 0 };
      cohort.workspaces++; if (mrr(workspace) > 0 && workspace.state !== 'cancelled') cohort.paying++; cohort.mrrUsd += workspace.state === 'cancelled' ? 0 : mrr(workspace); cohorts.set(month, cohort);
    }
    return { mrrUsd: workspaces.reduce((sum, workspace) => sum + mrr(workspace), 0), activeWorkspaces: workspaces.length, trials: workspaces.reduce((sum, workspace) => sum + workspace.lines.filter(line => line.state === 'trialing').length, 0), activation: { activated: workspaces.filter(workspace => workspace.lines.some(line => line.tool !== 'general' && ['active', 'trialing', 'free'].includes(line.state))).length, eligible: workspaces.length }, cohorts: [...cohorts.values()].sort((a, b) => a.month.localeCompare(b.month)), movements: clone(state().movements || []), definitions: { currency: 'USD', conversion: 'current platform reporting rate', mrr: 'Current recurring tool lines; services excluded. Website term lines use the native monthlyAmount function.', cohorts: 'Workspace creation month and current paying state; no invented historic retention periods.' } };
  }
  function metrics() { authority('reports:view'); return metricValues(); }
  function recoverInvoice(req, p, invoice, paymentMethodId) {
    const workspace = S().workspace(invoice.workspaceId), method = workspace?.paymentMethods.find(row => row.id === paymentMethodId && !row.expired);
    if (!method) throw fail(422, 'payment_method_required', 'Choose a current saved payment method.');
    const cycle = Object.values(S().db.billingLifecycle?.cycles || {}).find(row => row.invoiceId === invoice.id && row.workspaceId === workspace.id);
    if (cycle) {
      if (typeof applyDb !== 'function') throw fail(503, 'billing_adapter_unavailable', 'The canonical billing adapter is unavailable.');
      const value = require('../../lib/workspace-billing-lifecycle').executeBillingCommand({ db: S().db, command: { kind: 'billing.recover', workspaceId: workspace.id, lineId: cycle.lineId, paymentMethodId, operationId: req.get('idempotency-key') || req.body.operationId, at: at() }, authority: { kind: 'user', workspaceId: workspace.id, userId: p.user.id, canManageBilling: true, readOnly: p.readOnly } });
      applyDb(value.db); return value.result;
    }
    const result = native('POST /v1/admin/invoices/:id/:action(void|mark-paid|refund|retry|issue)', p, { path: req.path, params: { id: invoice.id, action: 'retry' }, get: name => req.get(name) }, workspace, { simulate: method.last4 === '0002' ? 'fail' : 'success' });
    return { workspaceId: workspace.id, invoiceId: result.id, paymentStatus: result.state === 'paid' ? 'succeeded' : 'failed', state: result.state };
  }
  function routes(app, prefix = '/v1/admin/console') {
    const read = fn => (req, res, next) => { try { Promise.resolve(fn(req)).then(data => res.set('Cache-Control', 'private, no-store').json({ data, meta: {} }), next); } catch (error) { next(error); } };
    app.get(prefix + '/frame', read(() => {
      const p = personalAuthority();
      return { staff: { id: p.user.id, name: identity.fullName(p.user) }, preferences: preferences(actor()), now: at(), scope: 'staff:admin' };
    }));
    app.patch(prefix + '/preferences', read(req => { personalAuthority(true); return savePreferences(actor(), req.body); }));
    app.get(prefix + '/search', read(req => search(String(req.query.q || '').trim())));
    app.get(prefix + '/notifications', read(notifications));
    app.post(prefix + '/notifications/read', read(req => {
      const p = authority('overview:view', true), visible = notifications(), ids = req.body.all === true ? visible.map(row => row.id) : req.body.ids;
      if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => !visible.some(row => row.id === id))) throw fail(422, 'invalid_notifications', 'Choose your current notices.');
      mutable().readMarks[p.user.id] = [...new Set([...(state().readMarks[p.user.id] || []), ...ids])].slice(-1000);
      return notifications();
    }));
    app.get(prefix + '/metrics', read(metrics));
    app.get(prefix + '/exports/:kind', read(req => {
      const choices = { invoices: 'billing:view', accounting: 'billing:view', workspaces: 'workspaces:view', audit: 'settings:view', cohorts: 'reports:view' }, permission = choices[req.params.kind];
      if (!permission) throw fail(404, 'export_not_found', 'Choose a supported export.');
      authority(permission);
      let rows;
      if (req.params.kind === 'invoices') rows = S().db.invoices.map(row => ({ id: row.id, number: row.number, workspaceId: row.workspaceId, state: row.state, currency: row.currency, subtotal: row.subtotal, tax: row.tax, total: row.total, refunded: row.refunded, issuedAt: row.issuedAt }));
      else if (req.params.kind === 'accounting') rows = S().db.invoices.flatMap(invoice => [...invoice.payments.map(row => ({ invoice: invoice.number, workspaceId: invoice.workspaceId, kind: 'payment', id: row.id, currency: invoice.currency, amount: row.amount, state: row.status, at: row.at })), ...invoice.creditNotes.map(row => ({ invoice: invoice.number, workspaceId: invoice.workspaceId, kind: 'credit_note', id: row.id, currency: invoice.currency, amount: row.amount, state: invoice.state, at: row.at }))]);
      else if (req.params.kind === 'workspaces') rows = S().db.workspaces.filter(row => row.state !== 'deleted').map(row => ({ id: row.id, name: row.name, state: row.state, country: row.country, currency: row.currency, createdAt: row.createdAt }));
      else if (req.params.kind === 'audit') rows = S().db.audit.map(row => ({ at: row.at, by: row.by, action: row.action, target: row.target, details: JSON.stringify(row.details || {}) }));
      else rows = metrics().cohorts;
      const columns = Object.keys(rows[0] || { id: '' }), cell = value => { const text = String(value ?? ''); return `"${(/^[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`; };
      return { filename: `OrgTik-${req.params.kind}-${at().slice(0, 10)}.csv`, mimetype: 'text/csv;charset=utf-8', content: '\uFEFF' + [columns.map(cell).join(','), ...rows.map(row => columns.map(column => cell(row[column])).join(','))].join('\r\n'), rows: rows.length };
    }));
    app.get(prefix + '/workspaces/:id/lines', read(req => {
      authority('billing:view'); const workspace = S().workspace(req.params.id);
      if (!workspace || workspace.state === 'deleted') throw fail(404, 'workspace_not_found', 'Choose a current workspace.');
      return { workspaceId: workspace.id, lines: workspace.lines.map(line => ({ ...clone(line), toolName: clone(S().db.tools.find(tool => tool.key === line.tool)?.name || { en: line.tool }), planName: clone(S().db.plans.find(plan => plan.id === line.planId)?.name || { en: line.planId }) })), plans: S().db.plans.filter(plan => plan.tool && plan.status === 'active' && (plan.visibility !== 'private' || plan.allowedWorkspaceIds?.includes(workspace.id))).map(plan => ({ id: plan.id, tool: plan.tool, name: plan.name, perUser: plan.perUser })), paymentMethods: clone(workspace.paymentMethods.filter(method => !method.expired)) };
    }));
    app.post(prefix + '/workspaces/:id/view-as', read(req => recorded(req, 'workspaces:edit', p => {
      const workspace = S().workspace(req.params.id), owner = workspace?.members.find(member => member.role === 'owner' && member.status === 'active'), person = owner && identity.users.find(user => user.key === owner.userKey || user.email === owner.email);
      if (!workspace || workspace.state === 'deleted' || !person || !person.isActive || typeof req.body.reason !== 'string' || !req.body.reason.trim() || req.body.reason.length > 1000) throw fail(422, 'view_as_owner_required', 'Choose a current workspace owner and enter the audit reason.');
      log(p, 'view_as_requested', workspace.id, { reason: req.body.reason, ownerUserId: person.id }); return { workspaceId: workspace.id, ownerUserId: person.id, as: person.email, readOnly: true };
    })));
    for (const action of ['preview', 'confirm', 'downgrade']) app.post(prefix + '/workspaces/:id/lines/:lineId/' + action, read(req => {
      authority('billing:edit', true); const workspace = S().workspace(req.params.id), line = workspace?.lines.find(row => row.id === req.params.lineId), body = req.body;
      if (!workspace || !line || !S().db.plans.some(plan => plan.id === body.planId && plan.tool === line.tool) || !['monthly', 'yearly'].includes(body.cycle) || !Number.isSafeInteger(body.seats) || body.seats < 1 || typeof body.reason !== 'string' || !body.reason.trim()) throw fail(422, 'invalid_line_selection', 'Choose an actual line, its tool plan, cycle, whole capacity and audit reason.');
      if (workspace.state === 'suspended' || workspace.state === 'deleted' || line.custodyReadOnly) throw fail(423, 'workspace_read_only', 'Review this workspace before changing its subscription.');
      if (Object.keys(body).some(key => !['planId', 'cycle', 'seats', 'reason', 'quoteId', 'paymentMethodId'].includes(key)) || action === 'confirm' && !body.quoteId) throw fail(422, 'quote_required', 'Confirm the original server quote without client prices.');
      return recorded(req, 'billing:edit', p => {
        if (action === 'downgrade') {
          if (body.cycle !== line.cycle || body.seats !== line.snapshot.quantity) throw fail(422, 'downgrade_selection_required', 'Schedule a lower plan with the current cycle and capacity.');
          const result = native('POST /v1/app/subscriptions/:id/:action(cancel|resume|downgrade|cancel-downgrade|retry)', p, { path: req.path, params: { id: line.id, action: 'downgrade' }, get: name => req.get(name) }, workspace, { planId: body.planId });
          log(p, 'console_line_downgrade', workspace.id, { lineId: line.id, reason: body.reason }); return result;
        }
        const items = [{ planId: body.planId, cycle: body.cycle, seats: body.seats }], input = { items, intent: 'switch', ...(action === 'confirm' ? { quoteId: body.quoteId, paymentMethodId: body.paymentMethodId } : {}) };
        if (action === 'confirm') { const held = S().db.checkoutQuotes?.find(row => row.id === body.quoteId); if (!held || held.workspaceId !== workspace.id || held.snapshot.lines.length !== 1 || held.snapshot.lines[0].replaces !== line.id) throw fail(409, 'line_quote_changed', 'Review the original quote for this exact subscription line.'); }
        const result = native(`POST /v1/app/checkout/${action}`, p, req, workspace, input); log(p, `console_line_${action}`, workspace.id, { lineId: line.id, reason: body.reason }); return result;
      });
    }));
    app.post(prefix + '/billing/invoices/:id/action', read(req => {
      authority('billing:edit', true); const invoice = S().db.invoices.find(row => row.id === req.params.id), action = req.body.action;
      if (!invoice || !['retry', 'mark-paid', 'refund', 'void', 'issue'].includes(action)) throw fail(422, 'invalid_invoice_action', 'Choose a current invoice action.');
      if (action === 'retry' && state().manualRetryPauses[invoice.id]) throw fail(409, 'manual_retry_paused', 'Resume staff retry attempts before trying this invoice.');
      if (['mark-paid', 'void'].includes(action) && Object.values(S().db.billingLifecycle?.cycles || {}).some(row => row.invoiceId === invoice.id)) throw fail(409, 'canonical_recovery_required', 'Use a saved payment method to recover this canonical subscription invoice.');
      return recorded(req, 'billing:edit', p => { if (action === 'retry') return recoverInvoice(req, p, invoice, req.body.paymentMethodId); const params = { id: invoice.id, action }, body = { ...req.body }; delete body.action; return native('POST /v1/admin/invoices/:id/:action(void|mark-paid|refund|retry|issue)', p, { ...req, path: req.path, params, get: name => req.get(name) }, S().workspace(invoice.workspaceId), body); });
    }));
    app.post(prefix + '/billing/pay-links', read(req => recorded(req, 'billing:edit', (p, data) => {
      const invoice = S().db.invoices.find(row => row.id === req.body.invoiceId && ['open', 'past_due'].includes(row.state)), workspace = invoice && S().workspace(invoice.workspaceId);
      if (!invoice || !workspace) throw fail(422, 'unpaid_invoice_required', 'Choose an actual unpaid invoice.');
      const row = { id: S().id('paylink'), invoiceId: invoice.id, workspaceId: workspace.id, createdAt: at(), expiresAt: S().iso(S().now() + 7 * 86400000), state: 'active', by: p.actor.id };
      row.path = `/billing/pay/${encodeURIComponent(row.id)}`; data.payLinks.push(row); log(p, 'pay_link_created', invoice.id, { linkId: row.id }); return clone(row);
    })));
    app.post(prefix + '/billing/pay-links/:id/revoke', read(req => recorded(req, 'billing:edit', (p, data) => {
      const row = data.payLinks.find(link => link.id === req.params.id); if (!row) throw fail(404, 'pay_link_not_found', 'This pay link was not found.'); row.state = 'revoked'; log(p, 'pay_link_revoked', row.invoiceId); return clone(row);
    })));
    function ownerPayLink(req, write = false) {
      const p = principal(), context = p?.context.workspaceContext;
      const direct = req.params.id.startsWith('invoice:') ? S().db.invoices.find(row => row.id === req.params.id.slice(8) && row.workspaceId === context?.workspace.id) : null;
      const link = direct ? { id: req.params.id, invoiceId: direct.id, workspaceId: direct.workspaceId, state: 'active', expiresAt: null, scope: 'owner_invoice', path: `/billing/pay/${encodeURIComponent(req.params.id)}` } : state().payLinks.find(row => row.id === req.params.id);
      const invoice = link && S().db.invoices.find(row => row.id === link.invoiceId);
      if (!context || context.member.role !== 'owner' || !link || !invoice || context.workspace.id !== link.workspaceId) throw fail(404, 'pay_link_not_found', 'Open this link as the current workspace owner.');
      if (write && (p.readOnly || S().workspace(link.workspaceId).state === 'suspended')) throw fail(423, 'workspace_read_only', 'Review this workspace before payment.');
      if (link.state !== 'active' || Date.parse(link.expiresAt) <= S().now()) throw fail(410, 'pay_link_expired', 'Ask for a new current payment link.');
      return { p, link, invoice };
    }
    app.get('/v1/app/pay-links/:id', read(req => {
      const { p, link, invoice } = ownerPayLink(req); return { ...clone(link), canPay: !p.readOnly && S().workspace(link.workspaceId).state !== 'suspended' && ['open', 'past_due'].includes(invoice.state), invoice: { id: invoice.id, number: invoice.number, state: invoice.state, total: invoice.total, currency: invoice.currency }, paymentMethods: S().workspace(link.workspaceId).paymentMethods.filter(row => !row.expired).map(row => ({ id: row.id, kind: row.kind, last4: row.last4 })) };
    }));
    app.post('/v1/app/pay-links/:id', read(req => {
      const { p, link, invoice } = ownerPayLink(req, true), operationId = req.get('idempotency-key') || req.body.operationId;
      if (!/^[\w.:-]{1,200}$/.test(operationId || '') || Object.keys(req.body || {}).some(key => !['paymentMethodId', 'operationId'].includes(key))) throw fail(422, 'payment_selection_required', 'Use the original payment reference and a saved method.');
      const key = `${p.user.id}:pay-link:${operationId}`, data = mutable(), fingerprint = hash({ path: req.path, body: req.body }); data.operations ??= {}; const prior = data.operations[key];
      if (prior) { if (prior.fingerprint !== fingerprint) throw fail(409, 'operation_conflict', 'Retry the original payment unchanged.'); return clone(prior.result); }
      if (!['open', 'past_due'].includes(invoice.state)) throw fail(409, 'invoice_settled', 'This invoice is already settled.');
      const result = recoverInvoice(req, p, invoice, req.body.paymentMethodId); mutable().operations[key] = { fingerprint, result: clone(result) }; log(p, 'pay_link_attempt', invoice.id, { linkId: link.id, paymentStatus: result.paymentStatus }); return result;
    }));
    app.get(prefix + '/staff/invitations', read(() => { authority('staff:view'); return clone(state().invitations); }));
    app.post(prefix + '/staff/invitations', read(req => recorded(req, 'staff:full', (p, data) => {
      const recipient = identity.users.find(row => row.email.toLowerCase() === String(req.body.email || '').trim().toLowerCase()), roles = req.body.roles, allowed = require('./permissions').ROLE_KEYS;
      if (!recipient || recipient.userType === 'customer' || !Array.isArray(roles) || !roles.length || roles.some(role => !allowed.includes(role))) throw fail(422, 'staff_recipient_required', 'Choose a registered OrgTik staff person and supported roles.');
      const prior = data.invitations.find(row => row.userId === recipient.id && row.state === 'pending'); if (prior) throw fail(409, 'invitation_pending', 'Review the existing invitation first.');
      const row = { id: S().id('staffinvite'), userId: recipient.id, email: recipient.email, name: identity.fullName(recipient), roles: [...new Set(roles)], state: 'pending', createdAt: at(), expiresAt: S().iso(S().now() + 7 * 86400000), invitedBy: p.user.id, path: '/staff-invitations' };
      data.invitations.push(row); S().db.mailbox.push({ id: S().id('mail'), kind: 'staff_invitation', to: recipient.email, at: at(), invitationId: row.id, delivery: 'mock' }); log(p, 'staff_invited', recipient.id, { invitationId: row.id }); return clone(row);
    })));
    app.post(prefix + '/staff/invitations/:id/cancel', read(req => recorded(req, 'staff:full', (p, data) => {
      const row = data.invitations.find(item => item.id === req.params.id); if (!row || row.state !== 'pending') throw fail(409, 'invitation_not_pending', 'Choose a pending invitation.'); row.state = 'cancelled'; log(p, 'staff_invitation_cancelled', row.userId); return clone(row);
    })));
    app.get('/v1/app/staff-invitations', read(() => {
      const p = principal(); if (!p) throw fail(401, 'session_required', 'Sign in again.'); return clone(state().invitations.filter(row => row.userId === p.user.id));
    }));
    app.post('/v1/app/staff-invitations/:id/accept', read(async req => {
      const p = principal(), row = state().invitations.find(item => item.id === req.params.id && item.userId === p?.user.id), person = p && identity.findUser(p.user.id), inviter = row && identity.findUser(row.invitedBy);
      if (!row || !person || person.userType === 'customer' || !inviter || !require('./permissions').permissionsFor(S().db.staffRoles[inviter.key] || []).includes('staff:full')) throw fail(404, 'staff_invitation_not_found', 'This current invitation is unavailable.');
      if (p.readOnly) throw fail(423, 'view_as_read_only', 'View-as cannot accept invitations.');
      if (row.state === 'accepted') return clone(row);
      if (row.state !== 'pending' || Date.parse(row.expiresAt) <= S().now()) throw fail(410, 'staff_invitation_expired', 'Ask for a current invitation.');
      if (typeof afterStaffAcceptance !== 'function') throw fail(503, 'staff_acceptance_unavailable', 'The current session must finish before new staff access can be used.');
      const current = mutable().invitations.find(item => item.id === row.id); S().db.staffRoles[person.key] = [...new Set([...(S().db.staffRoles[person.key] || []), ...row.roles])]; Object.assign(current, { state: 'accepted', acceptedAt: at() }); log(p, 'staff_invitation_accepted', person.id, { invitationId: row.id });
      return { ...clone(current), ...await afterStaffAcceptance(req) };
    }));
    app.get(prefix + '/tickets/sla', read(() => {
      authority('tickets:view'); return S().db.tickets.map(ticket => {
        const policy = state().ticketSLAs[ticket.id], first = ticket.messages.filter(message => message.by === 'staff' && !message.internal).sort((a, b) => a.at.localeCompare(b.at))[0];
        const dueAt = policy ? S().iso(Date.parse(ticket.createdAt) + policy.minutes * 60000) : null;
        return { ticketId: ticket.id, number: ticket.number, subject: ticket.subject, state: ticket.state, policy: policy || null, dueAt, firstResponseAt: first?.at || null, breached: Boolean(dueAt && (first ? Date.parse(first.at) : S().now()) > Date.parse(dueAt)), path: `/tickets/${encodeURIComponent(ticket.id)}` };
      });
    }));
    app.post(prefix + '/tickets/:id/sla', read(req => recorded(req, 'tickets:edit', (p, data) => {
      const ticket = S().db.tickets.find(row => row.id === req.params.id), minutes = req.body.minutes;
      if (!ticket || !Number.isSafeInteger(minutes) || minutes < 1 || minutes > 43200) throw fail(422, 'invalid_sla', 'Use an actual ticket and response time from one minute to thirty days.');
      data.ticketSLAs[ticket.id] = { minutes, by: p.actor.id, at: at() }; log(p, 'ticket_sla_configured', ticket.id, { minutes }); return clone(data.ticketSLAs[ticket.id]);
    })));
    app.get(prefix + '/software-catalog', read(() => {
      authority('tools:view');
      return { managedIn: 'console', offers: S().db.websiteOffers.filter(row => row.kind === 'software').map(row => {
        const owner = row.tool ? S().db.tools.find(tool => tool.key === row.tool) : S().db.services.find(service => service.id === row.serviceId);
        return { ...clone(row), name: clone(row.name || owner?.name || {}), description: clone(row.description || {}), capabilities: clone(row.capabilities || {}), toolStatus: owner?.status };
      }), bundles: clone(S().db.websiteOfferBundles.filter(row => row.kind === 'software')) };
    }));
    app.post(prefix + '/software-catalog/:id', read(req => recorded(req, 'tools:edit', (p) => {
      const offer = S().db.websiteOffers.find(row => row.id === req.params.id && row.kind === 'software'), body = req.body;
      if (!offer) throw fail(404, 'software_offer_not_found', 'Choose an actual software offer.');
      if (!body || Object.keys(body).some(key => !['name', 'description', 'capabilities', 'department', 'departmentName', 'icon'].includes(key))) throw fail(422, 'invalid_software_metadata', 'Edit supported software catalog metadata.');
      for (const key of ['name', 'description', 'departmentName']) if (body[key] !== undefined && (!body[key] || ['en', 'ar', 'de', 'fr', 'it'].some(locale => typeof body[key][locale] !== 'string' || !body[key][locale].trim() || body[key][locale].length > 2000))) throw fail(422, 'invalid_catalog_translation', 'Provide each supported catalog translation.');
      if (body.capabilities !== undefined && ['en', 'ar', 'de', 'fr', 'it'].some(locale => !Array.isArray(body.capabilities[locale]) || body.capabilities[locale].length > 20 || body.capabilities[locale].some(value => typeof value !== 'string' || !value.trim() || value.length > 300))) throw fail(422, 'invalid_capabilities', 'Use up to twenty capability lines per language.');
      for (const key of ['department', 'icon']) if (body[key] !== undefined && (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > 100)) throw fail(422, 'invalid_catalog_metadata', 'Use a supported short metadata value.');
      Object.assign(offer, clone(body), { publishedAt: at(), publishedBy: p.actor.key });
      if (body.name && offer.tool) S().db.tools.find(tool => tool.key === offer.tool).name = clone(body.name);
      log(p, 'software_catalog_metadata_published', offer.id, { applyMode: 'new_public_quotes' });
      return clone(offer);
    })));
    app.get(prefix + '/setup', read(() => {
      const p = authority('overview:view'), rights = p.context.staffAccess.permissions.admin;
      const reviews = state().setupReviews?.[p.user.id] || [];
      return [{ id: 'catalog', permission: 'tools:view', path: '/tools', ready: S().db.tools.length > 0 && S().db.plans.some(plan => plan.tool) }, { id: 'pricing', permission: 'pricing:view', path: '/pricing', ready: Object.keys(S().db.currencies).length > 0 && S().db.zones.length > 0 }, { id: 'security', permission: 'overview:view', path: '/staff/security', ready: state().security[p.user.id]?.enabled === true }, { id: 'billing', permission: 'billing:view', path: '/billing', ready: Boolean(S().db.settings.dunning) }].filter(step => rights.includes(step.permission)).map(step => ({ ...step, complete: step.ready && reviews.includes(step.id) }));
    }));
    app.post(prefix + '/setup/review', read(req => recorded(req, 'overview:view', (p, data) => {
      const step = String(req.body.step || ''), permission = { catalog: 'tools:view', pricing: 'pricing:view', security: 'overview:view', billing: 'billing:view' }[step];
      if (!permission) throw fail(422, 'invalid_setup_step', 'Choose a current setup step.');
      authority(permission);
      if (step === 'catalog' && (!S().db.tools.length || !S().db.plans.some(plan => plan.tool)) || step === 'pricing' && (!Object.keys(S().db.currencies).length || !S().db.zones.length) || step === 'billing' && !S().db.settings.dunning) throw fail(409, 'setup_step_pending', 'Finish the current configuration before completing this step.');
      if (step === 'security' && data.security[p.user.id]?.enabled !== true) throw fail(409, 'security_step_pending', 'Enable the displayed mock verification before completing this step.');
      data.setupReviews ??= {}; data.setupReviews[p.user.id] = [...new Set([...(data.setupReviews[p.user.id] || []), step])];
      log(p, 'console_setup_reviewed', step); return { step, complete: true };
    })));
    app.get(prefix + '/ecosystem', read(() => {
      authority('workspaces:view');
      return { managedIn: 'account', connectors: DEFINITIONS.map(definition => ({ ...clone(definition), workspaces: S().db.workspaces.filter(workspace => !['deleted', 'cancelled'].includes(workspace.state) && workspace.lines.some(line => line.tool === definition.source && !['ended', 'deleted'].includes(line.state)) && workspace.lines.some(line => line.tool === definition.target && !['ended', 'deleted'].includes(line.state))).map(workspace => ({ id: workspace.id, name: workspace.name, enabled: workspace.suite?.connectors?.[definition.id] !== false })) })) };
    }));
    app.get(prefix + '/releases', read(() => { authority('tools:view'); return clone(state().releases); }));
    app.post(prefix + '/releases', read(req => recorded(req, 'tools:edit', (p, data) => {
      const tool = S().db.tools.find(row => row.key === req.body.tool);
      if (!tool || !['release', 'changelog', 'announcement'].includes(req.body.kind) || !req.body.title?.trim() || !req.body.body?.trim() || req.body.title.length > 150 || req.body.body.length > 5000) throw fail(422, 'invalid_release', 'Choose an actual tool and enter its publication text.');
      const row = { id: S().id('release'), tool: tool.key, kind: req.body.kind, title: req.body.title.trim(), body: req.body.body.trim(), version: String(req.body.version || '').slice(0, 50), publishedAt: at(), by: p.actor.key, status: tool.status };
      data.releases.unshift(row); log(p, 'tool_publication', tool.key, { releaseId: row.id, kind: row.kind }); return clone(row);
    })));
    app.get(prefix + '/billing', read(() => {
      authority('billing:view');
      return { invoices: S().db.invoices.map(invoice => ({ ...clone(invoice), workspace: S().workspace(invoice.workspaceId)?.name, manualRetryPaused: state().manualRetryPauses[invoice.id] === true })), cardWarnings: S().db.workspaces.flatMap(workspace => (workspace.paymentMethods || []).filter(method => method.kind === 'card' && (method.expired || expirySoon(method.expires, S().now()))).map(method => ({ workspaceId: workspace.id, workspace: workspace.name, id: method.id, last4: method.last4, expires: method.expires, expired: Boolean(method.expired) }))), mailbox: S().db.mailbox.filter(row => /billing|payment|invoice|card|dunning/.test(row.kind || row.template || '')), payLinks: clone(state().payLinks), series: clone(state().series), documents: Object.values(state().documents) };
    }));
    app.post(prefix + '/billing/notice', read(req => recorded(req, 'billing:edit', (p) => {
      const workspace = S().workspace(req.body.workspaceId), invoice = req.body.invoiceId && S().db.invoices.find(row => row.id === req.body.invoiceId && row.workspaceId === workspace?.id);
      if (!workspace || !['dunning', 'card_expiry'].includes(req.body.kind) || req.body.invoiceId && !invoice) throw fail(422, 'invalid_notice', 'Choose an actual workspace and invoice.');
      if (req.body.kind === 'card_expiry' && !(workspace.paymentMethods || []).some(method => method.expired || expirySoon(method.expires, S().now()))) throw fail(409, 'card_notice_not_due', 'No current card expiry warning is due.');
      const id = S().id('console_notice'); S().notifyOwner(workspace, req.body.kind, { title: `${req.body.kind === 'dunning' ? 'Payment reminder' : 'Card expiry reminder'} · ${workspace.name}`, invoiceId: invoice?.id, initiatedBy: p.actor.id }, id);
      log(p, 'billing_mock_notice', workspace.id, { noticeId: id, invoiceId: invoice?.id }); return { id, workspaceId: workspace.id, delivery: 'mock' };
    })));
    app.post(prefix + '/billing/manual-retry', read(req => recorded(req, 'billing:edit', (p, data) => {
      const invoice = S().db.invoices.find(row => row.id === req.body.invoiceId);
      if (!invoice || !['open', 'past_due'].includes(invoice.state) || typeof req.body.paused !== 'boolean') throw fail(422, 'invalid_retry_policy', 'Choose an unpaid invoice and manual retry policy.');
      data.manualRetryPauses[invoice.id] = req.body.paused; log(p, 'manual_retry_policy', invoice.id, { paused: req.body.paused }); return { invoiceId: invoice.id, paused: req.body.paused, scope: 'manual_staff_attempts' };
    })));
    app.get(prefix + '/billing/invoices/:id/document', read(req => {
      authority('billing:view'); const invoice = S().db.invoices.find(row => row.id === req.params.id && row.state !== 'draft');
      if (!invoice) throw fail(404, 'invoice_document_unavailable', 'Issue this actual invoice before opening its document.');
      return clone(state().documents[invoice.id] || { invoiceId: invoice.id, number: invoice.number, invoice, workspace: S().workspace(invoice.workspaceId)?.name, issuedAt: invoice.issuedAt, prototype: true, regulatorySubmission: 'not_submitted' });
    }));
    app.post(prefix + '/billing/series', read(req => recorded(req, 'billing:edit', (p, data) => {
      const entity = String(req.body.entity || '').toUpperCase(), prefix = String(req.body.prefix || '').trim();
      if (!S().db.countries[entity] || !/^[A-Za-z0-9-]{1,30}$/.test(prefix) || !Number.isSafeInteger(req.body.nextNumber) || req.body.nextNumber < 1 || req.body.nextNumber > 999999999) throw fail(422, 'invalid_series', 'Use a billing country, prefix and positive whole next number.');
      const existing = data.series[entity]; if (existing && req.body.nextNumber < existing.nextNumber) throw fail(409, 'series_number_used', 'Issued document numbers cannot be reused.');
      data.series[entity] = { entity, prefix, nextNumber: req.body.nextNumber }; log(p, 'invoice_series_configured', entity); return clone(data.series[entity]);
    })));
    app.post(prefix + '/billing/invoices/:id/document', read(req => recorded(req, 'billing:edit', (p, data) => {
      const invoice = S().db.invoices.find(row => row.id === req.params.id && row.state !== 'draft'), workspace = invoice && S().workspace(invoice.workspaceId);
      if (!invoice || !workspace) throw fail(404, 'invoice_document_unavailable', 'Issue this actual invoice first.');
      if (data.documents[invoice.id]) return clone(data.documents[invoice.id]);
      const entity = workspace.billing?.country || workspace.country, series = data.series[entity], documentNumber = series ? `${series.prefix}-${String(series.nextNumber++).padStart(6, '0')}` : invoice.number;
      if (Object.values(data.documents).some(row => row.documentNumber === documentNumber)) throw fail(409, 'document_number_used', 'Choose an unused document series.');
      const row = { invoiceId: invoice.id, documentNumber, number: invoice.number, entity, invoice: clone(invoice), workspace: workspace.name, billing: clone(workspace.billing), issuedAt: at(), prototype: true, regulatorySubmission: 'not_submitted' };
      const money = amount => `${S().pricing.toDecimals(amount || 0, S().db.currencies[invoice.currency]?.decimals ?? 2).toFixed(S().db.currencies[invoice.currency]?.decimals ?? 2)} ${invoice.currency}`;
      const content = require('../sales/lib').makePdf(documentNumber, [`Original invoice: ${invoice.number}`, `Workspace: ${workspace.name}`, `Billing: ${workspace.billing.legalName || workspace.name}`, `Issued: ${invoice.issuedAt || row.issuedAt}`, '---', ...invoice.lines.map(line => ({ text: String(line.label || line.name?.en || line.planId || line.lineId || 'Invoice line').replace(/[·•–—]/g, '-'), right: money(line.amount) })), { text: 'Subtotal', right: money(invoice.subtotal) }, { text: invoice.taxLabel || 'Tax', right: money(invoice.tax) }, { text: 'Total', right: money(invoice.total), bold: true }, 'Prototype document - regulatory submission: not submitted'], { subtitle: 'OrgTik Console - local mock invoice', footerBrand: 'OrgTik Console' });
      row.content = { name: `Invoice-${documentNumber}.pdf`, mimetype: 'application/pdf', bytes: content.length, sha256: crypto.createHash('sha256').update(content).digest('hex'), base64: content.toString('base64') };
      data.documents[invoice.id] = row; log(p, 'invoice_document_recorded', invoice.id, { documentNumber }); return clone(row);
    })));
    app.get(prefix + '/billing/invoices/:id/content', read(req => {
      authority('billing:view'); const document = state().documents[req.params.id]; if (!document?.content || !S().db.invoices.some(row => row.id === req.params.id)) throw fail(404, 'invoice_document_unavailable', 'Record the current invoice document first.'); return clone(document.content);
    }));
    app.post(prefix + '/tax/verify', read(req => recorded(req, 'tax:edit', (p, data) => {
      const workspace = S().workspace(req.body.workspaceId), taxId = String(req.body.taxId || '').trim();
      if (!workspace || !taxId || taxId.length > 100) throw fail(422, 'invalid_tax_check', 'Choose an actual workspace and tax ID.');
      const row = { id: S().id('tax_check'), workspaceId: workspace.id, taxId, at: at(), state: ['CH-DEMO-001', 'SA-DEMO-001'].includes(taxId) ? 'accepted_mock' : 'rejected_mock', submitted: false, provider: 'mock' };
      data.taxChecks.unshift(row); log(p, 'tax_mock_check', workspace.id, { checkId: row.id }); return clone(row);
    })));
    app.get(prefix + '/tax/checks', read(() => { authority('tax:view'); return clone(state().taxChecks); }));
    app.get(prefix + '/staff/security', read(() => { const p = authority('overview:view'); return clone(state().security[p.user.id] || { enabled: false, simulated: true }); }));
    app.post(prefix + '/staff/security', read(req => recorded(req, 'overview:view', (p, data) => {
      if (typeof req.body.enabled !== 'boolean' || req.body.enabled && req.body.code !== '246810') throw fail(422, 'mock_verification_required', 'Use the displayed mock verification code.');
      data.security[p.user.id] = { enabled: req.body.enabled, simulated: true, updatedAt: at() }; log(p, 'staff_mock_2fa', p.user.id, { enabled: req.body.enabled }); return clone(data.security[p.user.id]);
    })));
  }
  return { routes, metrics, notifications, search };
}
function expirySoon(value, now) {
  const match = /^(\d{2})\/(\d{2}|\d{4})$/.exec(String(value || ''));
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 12) return false;
  const year = Number(match[2]) + (match[2].length === 2 ? 2000 : 0), expiresAt = Date.UTC(year, Number(match[1]), 1);
  return expiresAt >= now && expiresAt <= now + 45 * 86400000;
}
module.exports = { create, expirySoon };
