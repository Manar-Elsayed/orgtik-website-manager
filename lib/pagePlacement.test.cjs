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
const { TYPES } = load(path.join(__dirname, "contentTypes.ts"));
const {
  PAGE_PLACEMENTS,
  PAGE_PLACEMENT_COPY,
  pageSectionPlacement,
  pageFieldPlacement,
  decoratePageNode,
} = load(path.join(__dirname, "pagePlacement.ts"));
const { makeStore } = require("../backend/apps/wm/content");
const manager = require("./manager-pages.json");
const sectionMap = require("./cms-sections.json");
const store = makeStore(() => "2026-10-15T08:00:00.000Z", { demo: true });
function leaves(node, where, visit) {
  if (node.kind === "group")
    for (const [key, child] of Object.entries(node.fields))
      leaves(child, where ? `${where}.${key}` : key, visit);
  else if (node.kind === "list") leaves(node.item, `${where}.*`, visit);
  else visit(where, node);
}
function checkFields(pageId, section, record, node, where, missing) {
  leaves(node, where, (fieldPath) => {
    if (!pageFieldPlacement(pageId, section, record, fieldPath))
      missing.push(`${pageId}/${section}: ${record}.${fieldPath}`);
  });
}
test("every current page input has a source-traced label, including supplemental and shared canonical fields", () => {
  const pages = [...store.entries.values()].filter((e) => e.type === "page");
  assert.equal(pages.length, 16);
  const missing = [];
  for (const page of pages) {
    const sections = TYPES.page.sections({ id: page.id, content: page.live });
    for (const section of sections) {
      assert.ok(
        pageSectionPlacement(page.id, section.value),
        `${page.id}/${section.value}: location guidance`,
      );
      const custom = manager[page.id]?.fields?.[section.value];
      if (custom)
        for (const field of custom.fields) {
          if (
            !pageFieldPlacement(
              page.id,
              section.value,
              field.record,
              field.path,
            )
          )
            missing.push(
              `${page.id}/${section.value}: ${field.record}.${field.path}`,
            );
        }
      else if (section.value !== "intro")
        checkFields(
          page.id,
          section.value,
          page.id,
          section.node,
          section.path,
          missing,
        );
    }
    for (const [section, group] of Object.entries(
      manager[page.id]?.supplemental ?? {},
    ))
      for (const field of group.fields) {
        assert.ok(
          pageFieldPlacement(page.id, section, field.record, field.path),
          `${page.id}/${section}: supplemental ${field.record}.${field.path}`,
        );
      }
    for (const reference of Object.keys(sectionMap[page.id]?.references ?? {}))
      assert.ok(
        pageSectionPlacement(page.id, reference),
        `${page.id}/${reference}: shared record location`,
      );
    const shared = sectionMap[page.id]?.shared;
    if (shared) {
      assert.ok(
        pageSectionPlacement(page.id, "shared-copy"),
        `${page.id}: shared content guidance`,
      );
      if (shared.record !== "gl_commerce") {
        const source = store.entries.get(shared.record);
        for (const section of TYPES.page
          .sections({ content: source.live })
          .filter((s) =>
            shared.prefixes.some((prefix) => s.value.startsWith(prefix)),
          ))
          checkFields(
            page.id,
            section.value,
            source.id,
            section.node,
            section.path,
            missing,
          );
      }
    }
  }
  assert.deepEqual(missing, []);
});
test("every shared Global and content-record input has a location or an explicit retained/review explanation", () => {
  const shared = new Set([
    "gl_header",
    "gl_footer",
    "gl_components",
    "gl_socials",
    "gl_process",
  ]);
  const recordTypes = new Set([
    "serviceFamily",
    "service",
    "softwareModule",
    "article",
    "legalDocument",
    "roadmapItem",
    "caseStudy",
  ]);
  const reached = new Set();
  const missing = [];
  for (const entry of store.entries.values()) {
    if (!shared.has(entry.id) && !recordTypes.has(entry.type)) continue;
    reached.add(entry.type === "global" ? entry.id : entry.type);
    for (const section of TYPES[entry.type].sections({
      id: entry.id,
      department: entry.department,
      content: entry.live,
    })) {
      assert.ok(
        pageSectionPlacement(entry.id, section.value),
        `${entry.id}/${section.value}: location guidance`,
      );
      checkFields(
        entry.id,
        section.value,
        entry.id,
        section.node,
        section.path,
        missing,
      );
    }
  }
  assert.equal(reached.size, 12);
  assert.deepEqual(missing, []);
});
test("all guidance resolves in every UI language and obsolete fields explain their actual scope", () => {
  const get = (object, key) =>
    key.split(".").reduce((value, part) => value?.[part], object);
  for (const lang of ["en", "ar", "de", "fr", "it"]) {
    const messages = require(`../messages/${lang}.json`).PagePlacement;
    for (const key of Object.keys(PAGE_PLACEMENT_COPY))
      assert.equal(typeof get(messages, key), "string", `${lang}/${key}`);
  }
  for (const sections of Object.values(PAGE_PLACEMENTS))
    for (const section of Object.values(sections)) {
      assert.ok(PAGE_PLACEMENT_COPY[section.title]);
      assert.ok(PAGE_PLACEMENT_COPY[section.where]);
      for (const field of Object.values(section.fields ?? {})) {
        assert.ok(PAGE_PLACEMENT_COPY[field.label]);
        if (field.hint) assert.ok(PAGE_PLACEMENT_COPY[field.hint]);
        if (field.state === "unused" || field.state === "review")
          assert.ok(
            field.hint,
            "unconfirmed or unused content needs its own explanation",
          );
      }
    }
});
test("presentation guidance preserves source roles, rich constraints, original hints and unknown future fields", () => {
  const node = {
    kind: "group",
    fields: {
      div: {
        kind: "rich",
        label: "description",
        long: true,
        fixedValues: ["OrgTik"],
        hint: { key: "link", values: { href: "/contact" } },
      },
      future: { kind: "text", label: "newSourceField" },
    },
  };
  const before = JSON.stringify(node);
  const decorated = decoratePageNode({
    pageId: "pg_home",
    section: "hero",
    path: "hero",
    node,
    translate: (key) => PAGE_PLACEMENT_COPY[key],
  });
  assert.equal(JSON.stringify(node), before);
  assert.equal(decorated.fields.div.label, "description");
  assert.equal(
    JSON.stringify(decorated.fields.div.hint),
    JSON.stringify(node.fields.div.hint),
  );
  assert.equal(
    JSON.stringify(decorated.fields.div.fixedValues),
    JSON.stringify(node.fields.div.fixedValues),
  );
  assert.ok(decorated.fields.div.displayLabel);
  assert.equal(decorated.fields.future.label, "newSourceField");
  assert.equal(
    pageFieldPlacement("pg_home", "faqs", "pg_home", "faqs.37.question")?.label,
    pageFieldPlacement("pg_home", "faqs", "pg_home", "faqs.0.question")?.label,
  );
});
test("tuple and chart labels keep the element index while following reordered list rows", () => {
  const first = pageFieldPlacement(
    "cs_any",
    "results",
    "cs_any",
    "results.shifts.37.0",
  );
  const second = pageFieldPlacement(
    "cs_any",
    "results",
    "cs_any",
    "results.shifts.37.1",
  );
  assert.ok(first && second);
  assert.notEqual(first.label, second.label);
  const pair = {
    kind: "pair",
    label: "shift",
    first: "before",
    second: "after",
    secondKind: "text",
  };
  const decorated = decoratePageNode({
    pageId: "cs_any",
    record: "cs_any",
    section: "results",
    path: "results.shifts.*",
    node: pair,
    translate: (key) => PAGE_PLACEMENT_COPY[key],
  });
  assert.equal(decorated.first, "before");
  assert.equal(decorated.second, "after");
  assert.equal(decorated.firstDisplayLabel, PAGE_PLACEMENT_COPY[first.label]);
  assert.equal(decorated.secondDisplayLabel, PAGE_PLACEMENT_COPY[second.label]);
  const series = decoratePageNode({
    pageId: "cs_any",
    record: "cs_any",
    section: "results",
    path: "results.monthly.points",
    node: { kind: "series", label: "points", first: "label", second: "value" },
    translate: (key) => PAGE_PLACEMENT_COPY[key],
  });
  assert.ok(series.placement);
  assert.ok(series.firstDisplayLabel);
  assert.ok(series.secondDisplayLabel);
  assert.notEqual(series.firstDisplayLabel, series.secondDisplayLabel);
});
