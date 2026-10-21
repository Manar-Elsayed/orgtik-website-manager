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
  const localRequire = (name) => {
    let target = name.startsWith("@/lib/")
      ? path.join(__dirname, name.slice("@/lib/".length))
      : path.resolve(path.dirname(file), name);
    if (!path.extname(target)) target += ".ts";
    return target.endsWith(".json")
      ? JSON.parse(fs.readFileSync(target, "utf8"))
      : load(target);
  };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire }, { filename: file });
  return module.exports;
}

const { TYPES } = load(path.join(__dirname, "contentTypes.ts"));
const { pageCardGroups } = load(path.join(__dirname, "pageCardGroups.ts"));
const { makeStore } = require("../backend/apps/wm/content");
const shared = require("./cms-sections.json");

test("page cards retain every real input once across all page and shared-source schemas", () => {
  const store = makeStore(() => "2026-10-15T08:00:00.000Z", { demo: true });
  const pages = [...store.entries.values()].filter((entry) => entry.type === "page" && entry.id.startsWith("pg_"));
  assert.equal(pages.length, 16);
  let groupsChecked = 0;
  const check = (pageId, section, node) => {
    if (node.kind !== "group") return;
    const keys = Object.entries(node.fields).filter(([, child]) => child.kind !== "group" && child.kind !== "list").map(([key]) => key);
    const result = pageCardGroups(pageId, section, keys).flatMap((group) => group.keys);
    assert.equal(new Set(result).size, result.length, `${pageId}.${section}: duplicate input`);
    assert.deepEqual([...result].sort(), [...keys].sort(), `${pageId}.${section}: missing input`);
    const future = pageCardGroups(pageId, section, [...keys, "new-template-field"]).flatMap((group) => group.keys);
    assert.equal(future.filter((key) => key === "new-template-field").length, 1, `${pageId}.${section}: new fields stay visible`);
    groupsChecked++;
    for (const [key, child] of Object.entries(node.fields)) check(pageId, key, child);
  };
  for (const page of pages) {
    for (const section of TYPES.page.sections({ id: page.id, content: page.live })) check(page.id, section.value, section.node);
    const source = shared[page.id]?.shared;
    if (!source) continue;
    const canonical = store.entries.get(source.record);
    assert.ok(canonical, `${page.id}: shared source exists`);
    for (const section of TYPES.global.sections({ id: canonical.id, content: canonical.live })) {
      if (source.prefixes.some((prefix) => section.value.startsWith(prefix))) check(page.id, section.value, section.node);
    }
  }
  assert.ok(groupsChecked >= 50, "the check reaches standard, compound, and shared commerce sections");
});
