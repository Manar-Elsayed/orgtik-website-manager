const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ideaView, eraseSubmitter, ideaSubmissions, ideaCategory, ideaTags, submitComment, moderateComment, publicIdea } = require('./ideas');
test('idea submitters are masked without personal-data permission', () => {
  const idea = { submitter: { name: 'Visitor', email: 'visitor@example.test', privacyVersion: '0.2' } };
  const masked = ideaView(idea, false);
  assert.notEqual(masked.submitter.name, idea.submitter.name);
  assert.notEqual(masked.submitter.email, idea.submitter.email);
  assert.equal(masked.submitter.masked, true);
  assert.deepEqual(ideaView(idea, true).submitter, idea.submitter);
});
test('erasure removes submitter data, increments the version and audits it', () => {
  const idea = { id: 'idea-test', version: 1, submitter: { name: 'Visitor', email: 'visitor@example.test', privacyVersion: '0.2' }, history: [] }, audit = [];
  eraseSubmitter(idea, 'moderator', '2026-10-06T10:00:00Z', audit);
  assert.deepEqual(idea.submitter, { erased: true, privacyVersion: '0.2' });
  assert.equal(idea.version, 2);assert.equal(audit[0].action, 'idea_erase');
  assert.deepEqual(ideaView(idea, false).submitter, idea.submitter);
});
test('duplicate submissions reuse the idea, reject conflicting keys, and expire', () => {
  let clock = 0;const ideas = new Map([['test', {}]]), submissions = ideaSubmissions(ideas, () => clock);
  const body = { email: 'VISITOR@example.test', message: 'An idea', topic: 'Product' };
  assert.equal(submissions.duplicate(body, 'key'), null);submissions.remember(body, 'key', 'test');
  assert.equal(submissions.duplicate(body, 'key').id, 'test');
  assert.equal(submissions.duplicate({ ...body, email: body.email.toLowerCase() }).id, 'test');
  assert.equal(submissions.duplicate({ ...body, message: 'Different idea' }, 'key').conflict, true);
  clock = 600000;assert.equal(submissions.duplicate(body, 'key'), null);
});
test('legacy topic tags and submitted form categories remain distinct without rewriting stored ideas', () => {
  const legacy = { theme: 'SaaS products' }, snapshot = structuredClone(legacy);
  assert.deepEqual(ideaTags(legacy), ['SaaS products']); assert.equal(ideaCategory(legacy), null); assert.deepEqual(legacy, snapshot);
  assert.equal(ideaCategory({ theme: 'A product idea' }), 'product_idea'); assert.deepEqual(ideaTags({ theme: 'A product idea' }), []);
  assert.equal(ideaCategory({ theme: 'فكرة منتج' }), 'product_idea');
  assert.equal(ideaCategory({ theme: 'Custom translated label', category: 'hosting_support' }), 'hosting_support');
  assert.equal(ideaCategory({ theme: 'A product idea', category: null }), null);
  assert.deepEqual(ideaTags({ theme: 'SaaS products', tags: [] }), []);
  assert.equal(ideaCategory({ theme: 'constructor' }), null); assert.deepEqual(ideaTags({ theme: '__proto__' }), ['__proto__']);
});

test('comment deletion retains content and history, rejects stale changes, and restores privately', () => {
  const at = '2026-10-15T12:00:00.000Z';
  for (const status of ['pending', 'approved', 'hidden']) {
    const idea = { id: 'idea-test', status: 'open', version: 1, comments: 2, history: [] };
    const submitted = submitComment(idea, { name: 'Visitor', email: 'private@example.test', message: 'Keep this retained comment.', consent: true }, 'receipt-' + status, at).comment;
    submitted.status = status;
    const before = structuredClone(idea);
    assert.equal(moderateComment(idea, submitted.id, 0, 'delete', undefined, 'moderator', at).status, 412);
    assert.deepEqual(idea, before);
    const deleted = moderateComment(idea, submitted.id, 1, 'delete', undefined, 'moderator', at).comment;
    assert.equal(deleted.status, 'deleted'); assert.equal(deleted.version, 2);
    assert.equal(deleted.body, submitted.body); assert.equal(deleted.email, submitted.email);
    assert.equal(idea.version, before.version + 1); assert.equal(idea.history[0].action, 'comment_delete'); assert.equal(idea.history[0].commentId, deleted.id);
    assert.deepEqual(deleted.moderationHistory[0], { at, by: 'moderator', action: 'delete', from: status, to: 'deleted' });
    assert.equal(publicIdea(idea).comments, 2); assert.deepEqual(publicIdea(idea).discussion, []);
    assert.equal(ideaView(idea, true).discussion[0].status, 'deleted');
    const retained = structuredClone(idea);
    for (const action of ['approve', 'hide', 'delete']) assert.equal(moderateComment(idea, deleted.id, 2, action, 'A reason', 'moderator', at).status, 409);
    assert.deepEqual(idea, retained);
    const restored = moderateComment(idea, deleted.id, 2, 'restore', undefined, 'moderator', at).comment;
    assert.equal(restored.status, 'hidden'); assert.equal(restored.version, 3); assert.equal(restored.moderationHistory.length, 2);
    assert.deepEqual(publicIdea(idea).discussion, []);
    assert.equal(moderateComment(idea, deleted.id, 3, 'restore', undefined, 'moderator', at).status, 409);
    assert.equal(moderateComment(idea, deleted.id, 3, 'approve', undefined, 'moderator', at).comment.status, 'approved');
    assert.equal(publicIdea(idea).comments, 3);
  }
});
