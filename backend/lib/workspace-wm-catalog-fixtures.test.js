// Isolated gateway/checkpoint fixtures only; no retained preview catalog is changed.
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawn } = require('node:child_process');

const EXAMPLES = ['design/graphic-design', 'development/web-development', 'hr', 'crm'];
const PUBLISHED_AT = '2026-10-01T09:00:00.000Z';
const clone = value => structuredClone(value);
const commercialState = S => clone(Object.fromEntries([
  'plans', 'grid', 'countries', 'currencies', 'priceVersion', 'invoices',
  'publicWebsiteQuotes', 'publicWebsiteOrders', 'websiteOrderLinks', 'serviceRequests',
].map(key => [key, S.db[key]]).concat([['workspaces', S.db.workspaces.map(row => ({
  id: row.id, state: row.state, billing: row.billing, lines: row.lines,
}))]])));

async function child(phase) {
  const journal = require('./journal'), backend = journal.fileStore(process.env.WM_CATALOG_JOURNAL);
  journal.pickStore = () => ({ sandbox: 'wm-catalog-fixtures', store: backend });
  const http = require('node:http'), server = http.createServer(require('../api/index'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Native HTTP accepts every OS-selected port, including fetch's blocked ports.
  const call = (route, token, method = 'GET', body, headers = {}) => new Promise((resolve, reject) => {
    const request = http.request(origin + route, { method, headers: {
      connection: 'close', ...(token ? { authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}), ...headers,
    } }, response => {
      let raw = ''; response.setEncoding('utf8');
      response.on('data', chunk => { raw += chunk; });
      response.on('end', () => {
        try { resolve({ status: response.statusCode, body: raw ? JSON.parse(raw) : null }); }
        catch (error) { reject(error); }
      });
      response.on('error', reject);
    });
    request.setTimeout(20000, () => request.destroy(new Error('Catalog fixture request timed out')));
    request.on('error', reject); request.end(body ? JSON.stringify(body) : undefined);
  });
  const good = response => {
    assert.ok(response.status < 300, `${response.status}: ${JSON.stringify(response.body)}`);
    return response.body?.data;
  };
  try {
    const session = good(await call('/sos/api/auth/login', null, 'POST', {
      email: 'mona.adel@orgtik.test', password: 'Local@2026', mode: 'staff', target: 'wm',
    })), token = session.tokens.accessToken;
    const S = require('../apps/admin').getStore();
    const before = commercialState(S);
    const facts = phase === 'fresh' ? null : JSON.parse(fs.readFileSync(process.env.WM_CATALOG_FACTS, 'utf8'));
    if (facts) assert.deepEqual(before, facts.commercial, 'hydration preserves retained prices, plans and billing');
    let ch;
    for (const country of ['CH', 'EG']) {
      const mirror = good(await call('/wm/v2/admin/catalog?country=' + country, token));
      const published = good(await call('/admin/v1/public/catalog', null, 'GET', undefined, { 'x-mock-country': country }));
      assert.equal(mirror.readOnly, true);
      assert.equal(mirror.country, country);
      assert.equal(mirror.region.country, country);
      assert.equal(mirror.currency, S.db.countries[country].currency);
      assert.equal(mirror.currency, published.currency);
      assert.equal(mirror.decimals, published.decimals);
      assert.equal(mirror.priceVersion, S.db.priceVersion);
      assert.equal(mirror.items.length, S.db.websiteOffers.length);
      for (const row of mirror.items) {
        const canonical = S.db.websiteOffers.find(offer => offer.id === row.id);
        const offer = published.items.find(item => item.id === row.id);
        assert.equal(row.publishedAt, canonical.publishedAt || null);
        assert.equal(row.available, Boolean(offer), 'publication provenance is separate from actual availability');
        assert.equal(row.managedIn, row.kind === 'service' ? 'crm' : 'console');
        assert.equal(row.scope, row.kind === 'service' ? 'sales' : 'platform_admin');
        assert.equal(row.planId, canonical.planId || canonical.serviceId);
        assert.equal(row.serviceId, canonical.serviceId || null);
        assert.equal(row.toolId, canonical.tool || null);
        assert.equal(row.workspaceId, row.kind === 'service' ? 'ws_orgtik' : null);
        assert.equal(row.path, row.kind === 'service'
          ? '/catalog/services/' + encodeURIComponent(canonical.serviceId)
          : '/catalog/software?offer=' + encodeURIComponent(canonical.id));
        if (offer) {
          assert.equal(row.managedIn, offer.managedIn);
          assert.equal(row.monthlyMinor, offer.monthlyMinor, 'WM uses the canonical country-resolved public price');
          assert.deepEqual(row.prices, offer.prices);
          assert.equal(row.publishedAt, offer.publishedAt || null);
        }
      }
      if (country === 'CH') ch = mirror;
    }
    assert.deepEqual(commercialState(S), before, 'catalog reads never modify commercial or retained order state');
    assert.equal(S.db.websiteOfferPublicationExamplesVersion, 1);
    const marked = ch.items.filter(row => row.publishedAt).map(row => row.id).sort();
    if (phase === 'fresh' || phase === 'migrated') {
      assert.deepEqual(marked, [...EXAMPLES].sort());
      assert.equal(ch.items.length, 16);
      for (const kind of ['service', 'software']) {
        const rows = ch.items.filter(row => row.kind === kind);
        assert.equal(rows.filter(row => row.publishedAt).length, 2);
        assert.ok(rows.some(row => !row.publishedAt), 'each catalog retains unpublished examples');
      }
      for (const id of EXAMPLES) {
        const row = S.db.websiteOffers.find(offer => offer.id === id);
        assert.equal(row.publishedAt, PUBLISHED_AT); assert.equal(row.publishedBy, 'seed');
        assert.equal(ch.items.find(offer => offer.id === id).available, true);
      }
    } else if (phase === 'cleared') {
      assert.deepEqual(marked, [], 'the persisted receipt prevents re-stamping owner-cleared metadata');
    } else if (phase === 'preserved') {
      assert.deepEqual(marked, []);
      assert.equal(ch.items.find(row => row.id === EXAMPLES[0]).name.en, 'Owner-retained catalog wording');
      assert.equal(S.db.websiteOffers.find(row => row.id === EXAMPLES[1]).publishedAt, null);
      assert.deepEqual(S.db.websiteOffers.find(row => row.id === EXAMPLES[2]).draft, { description: { en: 'Retained pending metadata' } });
      assert.ok(!ch.items.some(row => row.id === EXAMPLES[3]));
      assert.equal(ch.items.length, 15);
    }
    if (phase === 'fresh' || phase === 'migrated') {
      // A real noncommercial WM mutation persists the hydrated platform receipt.
      good(await call('/wm/v2/admin/roles', token, 'POST', { label: 'Catalog checkpoint ' + phase, permissions: ['content:view'] }));
      assert.deepEqual(commercialState(S), before);
      const snapshot = await backend.snapshot();
      const saved = snapshot.entries.map(JSON.parse).filter(row => row.checkpoint).at(-1);
      assert.ok(saved, 'the gateway committed an actual domain checkpoint');
      const checkpoint = require('./domain-checkpoint').decodeDomainCheckpoint(saved.checkpoint);
      assert.equal(checkpoint.platformState.db.websiteOfferPublicationExamplesVersion, 1);
      if (phase === 'fresh') fs.writeFileSync(process.env.WM_CATALOG_FACTS, JSON.stringify({ commercial: before }));
    }
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  }
}

if (process.env.WM_CATALOG_PHASE) child(process.env.WM_CATALOG_PHASE).catch(error => {
  console.error(error.stack); process.exitCode = 1;
});
else require('node:test').test('WM catalog fixtures expose canonical publication states and retain their migration receipt across gateway restarts', { timeout: 90000 }, async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-catalog-fixtures-'));
  const journalFile = path.join(folder, 'journal.json');
  const env = {
    ...process.env, MOCK_AUTH_FILE: path.join(folder, 'accounts.json'), MOCK_AUTH_STORE: 'file',
    MOCK_SANDBOX: 'wm-catalog-fixtures', MOCK_PUBLIC_URL: '', VERCEL: '', KV_REST_API_URL: '',
    KV_REST_API_TOKEN: '', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '',
    MOCK_CLOCK: 'frozen', MOCK_NOW: '2026-10-15T10:00:00Z',
    WM_CATALOG_JOURNAL: journalFile, WM_CATALOG_FACTS: path.join(folder, 'facts.json'),
  };
  const run = phase => new Promise((resolve, reject) => {
    const process_ = spawn(process.execPath, [__filename, '--only=sos,admin,wm'], {
      env: { ...env, WM_CATALOG_PHASE: phase }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    process_.stdout.on('data', chunk => { output += chunk; });
    process_.stderr.on('data', chunk => { output += chunk; });
    process_.on('error', reject);
    process_.on('exit', code => code === 0 ? resolve() : reject(new Error('Catalog ' + phase + ' failed\n' + output.slice(-7000))));
  });
  const amendCheckpoint = async change => {
    const backend = require('./journal').fileStore(journalFile), snapshot = await backend.snapshot();
    const saved = snapshot.entries.map(JSON.parse).filter(row => row.checkpoint).at(-1);
    assert.ok(saved);
    const codec = require('./domain-checkpoint'), checkpoint = codec.decodeDomainCheckpoint(saved.checkpoint);
    change(checkpoint.platformState.db);
    await backend.commit({
      epoch: snapshot.meta.epoch, kind: 'workspace-v1', app: 'admin', method: 'SYSTEM',
      url: '/__fixture/catalog-publication-hydration', headers: {}, body: null,
      at: Date.parse(env.MOCK_NOW), checkpoint: codec.encodeDomainCheckpoint(checkpoint),
    }, { expectedEpoch: snapshot.meta.epoch, expectedRevision: snapshot.revision });
  };
  const unmark = db => {
    for (const offer of db.websiteOffers) { delete offer.publishedAt; delete offer.publishedBy; }
  };
  try {
    await run('fresh');
    await amendCheckpoint(db => { unmark(db); delete db.websiteOfferPublicationExamplesVersion; });
    await run('migrated');
    await amendCheckpoint(unmark);
    await run('cleared');
    await amendCheckpoint(db => {
      delete db.websiteOfferPublicationExamplesVersion;
      db.websiteOffers.find(row => row.id === EXAMPLES[0]).name.en = 'Owner-retained catalog wording';
      db.websiteOffers.find(row => row.id === EXAMPLES[1]).publishedAt = null;
      db.websiteOffers.find(row => row.id === EXAMPLES[2]).draft = { description: { en: 'Retained pending metadata' } };
      db.websiteOffers = db.websiteOffers.filter(row => row.id !== EXAMPLES[3]);
    });
    await run('preserved');
  } finally {
    const resolved = fs.realpathSync(folder), parent = fs.realpathSync(os.tmpdir()) + path.sep;
    assert.ok(resolved.startsWith(parent) && path.basename(resolved).startsWith('wm-catalog-fixtures-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
