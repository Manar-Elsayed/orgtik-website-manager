// robots.txt: parsing, Google's longest-match testing, and the warnings shown before saving.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseRobots, testRobots, robotsWarnings } = require('./robots');

const ROBOTS = [
  'User-agent: *',
  'Disallow: /checkout',
  'Allow: /checkout/help',
  'Disallow: /*.pdf$',
  '',
  'User-agent: Googlebot-Image',
  'Disallow: /',
  '',
  'Sitemap: https://site.test/sitemap.xml',
  'Nonsense line',
].join('\n');

test('groups, sitemap lines and lines not understood', () => {
  const parsed = parseRobots(ROBOTS);
  assert.equal(parsed.groups.length, 2);
  assert.deepEqual(parsed.sitemaps, ['https://site.test/sitemap.xml']);
  assert.deepEqual(parsed.unknown, [10]);
});

test('the longest matching rule wins, Allow on a tie, and wildcards and $ work', () => {
  assert.equal(testRobots(ROBOTS, '/checkout').allowed, false);
  assert.equal(testRobots(ROBOTS, '/checkout/help').allowed, true, 'the longer Allow wins');
  assert.equal(testRobots(ROBOTS, '/files/brochure.pdf').allowed, false);
  assert.equal(testRobots(ROBOTS, '/files/brochure.pdf?x=1').allowed, true, '$ anchors the end');
  assert.equal(testRobots(ROBOTS, '/services').allowed, true);
  assert.equal(testRobots(ROBOTS, '/services', 'Googlebot-Image').allowed, false, 'an agent uses its own group');
  assert.equal(testRobots('User-agent: *\nDisallow:\n', '/anything').allowed, true, 'an empty Disallow allows everything');
  assert.deepEqual(testRobots(ROBOTS, '/checkout').rule, { type: 'disallow', path: '/checkout', line: 2 });
});

test('warnings: blocked pages that should be found, blocked noindex pages, the sitemap line', () => {
  const pages = [{ path: '/services', indexable: true }, { path: '/checkout', indexable: false }, { path: '/legal/terms', indexable: true }];
  const kinds = (text, opts = {}) => robotsWarnings(text, { pages, canonicalHost: 'https://site.test', visible: true, ...opts }).map((w) => w.kind);
  assert.deepEqual(kinds('User-agent: *\nDisallow: /legal\nSitemap: https://site.test/sitemap.xml\n'), ['blocksIndexable']);
  assert.deepEqual(kinds('User-agent: *\nDisallow: /checkout\nSitemap: https://site.test/sitemap.xml\n'), ['blocksNoindex']);
  assert.deepEqual(kinds('User-agent: *\nDisallow: /\n'), ['blocksHome', 'blocksIndexable', 'blocksNoindex', 'noSitemapLine']);
  assert.deepEqual(kinds('User-agent: *\nAllow: /\nSitemap: https://other.test/sitemap.xml\n'), ['sitemapOtherHost']);
  assert.deepEqual(kinds('User-agent: *\nAllow: /\n', { visible: false }), [], 'a hidden site needs no Sitemap line');
});
