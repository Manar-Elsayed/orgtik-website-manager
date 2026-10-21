const fail = (code) => Object.assign(new Error(code), { status: 422, code });
function cleanRules(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['source','type','interest','qualifiedOnly','tags','stageId','engagement'].includes(key))) throw fail('invalid_segment_rules');
  const rules = {};
  for (const key of ['source','type','interest','stageId']) if (input[key]) { if (typeof input[key] !== 'string' || input[key].length > 120) throw fail('invalid_segment_rules'); rules[key] = input[key].trim(); }
  if (input.qualifiedOnly) rules.qualifiedOnly = true;
  if (input.tags) { if (!Array.isArray(input.tags) || input.tags.length > 30 || input.tags.some(value => typeof value !== 'string' || !value.trim() || value.length > 80)) throw fail('invalid_segment_rules'); rules.tags = [...new Set(input.tags.map(value => value.trim()))]; }
  if (input.engagement && input.engagement !== 'any') { if (!['delivered_mock','not_delivered_mock'].includes(input.engagement)) throw fail('invalid_segment_rules'); rules.engagement = input.engagement; }
  return rules;
}
function matches(contact, rules, delivered) {
  const text = value => String(value || '').trim().toLocaleLowerCase();
  return (!rules.source || text(contact.source) === text(rules.source)) && (!rules.type || text(contact.type) === text(rules.type)) && (!rules.interest || (contact.tags || []).some(tag => text(tag).includes(text(rules.interest)))) && (!rules.qualifiedOnly || ['qualified','quoted','won'].includes(contact.status)) && (!rules.tags?.length || rules.tags.every(tag => (contact.tags || []).some(value => text(value) === text(tag)))) && (!rules.stageId || contact.stageId === rules.stageId) && (!rules.engagement || (rules.engagement === 'delivered_mock' ? delivered.has(contact.id) : !delivered.has(contact.id)));
}
async function preview({ ctx, db, project, rules, audienceId }) {
  rules = cleanRules(rules);
  if (!ctx.crmDirectory) throw Object.assign(new Error('CRM connection required.'), { status: 403, code: 'crm_connection_required' });
  const directory = await ctx.crmDirectory.current({});
  let contacts = directory.contacts;
  if (audienceId) { const audience = db.audiences.find(row => row.id === audienceId && row.projectId === project.id); if (!audience) throw fail('audience_not_found'); const ids = new Set((audience.crmContactRefs || []).map(row => row.contactId)); contacts = contacts.filter(row => ids.has(row.id)); }
  const delivered = new Set(db.campaigns.filter(row => row.projectId === project.id).flatMap(row => (row.crmDeliveries || []).filter(receipt => receipt.mode === 'local_mock').flatMap(receipt => (receipt.eligible || []).map(ref => ref.contactId))));
  const rows = contacts.filter(contact => matches(contact, rules, delivered));
  return { workspaceId: directory.workspaceId, simulatedEngagement: true, total: rows.length, contacts: rows.slice(0,50).map(row => ({ id: row.id, name: row.name, email: row.email, stageId: row.stageId, tags: row.tags, consent: row.consent?.state || 'unknown', deliveredMock: delivered.has(row.id) })) };
}
module.exports = { cleanRules, matches, preview };
