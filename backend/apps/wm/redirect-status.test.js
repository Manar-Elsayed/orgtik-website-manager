const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeStore } = require('./content');
const { makeLibrary } = require('./library');
const now = () => '2026-10-20T09:00:00.000Z';
const who = { key: 'admin' };

test('redirects have a status: active by default, disabled ones are kept but not chained through', () => {
  const store = makeStore(now), library = makeLibrary({ store, seed: store.seed, now, uploads: 'unused' });
  const made = library.saveRedirect(who, { from: '/old-offer', to: '/services', code: 301 }).redirect;
  assert.equal(made.status, 'active');
  assert.deepEqual(library.saveRedirect(who, { from: '/x', to: '/y', code: 301, status: 'paused' }).errors, { status: 'required' });
  // A chain through an active redirect is refused; once that redirect is disabled it no longer counts.
  assert.equal(library.saveRedirect(who, { from: '/older-offer', to: '/old-offer', code: 301 }).errors.to, 'chain');
  library.saveRedirect(who, { ...made, status: 'disabled' }, made);
  assert.equal(made.status, 'disabled');
  assert.equal(library.saveRedirect(who, { from: '/older-offer', to: '/old-offer', code: 301 }).errors, undefined);
  const flagged = library.saveRedirect(who, { from: '/legacy', to: '/work', code: 302, status: 'attention' }).redirect;
  assert.equal(flagged.status, 'attention');
});

test('demo redirects show each status, and saved demo data gets them once', () => {
  const store = makeStore(now, { demo: true });
  const library = makeLibrary({ store, seed: store.seed, now, uploads: 'unused', demo: true });
  const status = (id) => library.redirects.get(id)?.status;
  assert.equal(status('rd_demo_manager'), 'active');
  assert.equal(status('rd_demo_address_change'), 'attention');
  assert.equal(status('rd_demo_archived'), 'disabled');
  const saved = library.exportState();
  saved.data.demoVersion = 2;
  for (const [, r] of saved.data.redirects) delete r.status;
  library.importState(saved);
  assert.equal(status('rd_demo_archived'), 'disabled');
  assert.equal(status('rd_demo_manager'), 'active');
});
