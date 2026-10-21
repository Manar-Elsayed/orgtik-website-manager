const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Load the real pure TS dependency graph, including the website route definitions.
const cache = new Map();
function load(file) {
  if (file.endsWith(".json")) return require(file);
  if (!path.extname(file)) file += ".ts";
  if (cache.has(file)) return cache.get(file).exports;
  const loaded = { exports: {} };
  cache.set(file, loaded);
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
      require: (name) =>
        load(
          name.startsWith("@/")
            ? path.resolve(__dirname, "..", name.slice(2))
            : path.resolve(path.dirname(file), name),
        ),
      URL,
      URLSearchParams,
      Set,
    },
    { filename: file },
  );
  return loaded.exports;
}
const { isCaseFormatExample, caseFormatExamples, caseFormatPreviewHref } = load(
  path.join(__dirname, "caseFormatLabels.ts"),
);
const seed = require("../backend/apps/wm/seed/website.json");
const examples = seed.caseStudies.map((entry) => ({
  ...entry,
  state: entry.workflow.state,
  visibility: entry.workflow.visibility,
  figures: entry.provenance.figures,
}));

test("all five live department stories resolve to their actual format badges", () => {
  const selected = caseFormatExamples(examples.slice().reverse());
  assert.deepEqual(Object.keys(selected), [
    "design",
    "development",
    "hosting",
    "digital-marketing",
    "it-support",
  ]);
  for (const entry of examples) {
    assert.equal(selected[entry.department].id, entry.id);
    const url = new URL(
      caseFormatPreviewHref(selected[entry.department], "en"),
      "https://wm.test",
    );
    assert.equal(url.pathname, "/preview");
    assert.equal(url.searchParams.get("path"), `/work/${entry.slug.en}`);
    assert.equal(url.searchParams.get("section"), "class:cs-header__tags");
    assert.equal(url.searchParams.get("lang"), "en");
  }
});

test("private, archived, card-only and inconsistent story modes are never examples", () => {
  const base = examples[0];
  for (const patch of [
    { visibility: "not_on_site" },
    { visibility: "archived" },
    { narrativePublished: false, sampleNarrativePublished: false },
    {
      narrativePublished: true,
      sampleNarrativePublished: false,
      figures: "sample",
    },
    {
      narrativePublished: false,
      sampleNarrativePublished: true,
      figures: "approved",
    },
    { type: "article" },
    { department: undefined },
    { department: "unknown" },
    { slug: { en: "" } },
  ])
    assert.equal(
      isCaseFormatExample({ ...base, ...patch }),
      false,
      JSON.stringify(patch),
    );
  assert.equal(
    isCaseFormatExample({
      ...base,
      narrativePublished: true,
      sampleNarrativePublished: false,
      figures: "approved",
    }),
    true,
  );
  assert.equal(isCaseFormatExample(base), true);
});

test("selection is deterministic, leaves its input intact, and ignores earlier private examples", () => {
  const later = { ...examples[0], id: "cs_later", order: 30 };
  const tieB = { ...examples[0], id: "cs_b", order: 1 };
  const tieA = { ...examples[0], id: "cs_a", order: 1 };
  const privateExample = {
    ...tieA,
    id: "cs_private",
    order: 0,
    visibility: "not_on_site",
  };
  const entries = [later, tieB, privateExample, tieA];
  const before = JSON.stringify(entries);
  assert.equal(caseFormatExamples(entries).design.id, "cs_a");
  assert.equal(caseFormatExamples(entries.slice().reverse()).design.id, "cs_a");
  assert.equal(JSON.stringify(entries), before);
});

test("a renamed real story keeps its actual address and independently selected content language", () => {
  const renamed = {
    ...examples[0],
    slug: { en: "new-story-address", de: "unused-translated-slug" },
  };
  for (const locale of ["en", "ar", "de", "fr", "it"]) {
    const url = new URL(
      caseFormatPreviewHref(renamed, locale),
      "https://wm.test",
    );
    assert.equal(
      url.searchParams.get("path"),
      `${locale === "en" ? "" : `/${locale}`}/work/new-story-address`,
    );
    assert.equal(url.searchParams.get("lang"), locale);
  }
});

test("no eligible cases yields no examples or invented fallback address", () => {
  assert.deepEqual(Object.keys(caseFormatExamples([])), []);
  assert.deepEqual(
    Object.keys(
      caseFormatExamples(
        examples.map((entry) => ({ ...entry, visibility: "not_on_site" })),
      ),
    ),
    [],
  );
  for (const patch of [
    { visibility: "not_on_site" },
    { slug: { en: "" } },
    { narrativePublished: false, sampleNarrativePublished: false },
  ])
    assert.throws(
      () => caseFormatPreviewHref({ ...examples[0], ...patch }, "en"),
      /published full case-study story/,
    );
});
