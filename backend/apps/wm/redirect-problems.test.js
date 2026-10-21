// Redirects: normalised duplicates and self-redirects, the query setting, loops of any length,
// chains with their shortcut, missing destinations, and the live server compared with the settings.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeStore } = require('./content');
const { makeLibrary } = require('./library');

const now = () => '2026-10-21T09:00:00.000Z';
const who = { key: 'mona' };
const setup = () => { const store = makeStore(now); const library = makeLibrary({ store, seed: store.seed, now, uploads: 'unused' }); library.redirects.clear(); return library; };
const add = (library, r) => { const out = library.saveRedirect(who, { code: 301, status: 'active', ...r }); assert.ok(out.redirect, JSON.stringify(out.errors)); return out.redirect; };

test('a trailing slash or letter case does not make a new source, and nothing redirects to itself', () => {
  const library = setup();
  add(library, { from: '/old-page', to: '/services' });
  assert.equal(library.saveRedirect(who, { from: '/Old-Page/', to: '/work', code: 301 }).errors.from, 'duplicate');
  assert.equal(library.saveRedirect(who, { from: '/same', to: '/Same/', code: 301 }).errors.to, 'same_as_from');
});

test('the query setting is kept or dropped, and only those two', () => {
  const library = setup();
  assert.equal(add(library, { from: '/a', to: '/services', query: 'drop' }).query, 'drop');
  assert.equal(add(library, { from: '/b', to: '/services' }).query, 'keep');
  assert.equal(library.saveRedirect(who, { from: '/c', to: '/services', code: 301, query: 'maybe' }).errors.query, 'required');
});

test('saving refuses a chain and a loop, including through a wildcard', () => {
  const library = setup();
  add(library, { from: '/one', to: '/two' });
  assert.equal(library.saveRedirect(who, { from: '/zero', to: '/one', code: 301 }).errors.to, 'chain');
  add(library, { from: '/legacy/*', to: '/services' });
  assert.equal(library.saveRedirect(who, { from: '/x', to: '/legacy/page', code: 301 }).errors.to, 'chain');
  assert.equal(library.saveRedirect(who, { from: '/two', to: '/one', code: 301 }).errors.to, 'loop');
});

test('the scan finds loops of any length and chains with their final destination', () => {
  const library = setup();
  // Saved one by one (each was valid then), the three now form a loop.
  library.redirects.set('l1', { id: 'l1', from: '/l1', to: '/l2', code: 301, status: 'active', version: 1 });
  library.redirects.set('l2', { id: 'l2', from: '/l2', to: '/l3', code: 301, status: 'active', version: 1 });
  library.redirects.set('l3', { id: 'l3', from: '/l3', to: '/l1', code: 301, status: 'active', version: 1 });
  library.redirects.set('c1', { id: 'c1', from: '/c1', to: '/c2', code: 301, status: 'active', version: 1 });
  library.redirects.set('c2', { id: 'c2', from: '/c2', to: '/services', code: 301, status: 'active', version: 1 });
  const problems = library.redirectProblems();
  assert.ok(problems.some((p) => p.kind === 'loop' && ['l1', 'l2', 'l3'].every((id) => p.ids.includes(id))));
  const chain = problems.find((p) => p.kind === 'chain' && p.ids[0] === 'c1');
  assert.equal(chain.suggestion, '/services');
  // A disabled redirect doesn't run, so it neither loops nor chains.
  library.redirects.get('l3').status = 'disabled';
  assert.ok(!library.redirectProblems().some((p) => p.kind === 'loop'));
});

test('a destination the site does not have is reported; pages and other redirects are fine', () => {
  const library = setup();
  add(library, { from: '/gone', to: '/no-such-page' });
  add(library, { from: '/fine', to: '/services' });
  const addresses = new Set(['/services']);
  const missing = library.redirectProblems({ addresses }).filter((p) => p.kind === 'destinationMissing');
  assert.deepEqual(missing.map((p) => p.to), ['/no-such-page']);
});

test('against the live build: not deployed, different, disabled but live, deleted but live', () => {
  const library = setup();
  const a = add(library, { from: '/a', to: '/services' });
  const b = add(library, { from: '/b', to: '/services', code: 302 });
  const c = add(library, { from: '/c', to: '/services', status: 'disabled' });
  const deployed = [{ from: '/b', to: '/services', code: 301, query: 'keep' }, { from: '/c', to: '/services', code: 301 }, { from: '/old', to: '/services', code: 301 }];
  const kinds = library.redirectProblems({ deployed }).map((p) => `${p.kind}:${p.from}`).sort();
  assert.deepEqual(kinds, ['deletedStillLive:/old', 'deployedDiffers:/b', 'disabledStillLive:/c', 'notDeployed:/a']);
  assert.equal(library.executionOf(a, deployed), 'notDeployed');
  assert.equal(library.executionOf({ ...b, code: 301 }, deployed), 'server');
  assert.equal(library.executionOf(a, null), 'configured');
  assert.equal(library.executionOf({ ...a, handledBy: 'browser' }, deployed), 'browser');
  assert.equal(library.executionOf(c, deployed), 'server', 'a disabled redirect still answered by the server');
});

test('the server applies wildcards like the website: the matched part is kept', () => {
  const library = setup();
  const r = { from: '/platform/*', to: '/software/*' };
  assert.equal(library.applyRedirect(r, '/platform/hr'), '/software/hr');
  assert.equal(library.applyRedirect(r, '/platform'), '/software');
  assert.equal(library.applyRedirect(r, '/platformx'), null);
  assert.deepEqual(library.expectedTest({ ...r, code: 301 }), { path: '/platform/sample', probe: '/platform/sample?redirect-test=1', status: 301, to: '/software/sample', query: true });
});
