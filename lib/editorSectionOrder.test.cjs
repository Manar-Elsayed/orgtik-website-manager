const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cache = new Map();

function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      require(name) {
        let target = name.startsWith("@/lib/")
          ? path.join(__dirname, name.slice(6))
          : path.resolve(path.dirname(file), name);
        if (!path.extname(target)) target += ".ts";
        return target.endsWith(".json")
          ? JSON.parse(fs.readFileSync(target, "utf8"))
          : load(target);
      },
    },
    { filename: file },
  );
  return module.exports;
}

const { orderEditorSections } = load(
  path.join(__dirname, "editorSectionOrder.ts"),
);
const { TYPES } = load(path.join(__dirname, "contentTypes.ts"));
const { makeStore } = require("../backend/apps/wm/content");
const mapping = require("./cms-sections.json");
const manager = require("./manager-pages.json");
const store = makeStore(() => "2026-10-15T08:00:00.000Z", { demo: true });
const sharedPages = [
  "pg_faq",
  "pg_plans",
  "pg_cart",
  "pg_checkout",
  "pg_signUp",
];
const keys = (items) => Array.from(items, (item) => item.value);
const tabs = (pageId) => {
  const entry = store.entries.get(pageId);
  return [
    ...TYPES.page.sections({ id: pageId, content: entry.live }),
    ...Object.keys(mapping[pageId]?.references ?? {}).map((value) => ({
      value,
      path: "",
      node: { kind: "group", fields: {} },
    })),
    ...(sharedPages.includes(pageId) ? [{ value: "shared-copy" }] : []),
  ];
};

test("Home's shared partners and reviews stay in their actual website positions", () => {
  assert.deepEqual(keys(orderEditorSections("pg_home", tabs("pg_home"))), [
    "hero",
    "heroWords",
    "two-sides",
    "partners",
    "work",
    "services",
    "software",
    "approach",
    "faqs",
    "reviews",
    "closing",
  ]);
});

test("all sixteen pages retain every tab and use their audited page order", () => {
  const pages = [...store.entries.values()].filter(
    (entry) => entry.type === "page" && entry.id.startsWith("pg_"),
  );
  assert.equal(pages.length, 16);
  for (const page of pages) {
    const original = tabs(page.id);
    const ordered = orderEditorSections(page.id, original);
    const result = keys(ordered);
    assert.equal(
      new Set(result).size,
      result.length,
      `${page.id}: no duplicate tabs`,
    );
    assert.deepEqual(
      [...result].sort(),
      [...new Set(keys(original))].sort(),
      `${page.id}: no lost tabs`,
    );
    for (const section of ordered)
      assert.strictEqual(
        section,
        original.find((item) => item.value === section.value),
      );
    const configured = manager[page.id]?.editor;
    const expected = configured ?? mapping[page.id]?.body ?? [];
    const relevant = expected.filter((value) => result.includes(value));
    assert.deepEqual(
      result.filter((value) => expected.includes(value)),
      relevant,
      `${page.id}: website order`,
    );
  }
  assert.deepEqual(
    keys(orderEditorSections("pg_services", tabs("pg_services"))),
    [
      "hero",
      "rotation-words",
      "families",
      "all-services",
      "ready-made-bundles",
      "bundle",
      "stories",
      "department-bundles",
      "approach",
      "reviews",
    ],
  );
  assert.deepEqual(
    keys(orderEditorSections("pg_roadmap", tabs("pg_roadmap"))).slice(0, 4),
    ["hero", "timeline", "community", "submit-idea"],
  );
});

test("saved body ordering matches the website while keeping supporting headline inputs beside their section", () => {
  const source = [
    ...tabs("pg_home"),
    { value: "future-tab" },
    { value: "seo" },
  ];
  const saved = ["reviews", "hero", "reviews", "unknown", "two-sides"];
  const before = JSON.stringify({ source, saved });
  const result = keys(orderEditorSections("pg_home", source, saved));
  assert.deepEqual(result, [
    "reviews",
    "hero",
    "heroWords",
    "two-sides",
    "partners",
    "work",
    "services",
    "software",
    "approach",
    "faqs",
    "closing",
    "future-tab",
    "seo",
  ]);
  assert.deepEqual(
    result.filter((key) => mapping.pg_home.body.includes(key)),
    [
      "reviews",
      "hero",
      "two-sides",
      "partners",
      "work",
      "services",
      "software",
      "approach",
      "faqs",
      "closing",
    ],
  );
  assert.equal(
    JSON.stringify({ source, saved }),
    before,
    "the helper never changes values or persisted order",
  );
});

test("saved page order keeps Services bundle controls together and cursor settings after the page body", () => {
  const services = keys(
    orderEditorSections("pg_services", tabs("pg_services"), ["reviews"]),
  );
  assert.deepEqual(services, [
    "reviews",
    "hero",
    "rotation-words",
    "families",
    "all-services",
    "ready-made-bundles",
    "bundle",
    "stories",
    "department-bundles",
    "approach",
  ]);
  const roadmap = keys(
    orderEditorSections("pg_roadmap", tabs("pg_roadmap"), ["submit-idea"]),
  );
  assert.deepEqual(roadmap.slice(0, 4), [
    "submit-idea",
    "hero",
    "timeline",
    "community",
  ]);
  assert.ok(
    roadmap.indexOf("intro") >= 4,
    "the retained pointer/cursor tab follows the page sections",
  );
});

test("unknown or repeated tabs stay available once, absent body slots are not invented, and SEO stays last", () => {
  const first = { value: "future", content: "keep me" };
  const source = [
    { value: "seo" },
    first,
    { value: "future", content: "duplicate" },
    { value: "hero" },
  ];
  const result = orderEditorSections("pg_home", source, ["closing", "hero"]);
  assert.deepEqual(keys(result), ["hero", "future", "seo"]);
  assert.strictEqual(result[1], first);
  assert.deepEqual(keys(orderEditorSections("gl_future", source, ["hero"])), [
    "future",
    "hero",
    "seo",
  ]);
});
