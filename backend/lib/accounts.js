// Canonical account creation shared by the suite and Website Manager. Callers enforce authorization.
const { nowIso } = require("./util");
function createIdentityUser(identity, d) {
  const id =
    identity.users.reduce((m, u) => Math.max(m, Number(u.id) || 0), 0) + 1;
  const now = nowIso();
  for (const user of identity.users)
    if (user.deletedAt && user.email.toLowerCase() === d.email.toLowerCase())
      user.email = `deleted-${user.id}.${user.email}`;
  const u = {
    id,
    key: `${d.keyPrefix || "sos-u"}${id}`,
    email: String(d.email).toLowerCase(),
    username: d.username,
    firstName: d.firstName,
    lastName: d.lastName,
    avatar: null,
    isActive: d.isActive !== false,
    isEmailVerified: true,
    managerId: null,
    userType: d.userType ?? null,
    phone: d.phone || null,
    password: d.password,
    createdAt: now,
    updatedAt: now,
    profile: {
      id,
      jobTitle: d.jobTitle || null,
      department: d.department || null,
      about: d.bio || null,
      language: d.language || "en",
      timeZone: "Africa/Cairo",
      weekStartDay: "saturday",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h",
      flyoutToastMessage: true,
      timezoneChangeNotification: true,
      createdAt: now,
      updatedAt: now,
    },
  };
  for (const k of ["address", "city", "country"])
    if (d[k]) u[k] = String(d[k]).trim();
  identity.setPassword(u, d.password);
  identity.users.push(u);
  return u;
}

// Administrative deletion retains the person and domain records so historical
// authors, employment, invoices and delivery references continue to resolve.
function deleteIdentityUser(identity, { user, actor, platform: S }) {
  const fail = (status, code, message) => Object.assign(new Error(message), {status, code});
  if (!user || user.deletedAt) throw fail(404, 'not_found', 'Account not found.');
  if (!actor || user.id === actor.id) throw fail(409, 'self_lockout', 'You cannot delete your own account.');
  if (!S?.db || !Array.isArray(S.db.workspaces) || !Array.isArray(S.db.invoices) || typeof S.workspace !== 'function' || typeof S.now !== 'function' || typeof S.iso !== 'function' || typeof S.log !== 'function')
    throw fail(503, 'account_authority_unavailable', 'Current suite account authority is unavailable. Try again.');
  const qualified = require('./workspace-hr').qualifiedSuperAdmins(S, identity, {through: S.now()});
  const globalAdmin = person => person.isActive === true && !person.deletedAt && !person.pendingActivation && identity.grants?.global?.[person.key]?.roles.includes('super_admin');
  if ((qualified.some(member => member.userKey === user.key) && !qualified.some(member => member.userKey !== user.key)) || (globalAdmin(user) && !identity.users.some(person => person.key !== user.key && globalAdmin(person))))
    throw fail(409, 'active_super_admin_required', 'Appoint another qualified active super administrator before deleting this account.');
  const mine = S.db.workspaces.filter(row => row.members.some(member => member.userKey === user.key));
  if (mine.some(row => !['deleted', 'cancelled'].includes(row.state) && row.members.some(member => member.userKey === user.key && member.role === 'owner' && member.status === 'active')))
    throw fail(409, 'ownership_transfer_required', 'Transfer or close the owned workspaces before deleting the account.');
  if (S.db.invoices.some(invoice => ['open', 'past_due'].includes(invoice.state) && mine.some(row => row.id === invoice.workspaceId && row.members.some(member => member.userKey === user.key && member.role === 'owner'))))
    throw fail(409, 'unpaid_invoices', 'Settle the outstanding owner invoices before deleting the account.');
  const incrementable = value => value === undefined || Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER;
  const staffEpochs = S.db.staffAccessEpochs;
  if (!incrementable(user.authVersion) || staffEpochs !== undefined && (!staffEpochs || typeof staffEpochs !== 'object' || Array.isArray(staffEpochs)) || !incrementable(staffEpochs?.[user.key]) || mine.some(row => !incrementable(row.authorityRevision) || row.members.some(member => member.userKey === user.key && (!incrementable(member.accessEpoch) || !incrementable(member.revision) || Object.values(member.toolGrants || {}).some(grant => !grant || typeof grant !== 'object' || Array.isArray(grant))))))
    throw fail(503, 'account_authority_unavailable', 'Current suite account authority is unavailable. Try again.');
  const at = S.iso(S.now());
  // Current authority checks account activity/deletion and authVersion for every
  // access and refresh. Keep revocation in this journaled account mutation.
  user.isActive = false; user.deletedAt = at; user.updatedAt = at; user.authVersion = (user.authVersion || 0) + 1;
  for (const members of Object.values(identity.grants)) delete members[user.key];
  for (const row of mine) {
    for (const member of row.members.filter(member => member.userKey === user.key)) {
      member.status = 'removed'; member.accessEpoch = (member.accessEpoch || 0) + 1; member.revision = (member.revision || 0) + 1;
      for (const grant of Object.values(member.toolGrants || {})) grant.assigned = false;
    }
    row.authorityRevision = (row.authorityRevision || 0) + 1;
  }
  S.db.staffAccessEpochs ||= {}; S.db.staffAccessEpochs[user.key] = (S.db.staffAccessEpochs[user.key] || 0) + 1;
  S.log(actor.key, 'account_deleted', String(user.id));
  return user;
}

module.exports = { createIdentityUser, deleteIdentityUser };
