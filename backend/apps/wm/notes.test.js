const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const wm = require('../wm');

async function fixture(t) {
  let key = 'editor', role = 'wm_editor';
  const user = () => ({ id: key === 'editor' ? 1 : 2, key, firstName: key, lastName: 'Reviewer', isActive: true });
  const identity = { userFromReq: user, userScopes: () => [{ scope: 'website_manager', roles: [role] }], fullName: person => person.firstName + ' Reviewer', publicUser: person => person, findByKey: value => ({ ...user(), key: value, firstName: value }), findUser: user, users: [user()] };
  const app = express(); app.use(express.json());
  const hooks = wm.routes(app, { identity, realm: 'notes-test', uploadsDir: require('node:os').tmpdir(), config: { apiUrl: () => 'http://localhost' }, apiUrl: () => 'http://localhost', webUrl: () => 'http://localhost', log() {} });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { hooks, as(nextKey, nextRole) { key = nextKey; role = nextRole; }, async call(route, method = 'GET', body, version, operation) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/v2${route}`, { method, headers: { 'content-type': 'application/json', ...(version == null ? {} : { 'if-match': String(version) }), ...(operation ? { 'idempotency-key': operation } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, ...await response.json() };
  } };
}

test('element comment editing preserves author, enforces ownership and versions, and never alters published content', async t => {
  const f = await fixture(t), before = (await f.call('/public/entries/page')).data;
  let comment = (await f.call('/admin/studio/comments', 'POST', { entryId: 'pg_home', anchor: 'entry', locale: 'en', text: 'Initial team note' })).data;
  assert.equal(comment.version, 1);
  const route = `/admin/studio/comments/${comment.id}`;
  f.as('viewer', 'wm_viewer'); assert.equal((await f.call(route + '/edit', 'POST', { text: 'Forbidden', version: 1 })).status, 403);
  f.as('another-editor', 'wm_editor'); assert.equal((await f.call(route + '/edit', 'POST', { text: 'Forbidden', version: 1 })).status, 403);
  f.as('editor', 'wm_editor');
  assert.equal((await f.call(route + '/edit', 'POST', { text: ' ', version: 1 })).status, 422);
  assert.equal((await f.call(route + '/edit', 'POST', { text: 'x'.repeat(2001), version: 1 })).status, 422);
  comment = (await f.call(route + '/edit', 'POST', { text: 'Updated team note', version: 1 })).data;
  assert.equal(comment.text, 'Updated team note'); assert.equal(comment.version, 2); assert.equal(comment.author.key, 'editor'); assert.ok(comment.editedAt);
  assert.equal((await f.call(route + '/edit', 'POST', { text: 'Stale overwrite', version: 1 })).status, 412);
  assert.equal((await f.call(route + '/resolve', 'POST', { resolved: true, version: 1 })).status, 412);
  comment = (await f.call(route + '/resolve', 'POST', { resolved: true, version: 2 })).data; assert.equal(comment.version, 3);
  f.hooks.importState(f.hooks.exportState());
  const restored = (await f.call('/admin/studio/comments/pg_home')).data.find(row => row.id === comment.id);
  assert.equal(restored.text, 'Updated team note'); assert.equal(restored.resolved, true);
  assert.deepEqual((await f.call('/public/entries/page')).data, before);
});

test('comment deletion stays deleted after reload and safely replays a lost-response retry', async t => {
  const f = await fixture(t);
  const comment = (await f.call('/admin/studio/comments', 'POST', { entryId: 'pg_home', anchor: 'entry', locale: 'en', text: 'Disposable team note' })).data;
  f.as('administrator', 'wm_admin');
  const route = `/admin/studio/comments/${comment.id}/delete`, body = { version: comment.version };
  const deleted = await f.call(route, 'POST', body, undefined, 'delete-note-retry-123'); assert.equal(deleted.status, 200);
  assert.equal((await f.call(route, 'POST', body, undefined, 'delete-note-retry-123')).status, 200);
  f.hooks.importState(f.hooks.exportState());
  assert.ok(!(await f.call('/admin/studio/comments/pg_home')).data.some(row => row.id === comment.id));
  assert.equal((await f.call(`/admin/studio/comments/${comment.id}/edit`, 'POST', { text: 'Restore by edit', version: 2 })).status, 404);
  const state = f.hooks.exportState(); assert.ok(!JSON.stringify(state.data.studio.comments).includes('Disposable team note'));
});

test('Idea notes add, edit and delete with permissions, stale-write checks and persistent private storage', async t => {
  const f = await fixture(t); f.as('admin', 'wm_admin');
  let idea = (await f.call('/admin/ideas')).data[0]; const route = `/admin/ideas/${idea.id}/notes`;
  idea = (await f.call(route, 'POST', { text: 'Private planning note' }, idea.version)).data;
  const note = idea.notes[0], priorVersion = idea.version;
  f.as('viewer', 'wm_viewer'); assert.equal((await f.call(route + '/' + note.id, 'PATCH', { text: 'Forbidden' }, idea.version)).status, 403);
  f.as('admin', 'wm_admin');
  assert.equal((await f.call(route + '/' + note.id, 'PATCH', { text: ' ' }, idea.version)).status, 422);
  idea = (await f.call(route + '/' + note.id, 'PATCH', { text: 'Edited private planning note' }, idea.version)).data;
  assert.equal(idea.notes[0].text, 'Edited private planning note'); assert.equal(idea.notes[0].id, note.id); assert.ok(idea.notes[0].editedAt);
  assert.equal((await f.call(route + '/' + note.id, 'DELETE', undefined, priorVersion)).status, 412);
  f.hooks.importState(f.hooks.exportState());
  assert.equal((await f.call(`/admin/ideas/${idea.id}`)).data.notes[0].text, 'Edited private planning note');
  assert.ok(!JSON.stringify((await f.call('/public/ideas')).data).includes('Edited private planning note'));
  idea = (await f.call(route + '/' + note.id, 'DELETE', undefined, idea.version)).data; assert.equal(idea.notes.length, 0);
  f.hooks.importState(f.hooks.exportState()); assert.equal((await f.call(`/admin/ideas/${idea.id}`)).data.notes.length, 0);
  assert.ok(idea.history.some(row => row.action === 'note_edit')); assert.ok(idea.history.some(row => row.action === 'note_delete'));
});

test('retained notes receive stable IDs before editing or deletion', () => {
  const { ensureNotes, changeNote } = require('./notes');
  const record = { id: 'legacy', version: 1, history: [], notes: [{ at: '2026-10-15T10:00:00Z', by: 'staff', text: 'First note' }, { at: '2026-10-15T10:00:00Z', by: 'staff', text: 'Second note' }] };
  const copy = structuredClone(record), ids = ensureNotes(record).map(note => note.id);
  assert.deepEqual(ensureNotes(copy).map(note => note.id), ids); assert.equal(new Set(ids).size, 2);
  changeNote(record, ids[0], 'delete', undefined, 'staff', '2026-10-15T11:00:00Z', [], 'idea');
  assert.equal(record.notes[0].id, ids[1]); assert.equal(record.notes[0].text, 'Second note');
});
