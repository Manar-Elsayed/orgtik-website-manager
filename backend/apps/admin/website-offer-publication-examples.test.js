const assert = require("node:assert/strict");
const { test } = require("node:test");
const { makeStore } = require("./store");
const { offers } = require("./seed-website-offers");
const { registerCatalog, publicCatalog } = require("./website-offers");

const EXAMPLES = ["design/graphic-design", "development/web-development", "hr", "crm"];
const PUBLISHED_AT = "2026-10-01T09:00:00.000Z";
const clone = value => structuredClone(value);

function fixture() {
  const S = makeStore({ identity: { users: [], findByKey: () => null } });
  registerCatalog(S);
  return S;
}

function legacyFixture() {
  const S = fixture();
  delete S.db.websiteOfferPublicationExamplesVersion;
  for (const offer of S.db.websiteOffers) {
    delete offer.publishedAt;
    delete offer.publishedBy;
  }
  return S;
}

function catalog(S, country) {
  const currency = S.db.countries[country].currency;
  return publicCatalog(S, {
    workspace: { country, currency, billing: { country }, members: [], lines: [] },
    region: { country, currency, source: "publication-fixture" },
  });
}

function withoutPublication(value) {
  const result = clone(value);
  for (const item of result.items) delete item.publishedAt;
  return result;
}

function publicationIds(S) {
  return S.db.websiteOffers.filter(offer => offer.publishedAt).map(offer => offer.id).sort();
}

test("catalog seeds show published and unpublished examples under both actual catalog owners", () => {
  const S = fixture();
  assert.equal(S.db.websiteOffers.length, 16);
  assert.deepEqual(publicationIds(S), [...EXAMPLES].sort());
  for (const kind of ["service", "software"]) {
    const rows = S.db.websiteOffers.filter(offer => offer.kind === kind);
    assert.equal(rows.length, kind === "service" ? 10 : 6);
    assert.equal(rows.filter(offer => offer.publishedAt).length, 2);
    assert.equal(rows.filter(offer => !offer.publishedAt).length, kind === "service" ? 8 : 4);
  }
  for (const id of EXAMPLES) {
    const row = S.db.websiteOffers.find(offer => offer.id === id);
    assert.equal(row.publishedAt, PUBLISHED_AT);
    assert.equal(row.publishedBy, "seed");
  }
  const visible = catalog(S, "CH");
  assert.equal(visible.items.length, 16, "publication provenance does not change availability");
  assert.deepEqual(visible.items.filter(offer => offer.publishedAt).map(offer => offer.id).sort(), [...EXAMPLES].sort());
  assert.ok(visible.items.filter(offer => offer.kind === "service").every(offer => offer.managedIn === "crm"));
  assert.ok(visible.items.filter(offer => offer.kind === "software").every(offer => offer.managedIn === "console"));
  assert.equal(S.db.websiteOfferPublicationExamplesVersion, 1);
});

test("legacy publication backfill leaves regional prices, availability and retained commercial records unchanged", () => {
  const S = legacyFixture();
  S.db.publicWebsiteQuotes.push({ id: "retained-quote", snapshot: { amount: 123, currency: "CHF" } });
  S.db.publicWebsiteOrders.push({ id: "retained-order", snapshot: { amount: 456, currency: "EGP" } });
  const countries = ["CH", "EG", "SA", "KW"];
  const beforeCatalogs = countries.map(country => withoutPublication(catalog(S, country)));
  const authorityKeys = ["tools", "services", "plans", "grid", "countries", "currencies", "websiteOfferBundles", "workspaces", "invoices", "publicWebsiteQuotes", "publicWebsiteOrders", "websiteOrderLinks", "priceVersion", "audit", "pricingLog"];
  const beforeAuthority = Object.fromEntries(authorityKeys.map(key => [key, clone(S.db[key])]));
  registerCatalog(S);
  assert.deepEqual(countries.map(country => withoutPublication(catalog(S, country))), beforeCatalogs);
  assert.deepEqual(Object.fromEntries(authorityKeys.map(key => [key, S.db[key]])), beforeAuthority);
  assert.deepEqual(publicationIds(S), [...EXAMPLES].sort());
});

test("legacy migration recognizes pristine seed values independent of object property order and runs once", () => {
  const S = legacyFixture();
  S.db.websiteOffers = S.db.websiteOffers.map(offer => Object.fromEntries(Object.entries(offer).reverse()));
  registerCatalog(S);
  assert.deepEqual(publicationIds(S), [...EXAMPLES].sort());
  const migrated = S.exportState();
  registerCatalog(S);
  assert.deepEqual(S.exportState(), migrated);
  assert.ok(offers.filter(offer => EXAMPLES.includes(offer.id)).every(offer => offer.publishedAt === PUBLISHED_AT), "migration never mutates the seed baseline");
});

test("publication migration preserves edited, explicitly cleared, drafted and removed owner records", async t => {
  const changes = {
    "edited translated name": offer => { offer.name.en = "Saved owner wording"; },
    "edited price metadata": offer => { offer.monthlyCHF += 25; },
    "retained owner metadata": offer => { offer.description = { en: "Saved owner description" }; },
    "retained draft": offer => { offer.draft = { name: { en: "Pending CRM wording" }, updatedBy: "manager" }; },
    "explicit null draft": offer => { offer.draft = null; },
    "explicit undefined draft": offer => { offer.draft = undefined; },
    "explicit null publication": offer => { offer.publishedAt = null; },
    "explicit empty publication": offer => { offer.publishedAt = ""; },
    "explicit undefined publication": offer => { offer.publishedAt = undefined; },
    "existing owner publication": offer => { offer.publishedAt = "2026-10-05T12:00:00.000Z"; offer.publishedBy = "manager"; },
    "existing owner without date": offer => { offer.publishedBy = "manager"; },
    "explicit null author": offer => { offer.publishedBy = null; },
    "explicit undefined author": offer => { offer.publishedBy = undefined; },
  };
  for (const [name, change] of Object.entries(changes)) await t.test(name, () => {
    const S = legacyFixture();
    const row = S.db.websiteOffers.find(offer => offer.id === EXAMPLES[0]);
    change(row);
    const saved = clone(row);
    registerCatalog(S);
    assert.deepEqual(row, saved);
    assert.equal(S.db.websiteOfferPublicationExamplesVersion, 1);
    assert.ok(S.db.websiteOffers.filter(offer => EXAMPLES.slice(1).includes(offer.id)).every(offer => offer.publishedAt === PUBLISHED_AT));
  });
  await t.test("removed offer is not recreated", () => {
    const S = legacyFixture();
    S.db.websiteOffers = S.db.websiteOffers.filter(offer => offer.id !== EXAMPLES[0]);
    registerCatalog(S);
    assert.equal(S.db.websiteOffers.some(offer => offer.id === EXAMPLES[0]), false);
    assert.equal(S.db.websiteOffers.length, 15);
    assert.equal(S.db.websiteOfferPublicationExamplesVersion, 1);
  });
});

test("persisted migration receipt preserves subsequent owner clears and never downgrades a future version", () => {
  const S = fixture();
  for (const offer of S.db.websiteOffers) {
    delete offer.publishedAt;
    delete offer.publishedBy;
  }
  const saved = S.exportState();
  const restored = fixture();
  restored.importState(saved);
  registerCatalog(restored);
  assert.deepEqual(publicationIds(restored), []);
  assert.equal(restored.db.websiteOfferPublicationExamplesVersion, 1);
  assert.deepEqual(restored.exportState(), saved);
  const future = legacyFixture();
  future.db.websiteOfferPublicationExamplesVersion = 2;
  const futureSaved = future.exportState();
  registerCatalog(future);
  assert.deepEqual(future.exportState(), futureSaved);
});
