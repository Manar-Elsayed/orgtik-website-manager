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

test('each address shows its own policy and what search engines are told, and the sitemap follows the rules', () => {
  const { store, library } = setup();
  const urls = library.indexingUrls();
  assert.ok(urls.length > 0);
  for (const u of urls) {
    assert.equal(u.policy, library.settings.visibility === 'noindex' || u.pagePolicy === 'noindex' ? 'noindex' : 'index');
    assert.equal(u.inSitemap, u.sitemapSetting && u.policy === 'index' && u.canonicalSelf);
    assert.equal(u.warnings.includes('noindexInSitemap'), u.sitemapSetting && u.pagePolicy === 'noindex');
  }
  // While the site is hidden nothing is indexable, so the published sitemap is empty.
  library.settings.visibility = 'noindex';
  assert.equal(library.sitemap().length, 0);
  // Visible: only pages set to index, at their own address, are listed.
  library.settings.visibility = 'index';
  const e = [...store.entries.values()].find((x) => x.type === 'page' && x.live && x.workflow.visibility === 'live');
  e.live.seo.en = { ...e.live.seo.en, robots: 'index', inSitemap: true, canonical: '' };
  const row = library.indexingUrls().find((u) => u.id === e.id && u.locale === 'en');
  assert.equal(row.inSitemap, true);
  assert.ok(library.sitemap().some((u) => u.loc === row.loc));
  e.live.seo.en.canonical = 'https://elsewhere.test/x';
  assert.equal(library.indexingUrls().find((u) => u.id === e.id && u.locale === 'en').inSitemap, false, 'a page naming another original is left out');
});

test('robots.txt can be written here, reset to the generated one, and needs a reason', () => {
  const { library } = setup();
  const generated = library.robots();
  assert.equal(library.setRobots({ key: 'mona' }, 'User-agent: *\nDisallow: /cart\n', '').errors.reason, 'required');
  library.setRobots({ key: 'mona' }, 'User-agent: *\r\nDisallow: /cart', 'Keep crawlers off the cart');
  assert.equal(library.robots(), 'User-agent: *\nDisallow: /cart\n');
  assert.equal(library.settings.history[0].robots, 'custom');
  library.setRobots({ key: 'mona' }, null, 'Back to the generated file');
  assert.equal(library.robots(), generated);
});

test('Validate finds canonicals on another website or not served by the site, on its own', () => {
  const { store, library } = setup();
  assert.deepEqual(library.canonicalProblems(), []);
  const e = [...store.entries.values()].find((x) => x.type === 'page' && x.live && x.workflow.visibility === 'live');
  e.live.seo.en = { ...e.live.seo.en, canonical: 'https://elsewhere.test/x' };
  assert.deepEqual(library.canonicalProblems().map((p) => p.kind), ['otherHost']);
  e.live.seo.en.canonical = `${library.settings.canonicalHost}/no-such-page`;
  assert.deepEqual(library.canonicalProblems().map((p) => p.kind), ['notServed']);
  // Naming another live page is a choice, not a problem.
  const other = library.indexingUrls().find((u) => u.id !== e.id && u.locale === 'en');
  e.live.seo.en.canonical = other.loc;
  assert.deepEqual(library.canonicalProblems(), []);
});
