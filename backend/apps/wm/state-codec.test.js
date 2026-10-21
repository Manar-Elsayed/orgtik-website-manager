const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), http = require("node:http");
const express = require("express");
const wm = require("../wm");
const { makeStore } = require("./content"), { makeLibrary } = require("./library"), { makeOps } = require("./ops");
const clone = value => JSON.parse(JSON.stringify(value));
const who = { key: "admin" }, now = () => "2026-10-07T09:00:00.000Z";
function cleanup(folder) { const resolved = fs.realpathSync(folder), parent = fs.realpathSync(os.tmpdir()) + path.sep; assert.ok(resolved.startsWith(parent) && path.basename(resolved).startsWith("orgtik-wm-codec-")); fs.rmSync(resolved, { recursive: true, force: true }); }
function mounted(folder, { realm = "wm-codec", active = true, permitted = true } = {}) {
  const actor = { id: 1, key: "admin", firstName: "WM", lastName: "Fixture", email: "staff@fixture.test", isActive: active };
  const identity = { userFromReq: req => req.headers["x-staff"] === "yes" ? actor : null, userScopes: () => [{ scope: "website_manager", roles: ["wm_admin"] }], publicUser: user => clone(user), fullName: user => `${user.firstName} ${user.lastName}`, findByKey: key => key === actor.key ? actor : null, findUser: id => Number(id) === actor.id ? actor : null, users: [actor] };
  const app = express(); app.use(express.json());
  const deliveries = [];
  const hooks = wm.routes(app, { realm, identity, uploadsDir: folder, config: { apiUrl: () => "http://unavailable.fixture.invalid" }, apiUrl: () => "http://unavailable.fixture.invalid", webUrl: () => "http://website.fixture.invalid", log() {}, workspaceBoundary: true, staffAccessForPerson: () => ({permissions:{wm:require('./permissions').permissionsFor(['wm_admin'])}}), previewIssuerAllowed: () => permitted, async salesLeadDelivery(payload, metadata) { deliveries.push({ payload, metadata }); return { state: "deferred", code: "orgtik_crm_intake_pending" }; } });
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ code: error.code, message: error.message }));
  return { app, hooks, actor, identity, deliveries };
}
async function serve(fixtures) {
  const app = express(); fixtures.forEach((fixture, index) => app.use(`/${index}`, fixture.app));
  const server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { async call(index, method, route, body, headers = {}) { const response = await fetch(`http://127.0.0.1:${server.address().port}/${index}${route}`, { method, headers: { connection: "close", "x-staff": "yes", ...headers, ...(body !== undefined ? { "content-type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) : {} }; }, async close() { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); } };
}

test("WM subcodecs restore Maps/settings in place and retain deleted-highest allocators", () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "orgtik-wm-codec-"));
  try {
    const store = makeStore(now), library = makeLibrary({ seed: store.seed, store, now, uploads: folder }), ops = makeOps({ store, now });
    const refs = { entries: store.entries, ideas: store.ideas, audit: store.audit, media: library.media, redirects: library.redirects, settings: library.settings, leads: ops.leads, site: ops.site };
    const media = library.addUpload(who, { originalname: "codec-sample.svg", mimetype: "image/svg+xml", size: 6, buffer: Buffer.from("sample") }); library.media.delete(media.id);
    const redirect = library.saveRedirect(who, { from: "/codec-old", to: "/codec-new", code: 301 }).redirect; assert.ok(redirect); library.redirects.delete(redirect.id);
    const lead = ops.submit({ name: "Visitor", email: "visitor@fixture.test", message: "Request", consent: true }).lead; ops.leads.delete(lead.id);
    const snapshots = [store.exportState(), library.exportState(), ops.exportState()];
    store.entries.clear(); store.ideas.clear(); store.audit.push({ action: "discarded" }); library.settings.visibility = "index"; ops.site.siteName = "Must restore";
    store.importState(snapshots[0]); library.importState(snapshots[1]); ops.importState(snapshots[2]);
    assert.deepEqual(store.exportState(), snapshots[0]); assert.deepEqual(library.exportState(), snapshots[1]); assert.deepEqual(ops.exportState(), snapshots[2]);
    for (const [key, ref] of Object.entries(refs)) assert.equal((key in store ? store : key in library ? library : ops)[key], ref);
    const next = library.addUpload(who, { originalname: "next.svg", mimetype: "image/svg+xml", size: 4, buffer: Buffer.from("next") }); assert.notEqual(next.id, media.id);
    assert.notEqual(library.saveRedirect(who, { from: "/codec-again", to: "/codec-next", code: 301 }).redirect.id, redirect.id);
    assert.notEqual(ops.submit({ name: "Next", email: "next@fixture.test", message: "Request", consent: true }).lead.id, lead.id);
  } finally { cleanup(folder); }
});

test("WM module codec restores route closures, draft history, media, settings, ideas and preview grants", async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "orgtik-wm-codec-")), first = mounted(folder), http = await serve([first]);
  let snapshot, token, draftName, mediaId, submittedIdea;
  try {
    fs.writeFileSync(path.join(folder, "preserved.svg"), "packaged sample bytes");
    const current = first.hooks.exportState(), privacy = current.data.content.entries.find(([key]) => key === "lg_privacy")[1];
    privacy.legalVersions = [{ versionLabel: "codec-privacy", effectiveFrom: "2020-01-01T00:00:00.000Z" }]; first.hooks.importState(current);
    const edited = await http.call(0, "PATCH", "/v2/admin/entries/caseStudy/cs_01", { locale: "en", fields: { name: "Codec persistent draft" }, note: "Codec fixture" }); assert.equal(edited.status, 200); draftName = edited.body.data.content.locales.en.name;
    mediaId = first.hooks.exportState().data.library.media[0][0];
    assert.equal((await http.call(0, "PATCH", `/v2/admin/media/${mediaId}`, { alt: { en: "Persistent media description", ar: "وصف محفوظ" }, focal: { x: 30, y: 70 } })).status, 200);
    assert.equal((await http.call(0, "PATCH", "/v2/admin/settings/site", { siteName: "Persistent CMS settings" })).status, 200);
    const ideaBody = { name: "Visitor", email: "visitor@fixture.test", topic: "Product", message: "Persistent idea", consent: true, privacyVersion: "codec-privacy" };
    const idea = await http.call(0, "POST", "/v2/public/ideas", ideaBody, { "idempotency-key": "persistent-idea" }); assert.equal(idea.status, 201); submittedIdea = { body: ideaBody, id: idea.body.data.id };
    const lead = await http.call(0, "POST", "/v2/public/leads", { ...ideaBody, message: "Persistent lead" }); assert.equal(lead.status, 201); assert.equal(lead.body.data.sales.state, "deferred"); assert.equal(first.deliveries.length, 1);
    const grant = await http.call(0, "POST", "/v2/admin/preview-token", {}); assert.equal(grant.status, 200); token = grant.body.data.token;
    const roles = await http.call(0, "GET", "/v2/admin/roles");
    const editorRole = roles.body.data.find(role => role.key === "wm_editor");
    assert.equal((await http.call(0, "PATCH", "/v2/admin/roles/wm_editor", { permissions: ["content:view"] }, { "if-match": editorRole.version })).status, 200);
    snapshot = first.hooks.exportState(); assert.deepEqual(snapshot.data.roles.wm_editor, ["content:view"]); assert.equal(JSON.stringify(snapshot).includes(token), false); assert.equal(wm.validatePreviewGrant(token).issuerKey, "admin");
    const before = clone(snapshot), invalid = clone(snapshot); invalid.data.content.audit.push({ action: "must-not-import" }); invalid.sequences.nextMedia = 0;
    assert.throws(() => first.hooks.importState(invalid), error => error.code === "wm_state_unavailable"); assert.deepEqual(first.hooks.exportState(), before);
    assert.throws(() => first.hooks.importState({ ...snapshot, realm: "foreign" })); assert.throws(() => first.hooks.importState({ ...snapshot, version: 99 }));
  } finally { await http.close(); }
  const restored = mounted(folder), secondHttp = await serve([restored]);
  try {
    assert.equal(fs.readFileSync(path.join(folder, "preserved.svg"), "utf8"), "packaged sample bytes");
    restored.hooks.importState(snapshot); assert.deepEqual(restored.hooks.exportState(), snapshot);
    const detail = await secondHttp.call(0, "GET", "/v2/admin/entries/caseStudy/cs_01"); assert.equal(detail.status, 200); assert.equal(detail.body.data.content.locales.en.name, draftName);
    const media = await secondHttp.call(0, "GET", `/v2/admin/media/${mediaId}`); assert.equal(media.body.data.alt.en, "Persistent media description");
    assert.equal((await secondHttp.call(0, "GET", "/v2/admin/settings/site")).body.data.siteName, "Persistent CMS settings");
    const duplicate = await secondHttp.call(0, "POST", "/v2/public/ideas", submittedIdea.body, { "idempotency-key": "persistent-idea" }); assert.equal(duplicate.status, 200); assert.equal(duplicate.body.data.id, submittedIdea.id); assert.equal(duplicate.body.data.duplicate, true);
    assert.equal((await secondHttp.call(0, "GET", "/v2/preview/entries/caseStudy", undefined, { authorization: `Preview ${token}` })).status, 200);
    restored.actor.isActive = false; assert.equal(wm.validatePreviewGrant(token), null); assert.equal((await secondHttp.call(0, "GET", "/v2/preview/entries/caseStudy", undefined, { authorization: `Preview ${token}` })).status, 401);
  } finally { await secondHttp.close(); cleanup(folder); }
});

test("WM imports remove newly staged records on rollback without reseeding or mutating another holder", () => {
  const aFolder = fs.mkdtempSync(path.join(os.tmpdir(), "orgtik-wm-codec-")), bFolder = fs.mkdtempSync(path.join(os.tmpdir(), "orgtik-wm-codec-"));
  try {
    const a = mounted(aFolder, { realm: "a" }), before = a.hooks.exportState(), b = mounted(bFolder, { realm: "b" }), second = b.hooks.exportState();
    const candidate = clone(before); candidate.data.ops.site.siteName = "Uncommitted"; candidate.data.content.audit.unshift({ action: "uncommitted" }); a.hooks.importState(candidate);
    assert.notDeepEqual(a.hooks.exportState(), before); a.hooks.importState(before); assert.deepEqual(a.hooks.exportState(), before); assert.deepEqual(b.hooks.exportState(), second);
    assert.throws(() => b.hooks.importState(before), error => error.status === 503);
  } finally { cleanup(aFolder); cleanup(bFolder); }
});

test("Role definitions and grants persist together, restore atomically, and accept older snapshots", async () => {
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),"orgtik-wm-codec-")),first=mounted(folder),http=await serve([first]);
  try {
    const created=await http.call(0,"POST","/v2/admin/roles",{label:"Persistent reviewer",permissions:["settings:view","content:view"]});assert.equal(created.status,201);const role=created.body.data;
    const snapshot=first.hooks.exportState();assert.equal(snapshot.data.roleDefinitions[role.key].label,role.label);
    assert.deepEqual(snapshot.data.roles[role.key],role.permissions);
    assert.equal((await http.call(0,"PATCH","/v2/admin/roles/"+role.key,{label:"Changed reviewer",permissions:[]},{"if-match":role.version})).status,200);
    first.hooks.importState(snapshot);assert.deepEqual(first.hooks.exportState(),snapshot);
    const restored=(await http.call(0,"GET","/v2/admin/roles")).body.data.find(row=>row.key===role.key);assert.equal(restored.label,role.label);assert.equal(restored.version,role.version);
    for(const mutate of [state=>{delete state.data.roles[role.key]},state=>{state.data.roleDefinitions[role.key].label="Admin"},state=>{state.data.roleDefinitions[role.key].permissions=["bad"]}]){
      const invalid=clone(snapshot);mutate(invalid);assert.throws(()=>first.hooks.importState(invalid),{code:"wm_state_unavailable"});assert.deepEqual(first.hooks.exportState(),snapshot);
    }
    const legacy=clone(snapshot);delete legacy.data.roleDefinitions;delete legacy.data.roles[role.key];first.hooks.importState(legacy);assert.deepEqual(first.hooks.exportState().data.roleDefinitions,{});
  }finally{await http.close();cleanup(folder);}
});

test("Deleted built-in and custom roles stay unavailable after a holder restart, and invalid tombstones fail atomically", async () => {
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'orgtik-wm-codec-')),first=mounted(folder),http=await serve([first]);
  let snapshot;
  try {
    const created=await http.call(0,'POST','/v2/admin/roles',{label:'Temporary reviewer',permissions:['content:view']});assert.equal(created.status,201);
    assert.equal((await http.call(0,'DELETE','/v2/admin/roles/'+created.body.data.key,undefined,{'if-match':created.body.data.version})).status,204);
    const editor=(await http.call(0,'GET','/v2/admin/roles')).body.data.find(role=>role.key==='wm_editor');
    const renamed=await http.call(0,'PATCH','/v2/admin/roles/wm_editor',{label:'Deleted editor',permissions:['content:view']},{'if-match':editor.version});assert.equal(renamed.status,200);
    assert.equal((await http.call(0,'DELETE','/v2/admin/roles/wm_editor',undefined,{'if-match':renamed.body.data.version})).status,204);
    snapshot=first.hooks.exportState();assert.equal(snapshot.data.roleDeletions.wm_editor,true);assert.equal(snapshot.data.roleDeletions[created.body.data.key],true);
    assert.equal(snapshot.data.roles.wm_editor,undefined);assert.equal(snapshot.data.roleDefinitions.wm_editor,undefined);
    for(const mutate of [state=>{state.data.roleDeletions.wm_super_admin=true},state=>{state.data.roleDeletions.wm_viewer=false},state=>{state.data.roleDeletions.unknown=true},state=>{state.data.roleDefinitions.wm_editor={label:'Resurrected editor'}},state=>{state.data.roles.wm_editor=['content:view']}]){
      const invalid=clone(snapshot);invalid.data.content.audit.unshift({action:'must-not-import'});mutate(invalid);
      assert.throws(()=>first.hooks.importState(invalid),{code:'wm_state_unavailable'});assert.deepEqual(first.hooks.exportState(),snapshot);
    }
  } finally {await http.close();}
  const restored=mounted(folder),second=await serve([restored]);
  try {
    restored.hooks.importState(snapshot);assert.deepEqual(restored.hooks.exportState(),snapshot);
    const roles=(await second.call(0,'GET','/v2/admin/roles')).body.data;
    assert.ok(!roles.some(role=>snapshot.data.roleDeletions[role.key]));assert.ok(roles.some(role=>role.key==='wm_super_admin'));
    assert.deepEqual(restored.identity.websiteManagerRoleAccess.roleKeysFor(['wm_editor']),[]);
    assert.deepEqual(restored.identity.websiteManagerRoleAccess.permissionsFor(['wm_editor']),[]);
    const legacy=clone(snapshot);delete legacy.data.roleDeletions;restored.hooks.importState(legacy);
    assert.deepEqual(restored.hooks.exportState().data.roleDeletions,{});
  } finally {await second.close();cleanup(folder);}
});
