// SEO health checks the client asked for: duplicates per language, lengths as rendered, the shared
// image's fallbacks, canonical problems, structured data, severities and Run check.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeStore } = require('./content');
const { makeLibrary } = require('./library');

let clock = '2026-10-21T09:00:00.000Z';
const now = () => clock;
const setup = (site = { titleTemplate: '{page} | OrgTik', defaultOgImage: null }) => {
  const store = makeStore(now);
  const library = makeLibrary({ store, seed: store.seed, now, uploads: 'unused', locales: () => ['en', 'de'], site: () => site });
  return { store, library };
};
const contentOf = (store, id) => { const e = store.entries.get(id); return e.draft ?? e.live; };
const rowOf = (library, id, locale = 'en') => library.health().rows.find(r => r.id === id && r.locale === locale);
const twoPages = (library) => { const ids = [...new Set(library.health().rows.map(r => r.id))]; return [ids[0], ids[1]]; };

test('a description used by two pages in one language is a duplicate, naming the other page', () => {
  const { store, library } = setup();
  const [a, b] = twoPages(library);
  const text = 'One shared description that is long enough to pass the length guidance easily.';
  contentOf(store, a).seo.en = { ...contentOf(store, a).seo.en, description: text };
  contentOf(store, b).seo.en = { ...contentOf(store, b).seo.en, description: text.toUpperCase() };
  const row = rowOf(library, a);
  assert.ok(row.issues.includes('descriptionDuplicate'));
  assert.deepEqual(row.duplicates.description.map(p => p.id), [b]);
  // The same text in another language is not a duplicate of the English one.
  contentOf(store, a).seo.de = { ...(contentOf(store, a).seo.de ?? {}), description: text };
  contentOf(store, b).seo.de = { ...(contentOf(store, b).seo.de ?? {}), description: 'A different German description, long enough for the guidance too.' };
  assert.ok(!rowOf(library, a, 'de').issues.includes('descriptionDuplicate'));
});

test('title length is measured on the rendered title (template applied) and is guidance', () => {
  const { store, library } = setup();
  const [a] = twoPages(library);
  contentOf(store, a).seo.en = { ...contentOf(store, a).seo.en, title: 'Hi' };
  const row = rowOf(library, a);
  assert.equal(row.renderedTitle, 'Hi | OrgTik');
  assert.equal(row.titleLength, 'Hi | OrgTik'.length);
  assert.ok(row.issues.includes('titleShort'));
  assert.ok(library.GUIDANCE.has('titleShort'));
  // A title already written in the template's form is used as it is.
  contentOf(store, a).seo.en.title = 'A much longer title for this page | OrgTik';
  assert.equal(rowOf(library, a).renderedTitle, 'A much longer title for this page | OrgTik');
});

test('the shared image follows the site order: language, English, page image, site default', () => {
  const site = { titleTemplate: '{page} | OrgTik', defaultOgImage: null };
  const { store, library } = setup(site);
  const [a] = twoPages(library);
  const c = contentOf(store, a);
  delete c.image; c.seo.en = { ...c.seo.en, ogImage: '' }; c.seo.de = { ...(c.seo.de ?? {}), ogImage: '' };
  assert.ok(rowOf(library, a, 'de').issues.includes('noSocialImage'));
  c.seo.en.ogImage = 'brand.webp';
  assert.ok(!rowOf(library, a, 'de').issues.some(i => i === 'noSocialImage' || i === 'socialImageDefault'), 'English image is used for German');
  c.seo.en.ogImage = '';
  site.defaultOgImage = '/assets/default.webp';
  assert.ok(rowOf(library, a, 'de').issues.includes('socialImageDefault'));
});

test('canonical problems: another host, an address the site does not serve, another page, a sitemap conflict', () => {
  const { store, library } = setup();
  const rows = library.health().rows.filter(r => r.locale === 'en');
  const live = rows.filter(r => store.entries.get(r.id).workflow.visibility === 'live');
  const [a, b] = [live[0], live[1]];
  const c = contentOf(store, a.id);
  c.seo.en = { ...c.seo.en, canonical: 'https://elsewhere.example/page', inSitemap: true };
  assert.ok(rowOf(library, a.id).issues.includes('canonicalHost'));
  c.seo.en.canonical = `${library.settings.canonicalHost}/no-such-page`;
  assert.ok(rowOf(library, a.id).issues.includes('canonicalUnreachable'));
  c.seo.en.canonical = `${library.settings.canonicalHost}${b.path === '/' ? '/' : b.path}`;
  const row = rowOf(library, a.id);
  assert.ok(row.issues.includes('canonicalOther'));
  assert.ok(row.issues.includes('canonicalSitemap'), 'the sitemap lists an address that names another as the original');
  // Out of the sitemap (an indexable page: noindex pages out of the sitemap are utility pages, not checked).
  Object.assign(c.seo.en, { robots: 'index', inSitemap: false });
  assert.ok(!rowOf(library, a.id).issues.includes('canonicalSitemap'));
  // Pointing at itself is fine.
  c.seo.en.canonical = row.url;
  assert.ok(!rowOf(library, a.id).issues.some(i => i.startsWith('canonical')));
});

test('structured data: missing @type and required properties are reported with the reason', () => {
  const { store, library } = setup();
  const [a] = twoPages(library);
  const c = contentOf(store, a);
  c.seo.en = { ...c.seo.en, jsonLd: { '@type': 'FAQPage' } };
  let row = rowOf(library, a);
  assert.ok(row.issues.includes('schemaInvalid'));
  assert.ok(row.details.schemaInvalid.some(d => d.includes('mainEntity')));
  c.seo.en.jsonLd = { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'Why?', acceptedAnswer: { '@type': 'Answer', text: 'Because.' } }] };
  assert.ok(!rowOf(library, a).issues.includes('schemaInvalid'));
  c.seo.en.jsonLd = [{ name: 'no type' }];
  assert.ok(rowOf(library, a).details.schemaInvalid.some(d => d.includes('@type')));
});

test('each row has a level, and other issues are everything beyond the five headline checks', () => {
  const { library } = setup();
  for (const row of library.health().rows) {
    const errors = row.issues.filter(i => !library.GUIDANCE.has(i));
    assert.equal(row.level, errors.length ? 'error' : row.issues.length ? 'guidance' : 'ok');
    assert.equal(library.hasOther(row), row.issues.some(i => !library.MAIN_CHECKS.includes(i)));
  }
});

test('Run check records the results and notices content changed since', () => {
  const { store, library } = setup();
  assert.equal(library.healthRunState(), null);
  const run = library.runHealth({ key: 'mona' });
  assert.equal(run.checked, library.health().rows.length);
  assert.equal(library.healthRunState().changedSince, false);
  clock = '2026-10-21T10:00:00.000Z';
  const e = [...store.entries.values()][0];
  e.workflow.updatedAt = clock;
  assert.equal(library.healthRunState().changedSince, true);
  // Persisted with the library state.
  const copy = setup().library;
  copy.importState(library.exportState());
  assert.equal(copy.healthRunState().at, run.at);
});
