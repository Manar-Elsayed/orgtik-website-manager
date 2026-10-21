// Reading the live website: its files, a probe that doesn't follow redirects, and the sitemap check.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeLiveSite, readSitemap } = require('./live-site');

const site = (routes) => async (url, init) => {
  assert.equal(init.redirect, 'manual');
  const path = new URL(url).pathname;
  const route = routes[path];
  if (!route) return new Response('not found', { status: 404 });
  return new Response(route.body ?? null, { status: route.status ?? 200, headers: route.headers ?? {} });
};

test('the snapshot reads build.json, the sitemap and robots.txt from the website address', async () => {
  const live = makeLiveSite({ env: { NEXT_PUBLIC_WEBSITE_URL: 'https://site.test/' }, fetcher: site({
    '/build.json': { body: JSON.stringify({ builtAt: '2026-10-21T10:00:00.000Z', redirects: [] }) },
    '/sitemap.xml': { body: '<?xml version="1.0"?><urlset></urlset>' },
    '/robots.txt': { body: 'User-agent: *\nAllow: /\n' },
  }) });
  const snap = await live.snapshot();
  assert.equal(snap.reachable, true);
  assert.equal(snap.url, 'https://site.test');
  assert.equal(snap.build.builtAt, '2026-10-21T10:00:00.000Z');
  assert.match(snap.robots.text, /Allow/);
});

test('without a website address nothing is fetched, and an unreachable site says so', async () => {
  assert.deepEqual(await makeLiveSite({ env: {}, fetcher: () => { throw new Error('no fetch'); } }).snapshot(), { configured: false, reachable: false, url: null });
  const down = makeLiveSite({ env: { WEBSITE_URL: 'https://down.test' }, fetcher: async () => { throw new Error('offline'); } });
  assert.equal((await down.snapshot()).reachable, false);
});

test('a probe reports the status and absolute Location without following it', async () => {
  const live = makeLiveSite({ env: { WEBSITE_URL: 'https://site.test' }, fetcher: site({ '/old': { status: 301, headers: { location: '/new?x=1' } } }) });
  assert.deepEqual(await live.probe('/old'), { configured: true, url: 'https://site.test/old', status: 301, location: 'https://site.test/new?x=1' });
  assert.equal((await live.probe('/missing')).status, 404);
});

test('the sitemap check: valid XML, addresses on the canonical host, a lastmod for each', () => {
  const ok = readSitemap('<?xml version="1.0"?>\n<urlset xmlns="x">\n  <url><loc>https://site.test/a</loc><lastmod>2026-10-01</lastmod></url>\n</urlset>\n', 'https://site.test');
  assert.deepEqual(ok, { urls: ['https://site.test/a'], problems: [] });
  const bad = readSitemap('<urlset><url><loc>https://other.test/a</loc></url>', 'https://site.test');
  assert.deepEqual(bad.problems.sort(), ['no_lastmod', 'not_valid_xml', 'other_host']);
  assert.deepEqual(readSitemap(null, 'https://site.test').problems, ['missing']);
});
