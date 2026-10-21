import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { isLegacyStrings, legacyStringSectionLabel, legacyStringSlotLabel } from "./legacyStringLabels.ts";

const seed = JSON.parse(fs.readFileSync(new URL("../backend/apps/wm/seed/website.json", import.meta.url), "utf8"));
const at = (tree, path) => path.split(".").reduce((value, key) => value?.[key], tree);
const software = seed.entries.find(entry => entry.id === "st_software");

test("legacy section names follow stable IDs, independently of editable copy and imported sentence labels", () => {
  const names = software.layout.map(section => legacyStringSectionLabel(software.id, section.key));
  assert.deepEqual(names, ["softwareOverview", "softwareActions", "softwareWorkflow", "softwarePreviews", "sharedLabels"].map(key => "legacyStrings.tabs." + key));
  const renamed = structuredClone(software);
  for (const section of renamed.layout) {
    section.label = "Changed website heading and a much longer marketing sentence.";
    for (const key of Object.keys(renamed.locales.en[section.key])) renamed.locales.en[section.key][key] = "Edited translation";
  }
  assert.deepEqual(renamed.layout.map(section => legacyStringSectionLabel(renamed.id, section.key)), names);
  assert.equal(isLegacyStrings("st_software"), true);
  assert.equal(isLegacyStrings("demo_published_strings"), true);
  for (const id of ["pg_software", "sm_tasks", "demo_published_page", undefined]) assert.equal(isLegacyStrings(id), false);
});

test("all 52 Software fields, shared labels and every imported Strings tab have purpose translations in five languages", () => {
  const fields = software.layout.flatMap(section => section.slots.map(slot => legacyStringSlotLabel(software.id, section.key, slot.key, slot.context)));
  assert.equal(fields.length, 52);
  assert.equal(new Set(fields.map(field => field.label)).size, 52);
  for (const locale of ["en", "ar", "de", "fr", "it"]) {
    const messages = JSON.parse(fs.readFileSync(new URL("../messages/" + locale + ".json", import.meta.url), "utf8"));
    for (const entry of seed.entries.filter(entry => entry.type === "strings")) {
      for (const section of entry.layout) {
        const tab = at(messages.Fields, legacyStringSectionLabel(entry.id, section.key));
        assert.ok(typeof tab === "string" && tab.length > 0, `${locale}: ${entry.id}/${section.key}`);
        for (const slot of section.slots ?? []) {
          const field = legacyStringSlotLabel(entry.id, section.key, slot.key, slot.context);
          assert.ok(at(messages.Fields, field.label), `${locale}: ${field.label}`);
          const hint = at(messages.Editor.hints, field.hint.key);
          assert.ok(hint, `${locale}: ${field.hint.key}`);
          assert.doesNotMatch(hint, /panelNote|cta\.eyebrow|renderVals|flowNow|\bUsed in\b/);
        }
      }
    }
  }
  assert.equal(legacyStringSlotLabel("st_software", "b2", "s1", "panelNote").label, "legacyStrings.fields.savingsNote");
  assert.equal(legacyStringSlotLabel("st_software", "b2", "s2", "cta.eyebrow").label, "legacyStrings.fields.productActionIntro");
  assert.equal(legacyStringSlotLabel("st_software", "b2", "s7", "cta.eyebrow").label, "legacyStrings.fields.planActionIntro");
  assert.equal(legacyStringSlotLabel("st_software", "b2", "s12", "cta.eyebrow").label, "legacyStrings.fields.contactActionIntro");
  assert.equal(legacyStringSlotLabel("st_software", "b4", "s4", "render").label, "legacyStrings.fields.useCasesLabel");
});

test("display metadata cannot overwrite content IDs, values or protected formatting placeholders", () => {
  const before = JSON.stringify(seed);
  for (const entry of seed.entries.filter(entry => entry.type === "strings")) {
    for (const section of entry.layout) {
      for (const slot of section.slots ?? []) {
        const metadata = legacyStringSlotLabel(entry.id, section.key, slot.key, slot.context);
        assert.deepEqual(Object.keys(metadata).sort(), ["hint", "label"]);
        const node = { kind: "rich", label: "slotMessage", fixedValues: ["{0}", "<m1>", "</m1>"], long: true };
        const decorated = {...node, ...metadata};
        assert.equal(decorated.kind, node.kind);
        assert.equal(decorated.fixedValues, node.fixedValues);
        assert.equal(decorated.long, true);
      }
    }
  }
  assert.equal(JSON.stringify(seed), before);
  const unknown = legacyStringSlotLabel("st_future", "new-section", "s99", "renderVals0 · internal.private.property");
  assert.equal(unknown.label, "legacyStrings.fields.interfaceText");
  assert.deepEqual(unknown.hint, {key: "legacyStrings.interfaceText"});
});
