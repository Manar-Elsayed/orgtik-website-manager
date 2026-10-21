const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { makeStore } = require("./content");
const { makeLibrary } = require("./library");
const { permissionsFor } = require("./permissions");
const wm = require("../wm");
const now = () => "2026-10-08T12:00:00.000Z",
  editor = { key: "editor" },
  approver = { key: "approver" },
  all = { can: () => true };

test("Published examples survive suggestion drafts and persisted version-one fixtures without altering existing content", () => {
  const store = makeStore(now, { demo: true });
  require("./suggestions").applySuggestions({ store, media: new Map(), now });
  store.ensureDemo();
  for (const type of [
    "serviceFamily",
    "softwareModule",
    "caseStudy",
    "article",
  ])
    assert.ok(
      [...store.entries.values()].some(
        (entry) =>
          entry.type === type && store.summary(entry).state === "published",
      ),
      type,
    );
  const published = [...store.entries.values()].filter(
    (entry) => entry.demoPublished,
  );
  assert.ok(published.length > 0);
  assert.ok(
    published.every((entry) => entry.workflow.visibility === "archived"),
  );
  const before = store.exportState();
  store.ensureDemo();
  assert.deepEqual(store.exportState(), before);
  const legacy = structuredClone(before);
  legacy.demoVersion = 1;
  legacy.entries = legacy.entries.filter(([, entry]) => !entry.demoPublished);
  const existing = structuredClone(legacy.entries);
  const restored = makeStore(now, { demo: true });
  restored.importState(legacy);
  for (const [id, entry] of existing)
    assert.deepEqual(restored.entries.get(id), entry);
  assert.ok(
    [...restored.entries.values()].some((entry) => entry.demoPublished),
  );
});

test("translation-status examples open actual draft content without resetting saved translations or the live website", () => {
  const store = makeStore(now, { demo: true });
  store.ensureDemo();
  for (const entry of store.entries.values())
    for (const [locale, state] of Object.entries(entry.translation)) {
      if (
        entry.demoTranslations &&
        ["needs_review", "outdated", "in_progress"].includes(state)
      )
        assert.ok(entry.draft.locales[locale]);
    }
  const snapshot = store.exportState();
  snapshot.demoVersion = 1;
  const sample = snapshot.entries.find(
    ([, entry]) => entry.demoTranslations,
  )[1];
  const locale = Object.keys(sample.translation).find(
    (key) =>
      key !== "en" &&
      ["needs_review", "outdated", "in_progress"].includes(
        sample.translation[key],
      ),
  );
  delete sample.draft.locales[locale];
  const live = structuredClone(sample.live);
  const edited = snapshot.entries.find(
    ([, entry]) => entry.demoTranslations && entry !== sample,
  )[1];
  edited.versions[0].note = "A saved user revision";
  const before = structuredClone(edited);
  const restored = makeStore(now, { demo: true });
  restored.importState(snapshot);
  assert.deepEqual(
    restored.entries.get(sample.id).draft.locales[locale],
    sample.draft.locales.en,
  );
  assert.deepEqual(restored.entries.get(sample.id).live, live);
  assert.deepEqual(restored.entries.get(edited.id), before);
});

test("review details expose the actual draft author independently of the transition actor", () => {
  const store = makeStore(now, { demo: true }); store.ensureDemo();
  const sample = [...store.entries.values()].find(entry => entry.draft && entry.workflow.state === "in_review");
  assert.equal(store.detail(sample).lastEditor, "admin");
  assert.equal(store.transition(sample, { key: "admin" }, "approve", all).code, "four_eyes");
  assert.ok(store.transition(sample, { key: "manager" }, "approve", all).entry);
  assert.equal(store.detail(sample).lastEditor, "admin");
});

test("demo revisions cover workflow states without changing published content or overwriting saved edits", () => {
  const store = makeStore(now, { demo: true });
  const published = [...store.entries.values()].map((entry) => [
    entry.id,
    structuredClone(entry.live),
  ]);
  store.ensureDemo();
  for (const type of [
    "page",
    "global",
    "strings",
    "serviceFamily",
    "service",
    "softwareModule",
    "caseStudy",
    "article",
    "roadmapItem",
    "review",
    "legalDocument",
  ]) {
    const states = new Set(
      [...store.entries.values()]
        .filter((entry) => entry.type === type)
        .map((entry) => store.summary(entry).state),
    );
    for (const state of [
      "published",
      "draft",
      "in_review",
      "approved",
      "scheduled",
    ])
      assert.ok(states.has(state), `${type}: ${state}`);
  }
  assert.deepEqual(
    published.map(([id]) => [id, store.entries.get(id).live]),
    published,
  );
  assert.ok([...store.entries.values()].filter(entry => entry.id.startsWith("lg_demo_")).every(entry => entry.live === null));
  const entry = store.entries.get("pg_home");
  assert.ok(
    store.save(
      entry,
      editor,
      { locale: "en", seo: { title: "Preserve the saved title" } },
      all,
    ).entry,
  );
  const saved = store.exportState();
  store.importState(saved);
  store.ensureDemo();
  assert.deepEqual(store.exportState(), saved);
  assert.equal(store.entries.get("pg_faq").live.slug.en, "/faq");
  assert.equal(
    [...store.entries.values()].filter(
      (entry) =>
        entry.type === "review" && entry.workflow.visibility === "live",
    ).length,
    3,
  );
});

test("section order, cursor and attachment metadata remain draft-only until approved and published", () => {
  const store = makeStore(now),
    entry = store.entries.get("pg_home");
  const before = structuredClone(entry.live);
  const presentation = {
    sectionOrder: ["reviews", "hero"],
    sectionMedia: {
      hero: [
        {
          src: "https://media.example.test/header.webp",
          alt: { en: "Team at work" },
          focal: { x: 25, y: 70 },
        },
      ],
    },
    cursor: { text: { en: "Explore project" }, link: "/work" },
  };
  assert.ok(store.save(entry, editor, { presentation }, all).entry);
  assert.deepEqual(entry.live, before);
  assert.ok(store.transition(entry, editor, "submit", all).entry);
  assert.equal(
    store.transition(entry, editor, "approve", all).code,
    "four_eyes",
  );
  assert.ok(store.transition(entry, approver, "approve", all).entry);
  assert.ok(store.transition(entry, approver, "publish", all).entry);
  assert.deepEqual(entry.live.presentation, presentation);
  assert.equal(
    store.save(
      entry,
      editor,
      { presentation: { ...presentation, sectionOrder: ["footer"] } },
      all,
    ).errors.presentation,
    "invalid",
  );
  assert.equal(
    store.save(
      entry,
      editor,
      {
        presentation: {
          ...presentation,
          cursor: { text: {}, link: "javascript:alert(1)" },
        },
      },
      all,
    ).errors.presentation,
    "invalid",
  );
});

async function fixture(t) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "orgtik-manager-test-"));
  let role = "wm_admin",
    key = "editor";
  const actor = () => ({
    id: 1,
    key,
    firstName: "Test",
    lastName: "Editor",
    isActive: true,
  });
  const identity = {
    userFromReq: () => actor(),
    userScopes: () => [{ scope: "website_manager", roles: [role] }],
    fullName: (user) => `${user.firstName} ${user.lastName}`,
    publicUser: (user) => user,
    findByKey: () => actor(),
    findUser: () => actor(),
    users: [actor()],
  };
  const app = express();
  app.use(express.json());
  const hooks = wm.routes(app, {
    identity,
    realm: "manager-test",
    uploadsDir: folder,
    config: { apiUrl: () => "http://localhost" },
    apiUrl: () => "http://localhost",
    webUrl: () => "http://localhost",
    log() {},
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
    const resolved = fs.realpathSync(folder);
    assert.ok(
      resolved.startsWith(fs.realpathSync(os.tmpdir()) + path.sep) &&
        path.basename(resolved).startsWith("orgtik-manager-test-"),
    );
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return {
    hooks,
    base,
    as(nextRole, nextKey = "editor") {
      role = nextRole;
      key = nextKey;
    },
    async call(route, method = "GET", body, version) {
      const res = await fetch(base + "/v2" + route, {
        method,
        headers: {
          connection: "close",
          ...(body ? { "content-type": "application/json" } : {}),
          ...(version != null ? { "if-match": String(version) } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const raw = await res.text();
      return { status: res.status, ...(raw ? JSON.parse(raw) : {}) };
    },
  };
}

test("legal workflow examples migrate saved demos, survive edits, and populate each state filter", async (t) => {
  const source = makeStore(now, { demo: true });
  source.ensureDemo();
  const legacy = source.exportState();
  legacy.demoVersion = 3;
  legacy.entries = legacy.entries.filter(([id]) => !id.startsWith("lg_demo_"));
  legacy.audit = legacy.audit.filter(event => !event.entry?.startsWith("lg_demo_"));
  const existing = structuredClone(legacy.entries);
  const restored = makeStore(now, { demo: true });
  restored.importState(legacy);
  for (const [id, entry] of existing) assert.deepEqual(restored.entries.get(id), entry);
  for (const state of ["draft", "in_review", "approved", "scheduled"]) {
    const entry = restored.entries.get(`lg_demo_${state}`);
    assert.equal(restored.summary(entry).state, state);
    assert.equal(entry.live, null);
    assert.equal(entry.workflow.visibility, "not_on_site");
    assert.deepEqual(entry.legalVersions, []);
    assert.ok(entry.draft.locales.en.sections.length);
    assert.deepEqual(entry.versions[0].content, entry.draft);
    assert.equal(entry.versions[0].state, state);
  }
  assert.ok(Date.parse(restored.entries.get("lg_demo_scheduled").workflow.publishAt) > Date.parse(now()));
  const draft = restored.entries.get("lg_demo_draft");
  assert.ok(restored.save(draft, editor, { locale: "en", fields: { summary: "Keep my edited sample" } }, all).entry);
  assert.ok(restored.transition(draft, editor, "submit", all).entry);
  const saved = restored.exportState();
  restored.importState(saved);
  restored.ensureDemo();
  assert.deepEqual(restored.exportState(), saved);
  const withoutDemo = makeStore(now);
  withoutDemo.importState(legacy);
  assert.ok(![...withoutDemo.entries.keys()].some(id => id.startsWith("lg_demo_")));

  const f = await fixture(t);
  for (const state of ["draft", "in_review", "approved", "scheduled"]) {
    const result = await f.call(`/admin/entries/legalDocument?state=${state}`);
    assert.equal(result.status, 200);
    assert.ok(result.data.some(entry => entry.id === `lg_demo_${state}`));
    assert.ok(result.data.every(entry => entry.state === state));
    const detail = await f.call(`/admin/entries/legalDocument/lg_demo_${state}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.data.content.versionLabel, "1.0");
  }
  const publicRows = await f.call("/public/entries/legalDocument");
  assert.equal(publicRows.status, 200);
  assert.ok(!publicRows.data.some(entry => entry.id.startsWith("lg_demo_")));
});

test("page self-approval uses authenticated administrative roles, preserves live content, and rejects forged roles", async (t) => {
  const f = await fixture(t);
  let revision = 0;
  const prepare = async (role, type = "page", id = "pg_about") => {
    f.as(role, "own-page-editor");
    const before = (await f.call(`/admin/entries/${type}/${id}`)).data;
    const presentation = structuredClone(before.content.presentation ?? { sectionOrder: [], sectionMedia: {}, cursor: { text: {}, link: "" } });
    presentation.cursor.text.en = `Approval fixture ${++revision}`;
    const saved = await f.call(`/admin/entries/${type}/${id}`, "PATCH", { presentation }, before.version);
    assert.equal(saved.status, 200);
    const submitted = await f.call(`/admin/entries/${type}/${id}/transitions`, "POST", { action: "submit" }, saved.data.version);
    assert.equal(submitted.status, 200);
    return { before, submitted: submitted.data };
  };
  for (const role of ["wm_admin", "wm_super_admin", "wm_owner"]) {
    const { before, submitted } = await prepare(role);
    const result = await f.call("/admin/entries/page/pg_about/transitions", "POST", { action: "approve" }, submitted.version);
    assert.equal(result.status, 200, role);
    assert.equal(result.data.state, "approved");
    assert.deepEqual(result.data.live, before.live);
    assert.ok(result.data.hasDraft);
  }
  const { submitted } = await prepare("wm_approver");
  const denied = await f.call("/admin/entries/page/pg_about/transitions", "POST", { action: "approve", roles: ["wm_admin"], ownPageApproval: true }, submitted.version);
  assert.equal(denied.status, 409);
  assert.equal(denied.error.code, "four_eyes");
  assert.equal((await f.call("/admin/entries/page/pg_about")).data.state, "in_review");
  f.as("wm_editor", "own-page-editor");
  assert.equal((await f.call("/admin/entries/page/pg_about/transitions", "POST", { action: "approve", roles: ["wm_admin"] }, submitted.version)).status, 403);
  f.as("wm_approver", "different-reviewer");
  assert.equal((await f.call("/admin/entries/page/pg_about/transitions", "POST", { action: "approve" }, submitted.version)).status, 200);
  const global = await prepare("wm_admin", "global", "gl_footer");
  const otherType = await f.call("/admin/entries/global/gl_footer/transitions", "POST", { action: "approve" }, global.submitted.version);
  assert.equal(otherType.status, 409);
  assert.equal(otherType.error.code, "four_eyes");
});

test("list APIs paginate 0/1/10/11/101 rows after combined search, workflow, timeline and language filters", async (t) => {
  const f = await fixture(t),
    snapshot = f.hooks.exportState();
  const template = structuredClone(
    snapshot.data.content.entries.find(([id]) => id === "rm_01")[1],
  );
  snapshot.data.content.entries = snapshot.data.content.entries.filter(
    ([, row]) => row.type !== "roadmapItem",
  );
  for (let n = 0; n < 101; n++) {
    const row = structuredClone(template);
    row.id = `rm_fixture_${n}`;
    row.draft = structuredClone(row.live);
    row.draft.locales.en.name = `Search fixture ${String(n).padStart(3, "0")}`;
    row.draft.period = "next";
    row.draft.year = "2030";
    row.workflow.state = "draft";
    snapshot.data.content.entries.push([row.id, row]);
  }
  f.hooks.importState(snapshot);
  for (const [search, total] of [
    ["absent", 0],
    ["fixture 100", 1],
    ["fixture 00", 10],
    ["fixture 01", 10],
    ["fixture", 101],
  ]) {
    const result = await f.call(
      `/admin/entries/roadmapItem?search=${encodeURIComponent(search)}&state=draft&period=next&year=2030&sort=name&direction=asc`,
    );
    assert.equal(result.status, 200);
    assert.equal(result.meta.total, total);
    assert.equal(result.data.length, Math.min(10, total));
    assert.equal(result.meta.pageSize, 10);
  }
  const last = await f.call(
    "/admin/entries/roadmapItem?search=fixture&page=11&sort=name&direction=asc",
  );
  assert.equal(last.data.length, 1);
  assert.equal(last.data[0].name, "Search fixture 100");
  const eleven = structuredClone(snapshot);
  eleven.data.content.entries = eleven.data.content.entries.filter(
    ([, row]) =>
      row.type !== "roadmapItem" || Number(row.id.split("_").pop()) < 11,
  );
  f.hooks.importState(eleven);
  assert.equal(
    (await f.call("/admin/entries/roadmapItem?page=2")).data.length,
    1,
  );
  const pages = await f.call(
    "/admin/entries/page?missingLanguages=true&pageSize=100",
  );
  assert.ok(
    pages.data.every((row) =>
      ["en", "ar", "de", "fr", "it"].some(
        (locale) => !["ready", "published"].includes(row.translation[locale]),
      ),
    ),
  );
});

test("legal creation is permission-gated, survives reload and exposes published version history by its chosen slug", async (t) => {
  const f = await fixture(t);
  f.as("wm_viewer");
  assert.equal((await f.call("/admin/entries/legalDocument", "POST", { name: "Denied", slug: "denied" })).status, 403);
  f.as("wm_editor");
  const created = await f.call("/admin/entries/legalDocument", "POST", { name: "Additional policy", slug: "additional-policy", from: "lg_privacy" });
  assert.equal(created.status, 201);
  const id = created.data.id, route = `/admin/entries/legalDocument/${id}`;
  assert.equal(created.data.visibility, "not_on_site");assert.deepEqual(created.data.legalVersions, []);
  assert.equal((await f.call("/public/legal/additional-policy/versions")).status, 404);
  assert.ok(!(await f.call("/public/entries/legalDocument")).data.some(row => row.id === id));
  f.hooks.importState(f.hooks.exportState());
  let entry = (await f.call(route)).data;
  assert.equal(entry.content.slug.en, "additional-policy");assert.equal(entry.versionLabel, "1.0");
  entry = (await f.call(route, "PATCH", { neutral: { effectiveFrom: "2026-10-08" } }, entry.version)).data;
  entry = (await f.call(route + "/transitions", "POST", { action: "submit" }, entry.version)).data;
  f.as("wm_admin", "legal-reviewer");
  for (const action of ["approve", "publish"]) {
    const result = await f.call(route + "/transitions", "POST", { action }, entry.version);
    assert.equal(result.status, 200);entry = result.data;
  }
  assert.ok((await f.call("/public/entries/legalDocument")).data.some(row => row.id === id));
  const versions = await f.call("/public/legal/additional-policy/versions");
  assert.equal(versions.status, 200);assert.equal(versions.data[0].versionLabel, "1.0");assert.equal(versions.data[0].effectiveFrom, "2026-10-08");
  assert.equal((await f.call(route, "DELETE")).status, 409);
  const unused = await f.call("/admin/entries/legalDocument", "POST", { name: "Unused policy", slug: "unused-policy" });
  assert.equal(unused.status, 201);assert.equal((await f.call(`/admin/entries/legalDocument/${unused.data.id}`, "DELETE")).status, 204);
  assert.equal((await f.call("/public/legal/privacy/versions")).status, 200);
});

test("roadmap creation survives state reload and leads' New and Opened sets are disjoint", async (t) => {
  const f = await fixture(t);
  const created = await f.call("/admin/entries/roadmapItem", "POST", {
    name: "Refresh-proof roadmap",
  });
  assert.equal(created.status, 201);
  f.hooks.importState(f.hooks.exportState());
  assert.equal(
    (await f.call(`/admin/entries/roadmapItem/${created.data.id}`)).data.name,
    "Refresh-proof roadmap",
  );
  const fresh = await f.call("/admin/leads?status=new"),
    opened = await f.call("/admin/leads?status=open");
  assert.ok(fresh.data.length);
  assert.ok(opened.data.length);
  assert.ok(fresh.data.every((row) => row.status === "new"));
  assert.ok(
    opened.data.every(
      (row) =>
        ["contacted", "qualified", "quoted"].includes(row.status) &&
        !fresh.data.some((item) => item.id === row.id),
    ),
  );
  for (const status of [
    "new",
    "contacted",
    "qualified",
    "quoted",
    "won",
    "lost",
    "unqualified",
    "spam",
    "duplicate",
  ])
    assert.ok(
      (await f.call(`/admin/leads?status=${status}`)).meta.total > 0,
      status,
    );
});

test("idea edits check versions and hiding removes a public idea but retains details and history", async (t) => {
  const f = await fixture(t),
    rows = await f.call("/admin/ideas?status=open");
  const idea = rows.data[0];
  assert.ok(idea);
  assert.equal(
    (
      await f.call(
        `/admin/ideas/${idea.id}`,
        "PATCH",
        { title: "Updated idea" },
        idea.version - 1,
      )
    ).status,
    412,
  );
  const edited = await f.call(
    `/admin/ideas/${idea.id}`,
    "PATCH",
    { title: "Updated idea" },
    idea.version,
  );
  assert.equal(edited.status, 200);
  const hidden = await f.call(
    `/admin/ideas/${idea.id}/moderate`,
    "POST",
    { action: "hide", reason: "Testing visibility" },
    edited.data.version,
  );
  assert.equal(hidden.status, 200);
  assert.equal(
    (await f.call("/public/ideas")).data.some((row) => row.id === idea.id),
    false,
  );
  const detail = await f.call(`/admin/ideas/${idea.id}`);
  assert.equal(detail.data.status, "hidden");
  assert.ok(detail.data.history.some((event) => event.action === "edit"));
});

test("SEO-only edits preserve content permissions; redirects and indexing include both policies", async (t) => {
  const f = await fixture(t);
  f.as("wm_seo");
  const page = await f.call("/admin/entries/page/pg_home");
  assert.equal(
    (
      await f.call(
        "/admin/entries/page/pg_home",
        "PATCH",
        { locale: "en", fields: { name: "Forbidden change" } },
        page.data.version,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.call(
        "/admin/entries/page/pg_home",
        "PATCH",
        { locale: "en", seo: { title: "SEO-only title" } },
        page.data.version,
      )
    ).status,
    200,
  );
  const temporary = await f.call("/admin/seo/redirects?kind=302");
  assert.ok(temporary.data.length);
  assert.ok(
    temporary.data.every((row) => row.code === 302 && row.history.length),
  );
  const permanent = await f.call("/admin/seo/redirects?kind=301");
  assert.ok(permanent.data.every((row) => row.code === 301));
  assert.equal((await f.call("/admin/users")).status, 403);
  const store = makeStore(now),
    library = makeLibrary({ store, seed: store.seed, now, uploads: "unused" });
  store.entries.get("pg_home").live.seo.en.robots = "index";
  const signIn = library.indexingUrls().find((row) => row.id === "pg_signIn");
  assert.ok(signIn);
  assert.equal(signIn.inSitemap, false);
  assert.equal(signIn.policy, "noindex");
  library.setVisibility(approver, "index", "Test public policy");
  assert.equal(
    library.indexingUrls().find((row) => row.id === "pg_home").policy,
    "index",
  );
  library.setVisibility(approver, "noindex", "Test site override");
  assert.ok(
    library
      .indexingUrls()
      .every(
        (row) => row.policy === "noindex" && row.reason === "siteOverride",
      ),
  );
  assert.ok(library.robots().includes("Allow: /"));
  library.settings.publicLocales = ["en", "ar", "de"];
  store.entries.get("pg_home").live.seo.ar = {
    robots: "noindex",
    inSitemap: false,
  };
  const localized = library.indexingUrls();
  const sitemap = new Set(library.sitemap().map((row) => row.loc));
  assert.ok(
    localized.some(
      (row) => row.id === "pg_home" && row.locale === "ar" && !row.inSitemap,
    ),
  );
  assert.ok(
    localized.some(
      (row) => row.id === "pg_home" && row.locale === "de" && row.inSitemap,
    ),
  );
  assert.ok(localized.every((row) => row.inSitemap === sitemap.has(row.loc)));
});

test("website images can be replaced without losing metadata, references or immutable original bytes", async (t) => {
  const f = await fixture(t), id = "md_01", route = `/admin/media/${id}`;
  const initial = (await f.call(route)).data;
  const edited = await f.call(route, "PATCH", {description:"Preserved description",tags:["retained"],alt:{en:"Preserved alternative text"},rights:{status:"owned"},focal:{x:30,y:70}}, initial.version);
  const before = edited.data, original = fs.readFileSync(path.resolve(__dirname, "../../../apps/website/landing-directions/public/assets", initial.file));
  const snapshot = f.hooks.exportState();
  const story = snapshot.data.content.entries.find(([key]) => key === "cs_01")[1];
  story.live.image.src = initial.file;
  f.hooks.importState(snapshot);
  const publishedStory = structuredClone(story);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64");
  const replace = async (bytes, mime, version) => {
    const body = new FormData();body.set("file",new Blob([bytes],{type:mime}),"replacement."+(mime === "image/webp" ? "webp" : "png"));
    const response = await fetch(f.base+"/v2"+route+"/replace",{method:"POST",body,headers:{"if-match":String(version)}});
    return {status:response.status,...await response.json()};
  };
  f.as("wm_viewer");assert.equal((await replace(png,"image/png",before.version)).status,403);
  f.as("wm_editor");assert.equal((await replace(png,"image/png",before.version-1)).status,412);
  assert.equal((await replace(Buffer.from("Not an image"),"image/png",before.version)).status,422);
  assert.equal((await replace(png,"text/plain",before.version)).status,422);
  assert.equal((await f.call(route)).data.file,before.file);
  const replacement = await replace(png,"image/png",before.version);
  assert.equal(replacement.status,200);const media=replacement.data;
  assert.equal(media.id,id);assert.equal(media.version,before.version+1);assert.equal(media.source,"upload");assert.equal(media.width,1);assert.equal(media.height,1);
  for(const key of ["description","tags","alt","rights","focal","usage","templateUses"])assert.deepEqual(media[key],before[key],key);
  assert.ok(media.retainedFiles.includes(initial.file));
  assert.ok((await f.call(`/admin/media?search=${initial.file}`)).data.some(row=>row.id===id));
  const publicStory=(await f.call("/public/entries/caseStudy")).data.find(row=>row.id==="cs_01");assert.ok(publicStory.image.src.endsWith("/v2/media/"+media.file));
  assert.ok((await f.call("/admin/entries/caseStudy/cs_01")).data.content.image.src.endsWith("/v2/media/"+media.file));
  let history=(await f.call(`/admin/studio/media/${id}`)).data;assert.equal(history.versions.length,2);assert.equal(history.canReplace,false);
  assert.deepEqual(Buffer.from(await(await fetch(f.base+"/v2/media/"+media.file)).arrayBuffer()),png);
  const firstVersion=history.versions[0];assert.deepEqual(Buffer.from(await(await fetch(f.base+firstVersion.path)).arrayBuffer()),original);
  const webp=fs.readFileSync(path.resolve(__dirname,"../../../apps/website/landing-directions/public/assets/brand-glass.webp"));
  const next=await replace(webp,"image/webp",media.version);assert.equal(next.status,200);assert.equal(next.data.width,1920);assert.equal(next.data.height,1072);
  history=(await f.call(`/admin/studio/media/${id}`)).data;assert.equal(history.versions.length,3);
  assert.deepEqual(Buffer.from(await(await fetch(f.base+firstVersion.path)).arrayBuffer()),original);
  assert.deepEqual(Buffer.from(await(await fetch(f.base+history.versions[1].path)).arrayBuffer()),png);
  f.hooks.importState(f.hooks.exportState());
  assert.equal((await f.call(route)).data.file,next.data.file);
  const storedStory=f.hooks.exportState().data.content.entries.find(([key])=>key==="cs_01")[1];assert.deepEqual(storedStory,publishedStory);
  assert.equal((await f.call(route,"DELETE")).status,409);
});

test("hosted replacement bytes survive a cold start, stay realm scoped and reject corrupt or unavailable storage", async (t) => {
  const {imageStorage} = require('./image-storage');
  const {replaceImage} = require('./media-replacement');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-image-storage-'));
  t.after(() => { assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('wm-image-storage-')); fs.rmSync(root,{recursive:true,force:true}); });
  const database = new Map(), env = {KV_REST_API_URL:'https://storage.fixture.test', KV_REST_API_TOKEN:'fixture-only'};
  const fetcher = async (url, init) => {
    assert.equal(url, env.KV_REST_API_URL);
    assert.ok(Buffer.byteLength(init.body) < 1024*1024);
    const [command,key,value] = JSON.parse(init.body);
    if (command === 'SET') database.set(key,value);
    return Response.json({result:command === 'SET' ? 'OK' : database.get(key) ?? null});
  };
  const file = 'md_01-v2-original.png', bytes = Buffer.alloc(640*1024, 7);
  const row = {file,bytes:bytes.length,hash:require('node:crypto').createHash('sha256').update(bytes).digest('hex')};
  await imageStorage({uploadsDir:path.join(root,'writer'),realm:'first',hosted:true,env,fetcher}).write(file,bytes);
  const cold = imageStorage({uploadsDir:path.join(root,'cold'),realm:'first',hosted:true,env,fetcher});
  assert.deepEqual(await cold.read(row),bytes);
  await assert.rejects(imageStorage({uploadsDir:path.join(root,'other'),realm:'other',hosted:true,env,fetcher}).read(row),{code:'media_content_unavailable'});
  database.set([...database.keys()][0],Buffer.from('corrupt').toString('base64'));
  await assert.rejects(cold.read(row),{code:'media_content_unavailable'});
  const imageStore = imageStorage({uploadsDir:path.join(root,'unavailable'),hosted:true,env:{}});
  await assert.rejects(imageStore.write(file,bytes),{code:'media_content_unavailable'});
  assert.equal(fs.existsSync(path.join(root,'unavailable',file)),false);
  const media = {id:'md_01',file:'brand-cards.webp',version:1,kind:'image',source:'website'}, before=structuredClone(media), state={mediaVersions:{}}, store={audit:[]};
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
  await assert.rejects(replaceImage({lib:{media:new Map([[media.id,media]])},state,store,uploadsDir:path.join(root,'unavailable'),imageStore,now:()=>now(),who:{user:{key:'fixture'}},key:media.id,file:{buffer:png,mimetype:'image/png',originalname:'new.png'},version:1}),{code:'media_content_unavailable'});
  assert.deepEqual(media,before);assert.deepEqual(state,{mediaVersions:{}});assert.deepEqual(store,{audit:[]});
});

test("media uploads retain descriptions, tags, alt text and focal points through persistence", async (t) => {
  const f = await fixture(t),
    form = new FormData();
  form.set(
    "file",
    new Blob(
      ["<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>"],
      { type: "image/svg+xml" },
    ),
    "fixture.svg",
  );
  form.set("description", "Demo image");
  form.set("tags", JSON.stringify(["demo", "demo", "website"]));
  const response = await fetch(f.base + "/v2/admin/media", {
    method: "POST",
    body: form,
  });
  assert.equal(response.status, 201);
  const { data: media } = await response.json();
  assert.deepEqual(media.tags, ["demo", "website"]);
  const edited = await f.call(
    `/admin/media/${media.id}`,
    "PATCH",
    { alt: { en: "Demo diagram" }, focal: { x: 25, y: 75 } },
    media.version,
  );
  assert.equal(edited.status, 200);
  f.hooks.importState(f.hooks.exportState());
  const detail = await f.call(`/admin/media/${media.id}`);
  assert.equal(detail.data.description, "Demo image");
  assert.equal(detail.data.alt.en, "Demo diagram");
  assert.deepEqual(detail.data.focal, { x: 25, y: 75 });
  assert.equal((await fetch(f.base + detail.data.url)).status, 200);
});

test("roadmap year navigation covers the whole collection and stays stable across filters and pages", async (t) => {
  const f = await fixture(t), snapshot = f.hooks.exportState();
  const template = structuredClone(snapshot.data.content.entries.find(([id]) => id === "rm_01")[1]);
  snapshot.data.content.entries = snapshot.data.content.entries.filter(([, row]) => row.type !== "roadmapItem");
  for (let n = 0; n < 104; n++) {
    const row = structuredClone(template);
    row.id = `rm_year_fixture_${n}`;
    row.order = n;
    row.draft = structuredClone(row.live);
    row.draft.locales.en.name = `Year navigation fixture ${n}`;
    row.draft.year = n < 100 ? "2025" : ["2024", "2026", "2050", "2025"][n - 100];
    row.workflow.state = "draft";
    snapshot.data.content.entries.push([row.id, row]);
  }
  f.hooks.importState(snapshot);
  const expected = ["2024", "2025", "2026", "2050"];
  for (const query of ["pageSize=1", "page=11", "year=2025", "search=absent", "year=1999&state=published&period=next"]) {
    const result = await f.call(`/admin/entries/roadmapItem?${query}`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.meta.years, expected, query);
  }
  const filtered = await f.call("/admin/entries/roadmapItem?year=2050");
  assert.equal(filtered.meta.total, 1);
  assert.equal(filtered.data[0].year, "2050");
  const reduced = structuredClone(snapshot);
  reduced.data.content.entries = reduced.data.content.entries.filter(([, row]) => row.type !== "roadmapItem" || row.draft.year !== "2050");
  f.hooks.importState(reduced);
  assert.deepEqual((await f.call("/admin/entries/roadmapItem")).meta.years, ["2024", "2025", "2026"]);
  assert.equal((await f.call("/admin/entries/page")).meta.years, undefined);
});
