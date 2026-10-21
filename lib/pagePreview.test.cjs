const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const file = path.join(__dirname, "pagePreview.ts");
const loaded = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText,
  {
    module: loaded,
    exports: loaded.exports,
    require: (name) => require(path.resolve(__dirname, name)),
    URL,
    URLSearchParams,
    Set,
  },
  { filename: file },
);
const {
  pagePreviewHref,
  pagePreviewTarget,
  localizedPreviewPath,
  previewDetailPath,
  websitePreviewUrl,
} = loaded.exports;

test("all sixteen page editors open their real website route in the selected content language", () => {
  const routes = {
    home: "/",
    services: "/services",
    software: "/software",
    work: "/work",
    about: "/about",
    insights: "/insights",
    contact: "/contact",
    roadmap: "/roadmap",
    legal: "/legal",
    signIn: "/sign-in",
    faq: "/faq",
    partners: "/legal/partners",
    plans: "/plans",
    cart: "/cart",
    checkout: "/checkout",
    signUp: "/sign-up",
  };
  for (const [id, expected] of Object.entries(routes)) {
    const url = new URL(
      pagePreviewHref({ pageId: `pg_${id}`, locale: "ar", section: "hero" }),
      "https://wm.test",
    );
    assert.equal(url.pathname, "/preview");
    assert.equal(
      url.searchParams.get("path"),
      `/ar${expected === "/" ? "" : expected}`,
    );
    assert.equal(url.searchParams.get("lang"), "ar");
  }
});

test("compound content and nested card paths preview their public containing section", () => {
  for (const [id, child, expected] of [
    ["pg_home", "heroWords", "cms:hero"],
    ["pg_home", "homeServices.0.title", "cms:services"],
    ["pg_software", "context", "cms:workspace"],
    ["pg_software", "flow.1.body", "cms:workspace"],
    ["pg_about", "journeySteps.0.title", "cms:journey"],
    ["pg_contact", "topics", "cms:hero"],
    ["pg_legal", "legal", "cms:hero"],
    ["pg_faq", "faqs", "cms:questions"],
    ["pg_signUp", "signin", "cms:signin"],
    ["pg_services", "bundle", "id:svc-builder"],
    ["pg_software", "ready-made-bundles", "id:software-bundles"],
  ])
    assert.equal(pagePreviewTarget(id, child), expected, `${id}/${child}`);
});

test("shared commerce selectors target their actual containers without inventing visitor state", () => {
  assert.equal(
    pagePreviewTarget("pg_plans", "purchasePlans-intro"),
    "class:purchase-directory-intro",
  );
  assert.equal(
    pagePreviewTarget("pg_plans", "purchaseUI-hero"),
    "id:service-bundles",
  );
  assert.equal(
    pagePreviewTarget("pg_cart", "purchaseCart-header"),
    "class:purchase-cart-group",
  );
  assert.equal(
    pagePreviewTarget("pg_checkout", "purchaseCheckout-hero"),
    "class:purchase-confirmation",
  );
  assert.equal(
    pagePreviewTarget("pg_checkout", "purchaseCheckout-section-1"),
    "class:purchase-receipt",
  );
  assert.equal(
    pagePreviewTarget("pg_checkout", "paymentDetails-intro"),
    "class:purchase-payment-details",
  );
  assert.equal(
    pagePreviewTarget("pg_cart", "purchaseControls-hero"),
    "class:purchase-overlap__version--current",
  );
  const builder = new URL(
    pagePreviewHref({
      pageId: "pg_plans",
      section: "purchaseUI-section-1",
      locale: "fr",
    }),
    "https://wm.test",
  );
  assert.equal(builder.searchParams.get("path"), "/fr/services");
  assert.equal(builder.searchParams.get("section"), "id:svc-builder");
  assert.equal(pagePreviewTarget("pg_home", "seo"), undefined);
});

test("detail templates use an address from the permitted catalog and preserve content language", () => {
  const addresses = [
    { path: "/software/plans/old", onSite: true },
    { path: "/software/private", onSite: false },
    { path: "/software/hr", onSite: true },
  ];
  assert.equal(
    previewDetailPath("/software", "/software", addresses, "de"),
    "/de/software/hr",
  );
  assert.equal(
    previewDetailPath("/software/crm", "/software", addresses, "fr"),
    "/fr/software/crm",
  );
  assert.equal(
    previewDetailPath("/services", "/services", addresses, "ar"),
    "/ar/services",
  );
  const url = new URL(
    pagePreviewHref({
      pageId: "pg_services",
      section: "department-bundles",
      locale: "en",
    }),
    "https://wm.test",
  );
  assert.equal(url.searchParams.get("detail"), "/services");
  assert.equal(url.searchParams.get("section"), "id:plans-section");
});

test("actual frame URL keeps query before hash and never carries a draft access token", () => {
  const url = new URL(
    websitePreviewUrl("https://site.test", "/services?bundle=care#families", {
      locale: "ar",
      section: "id:svc-builder",
    }),
  );
  assert.equal(url.pathname, "/ar/services");
  assert.equal(url.searchParams.get("bundle"), "care");
  assert.equal(url.searchParams.has("preview"), true);
  assert.equal(url.searchParams.get("previewSection"), "id:svc-builder");
  assert.equal(url.hash, "#families");
  assert.equal(url.searchParams.has("token"), false);
  assert.equal(
    localizedPreviewPath("/de/about?x=1#journey", "fr"),
    "/fr/about?x=1#journey",
  );
  assert.equal(localizedPreviewPath("https://outside.test/path", "en"), "/");
  assert.equal(
    new URL(
      websitePreviewUrl("https://site.test", "//outside.test", {
        locale: "en",
      }),
    ).origin,
    "https://site.test",
  );
});
