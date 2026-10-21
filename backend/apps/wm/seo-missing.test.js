const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeStore } = require('./content');
const { makeLibrary } = require('./library');
const now = () => '2026-10-20T09:00:00.000Z';
const setup = () => { const store = makeStore(now); return { store, library: makeLibrary({ store, seed: store.seed, now, uploads: 'unused' }) }; };

test('SEO missing lists each page once, with every SEO health issue plus the keyword fields', () => {
  const { library } = setup();
  const health = library.health(), missing = library.missingSeo();
  assert.deepEqual(Object.keys(library.SEO_GROUPS), ['search', 'keywords', 'sharing', 'images']);
  const order = Object.values(library.SEO_GROUPS).flat();
  assert.deepEqual([...library.CHECKS].sort(), order.filter(i => !['focusMissing', 'keywordsMissing'].includes(i)).sort(), 'every SEO health check has a category');
  assert.equal(new Set(missing.rows.map(r => r.id)).size, missing.rows.length, 'one row per page');
  assert.equal(missing.checked, new Set(health.rows.map(r => r.id)).size);
  for (const row of missing.rows) {
    const checks = health.rows.filter(r => r.id === row.id);
    for (const r of checks) for (const issue of r.issues) assert.ok(row.issues.includes(issue), `${row.id}: ${issue}`);
    assert.equal(row.issues.includes('keywordsMissing'), checks.some(r => !r.keywords));
    assert.deepEqual(row.issues, order.filter(i => row.issues.includes(i)), 'issues in the editor order');
    assert.ok(row.languages.length && row.languages.includes(row.locale));
    assert.equal(row.allLanguages, missing.locales.length > 1 && row.languages.length === missing.locales.length);
    assert.ok(['live', 'not_on_site', 'archived'].includes(row.visibility));
  }
  for (const [group, keys] of Object.entries(library.SEO_GROUPS)) assert.equal(missing.counts[group], missing.rows.filter(r => r.issues.some(i => keys.includes(i))).length);
  assert.equal(missing.incomplete, missing.rows.length);
});

test('pages on the site come first, then the ones with the most issues', () => {
  const { library } = setup();
  const rows = library.missingSeo().rows, live = rows.map(r => r.visibility === 'live');
  const firstOff = live.indexOf(false);
  if (firstOff >= 0) assert.ok(live.slice(firstOff).every(x => !x));
  for (let i = 1; i < rows.length; i++) if (live[i] === live[i - 1]) assert.ok(rows[i - 1].issues.length >= rows[i].issues.length);
});

test('filling the focus keyphrase and keywords clears them; blank values still count', () => {
  const { store, library } = setup();
  const row = library.missingSeo().rows[0];
  const entry = store.entries.get(row.id), content = entry.draft ?? entry.live;
  const issues = () => library.missingSeo().rows.find(r => r.id === row.id)?.issues ?? [];
  for (const l of row.languages) { content.seo[l].focus = 'digital studio'; content.seo[l].keywords = ['orgtik']; }
  assert.equal(issues().includes('focusMissing'), false);
  assert.equal(issues().includes('keywordsMissing'), false);
  content.seo[row.languages[0]].focus = '  ';
  content.seo[row.languages[0]].keywords = [' '];
  assert.equal(issues().includes('focusMissing'), true);
  assert.equal(issues().includes('keywordsMissing'), true);
});

test('demo data fills other languages unevenly, and every switched-on language is checked', () => {
  const store = makeStore(now, { demo: true });
  store.ensureDemo();
  const library = makeLibrary({ store, seed: store.seed, now, uploads: 'unused', locales: () => ['en', 'ar', 'de', 'fr', 'it'] });
  const home = store.entries.get('pg_home'), seo = (home.draft ?? home.live).seo;
  assert.ok(['ar', 'de', 'fr', 'it'].every(l => seo[l]?.title), 'the home page has a title in every language');
  assert.equal(seo.de.focus, 'Digitalstudio');
  const health = library.health();
  for (const l of ['en', 'ar', 'de', 'fr', 'it']) assert.ok(health.rows.some(r => r.locale === l), `${l} is checked`);
  assert.ok(health.rows.some(r => r.locale === 'it' && r.issues.includes('titleMissing')), 'some pages are not translated yet');
  const dupes = health.rows.filter(r => r.issues.includes('titleDuplicate'));
  for (const r of dupes) assert.ok(dupes.some(o => o !== r && o.locale === r.locale && o.title.toLowerCase() === r.title.toLowerCase()), 'duplicates are within one language');
  const missing = library.missingSeo();
  assert.deepEqual(missing.locales, ['en', 'ar', 'de', 'fr', 'it']);
  for (const row of missing.rows) for (const l of row.languages) assert.ok(row.byLanguage[l].length && row.byLanguage[l].every(i => row.issues.includes(i)));
  // Saved data from before the blocks existed gets them once; demo-made records and edits are left alone.
  const snapshot = () => JSON.stringify([...store.entries.values()].map(e => [e.live?.seo, e.draft?.seo]));
  const before = snapshot();
  require('./seed/seo-translations').seoTranslations(store.entries);
  assert.equal(snapshot(), before, 'running it again changes nothing');
});

test('duplicate titles, addresses and focus keyphrases name the other page, and the editor can ask while typing', () => {
  const store = makeStore(now, { demo: true });
  store.ensureDemo();
  const library = makeLibrary({ store, seed: store.seed, now, uploads: 'unused', locales: () => ['en', 'de'] });
  const rows = library.health().rows;
  const plans = rows.find(r => r.id === 'pg_plans' && r.locale === 'en');
  assert.ok(plans.issues.includes('focusDuplicate'), 'the seeded keyphrase clash is found');
  assert.deepEqual(plans.duplicates.focus.map(p => p.id), ['pg_software']);
  assert.equal(rows.find(r => r.id === 'pg_plans' && r.locale === 'de').issues.includes('focusDuplicate'), false, 'per language');
  const entry = store.entries.get('pg_about'), content = entry.draft ?? entry.live;
  content.seo.en.title = (store.entries.get('pg_home').draft ?? store.entries.get('pg_home').live).seo.en.title;
  const about = library.health().rows.find(r => r.id === 'pg_about' && r.locale === 'en');
  assert.ok(about.issues.includes('titleDuplicate'));
  assert.ok(about.duplicates.title.some(p => p.id === 'pg_home'));
  const missing = library.missingSeo().rows.find(r => r.id === 'pg_about');
  assert.ok(missing.duplicates.en.title.some(p => p.id === 'pg_home'));
  const live = library.seoConflicts({ entry: 'pg_contact', lang: 'en', title: '  ' + content.seo.en.title.toUpperCase(), focus: 'Business Software' });
  assert.deepEqual(live.title.map(p => p.id).sort(), ['pg_about', 'pg_home']);
  assert.deepEqual(live.focus.map(p => p.id).sort(), ['pg_plans', 'pg_software']);
  assert.deepEqual(live.address, []);
  const { text, ...fields } = library.seoConflicts({ entry: 'pg_home', lang: 'en', title: '', focus: '' });
  assert.deepEqual(fields, { title: [], description: [], focus: [], address: [] });
  // The home page's tagline is also on Services: page text comes from the saved copy, not what is typed.
  assert.deepEqual(text.map(p => p.id), ['pg_services']);
});

test('SEO health shows a page once for every set of languages with exactly the same issues', () => {
  const store = makeStore(now, { demo: true });
  store.ensureDemo();
  const library = makeLibrary({ store, seed: store.seed, now, uploads: 'unused', locales: () => ['en', 'ar', 'de', 'fr', 'it'] });
  const rows = library.health().rows, grouped = library.groupHealthRows(rows);
  assert.ok(grouped.length < rows.length, 'some languages share a row');
  assert.equal(grouped.reduce((n, g) => n + g.locales.length, 0), rows.length, 'every language is still listed once');
  const keys = grouped.map(g => `${g.id}|${g.issues.join(',')}`);
  assert.equal(new Set(keys).size, keys.length, 'one row per page and set of issues');
  for (const g of grouped) {
    const own = rows.filter(r => r.id === g.id && g.locales.includes(r.locale));
    assert.deepEqual(own.map(r => r.locale), g.locales);
    for (const r of own) assert.deepEqual(r.issues, g.issues);
    assert.deepEqual(g.titleLengths, own.map(r => r.titleLength));
    assert.deepEqual(g.descriptionLengths, own.map(r => r.descriptionLength));
  }
});

test('two pages with the same description are both flagged, and the editor names the other page', () => {
  const { store, library } = setup();
  const [a, b] = library.health().rows.filter((r) => r.locale === 'en').slice(0, 2);
  const text = 'One description shared by two pages, long enough to pass the length checks.';
  for (const id of [a.id, b.id]) { const e = store.entries.get(id); (e.draft ?? e.live).seo.en.description = text; }
  const rows = library.health().rows.filter((r) => r.locale === 'en' && [a.id, b.id].includes(r.id));
  for (const r of rows) {
    assert.ok(r.issues.includes('descriptionDuplicate'), `${r.id} flagged`);
    assert.deepEqual(r.duplicates.description.map((o) => o.id), [r.id === a.id ? b.id : a.id]);
  }
  const row = library.missingSeo().rows.find((r) => r.id === a.id);
  assert.ok(row.issues.includes('descriptionDuplicate'));
  assert.equal(row.duplicates.en.description[0].id, b.id);
  assert.deepEqual(library.seoConflicts({ entry: a.id, lang: 'en', description: text }).description.map((o) => o.id), [b.id]);
});

test('pages repeating a passage of their own copy are flagged, and the editor names the other page with the passage', () => {
  const { store, library } = setup();
  const [a, b] = library.health().rows.filter((r) => r.locale === 'en').slice(0, 2);
  const passage = 'A passage of page copy written once and pasted onto a second page by mistake.';
  for (const id of [a.id, b.id]) { const e = store.entries.get(id); const c = e.draft ?? e.live; c.locales.en = { ...c.locales.en, extraCopy: passage }; }
  const rows = library.health().rows.filter((r) => r.locale === 'en' && [a.id, b.id].includes(r.id));
  for (const r of rows) {
    assert.ok(r.issues.includes('textDuplicate'), `${r.id} flagged`);
    assert.deepEqual(r.duplicates.text.map((o) => o.id), [r.id === a.id ? b.id : a.id]);
  }
  const named = library.seoConflicts({ entry: a.id, lang: 'en' }).text;
  assert.deepEqual(named.map((o) => o.id), [b.id]);
  assert.equal(named[0].excerpt, passage);
  // Short labels repeating (buttons, headings) are not page text.
  for (const id of [a.id, b.id]) { const e = store.entries.get(id); const c = e.draft ?? e.live; c.locales.en = { ...c.locales.en, extraCopy: 'Read more' }; }
  const after = library.health().rows.find((r) => r.id === a.id && r.locale === 'en');
  assert.ok((after.duplicates.text ?? []).every((o) => o.id !== b.id || o.excerpt !== 'Read more'));
  assert.ok(library.SEO_GROUPS.search.includes('textDuplicate'));
});
