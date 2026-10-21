// Indexing settings: the canonical host every canonical, hreflang and sitemap URL is built on.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeStore } = require('./content');
const { makeLibrary } = require('./library');

const now = () => '2026-10-21T09:00:00.000Z';
const setup = () => { const store = makeStore(now); return { store, library: makeLibrary({ store, seed: store.seed, now, uploads: 'unused' }) }; };

test('the canonical host is an https origin, changed with a reason and recorded', () => {
  const { library } = setup();
  const before = library.settings.version;
  assert.deepEqual(library.setCanonicalHost({ key: 'mona' }, 'http://insecure.test', 'x').errors, { canonicalHost: 'origin_format' });
  assert.deepEqual(library.setCanonicalHost({ key: 'mona' }, 'https://site.test/path', 'x').errors, { canonicalHost: 'origin_format' });
  assert.deepEqual(library.setCanonicalHost({ key: 'mona' }, 'https://site.test', ' ').errors, { reason: 'required' });
  library.setCanonicalHost({ key: 'mona' }, 'https://site.test/', 'Launch domain');
  assert.equal(library.settings.canonicalHost, 'https://site.test');
  assert.equal(library.settings.version, before + 1);
  assert.equal(library.settings.history[0].canonicalHost, 'https://site.test');
  assert.ok(library.sitemap().every((u) => u.loc.startsWith('https://site.test')), 'the sitemap follows the new host');
});
