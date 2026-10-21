// Website Manager: the media library and SEO (plan, Phase 2 "Media" and "SEO and marketing").
//
// Media: every file the website ships plus uploads, each with a description per language, rights,
// a focal point, and where it's used, worked out live from the entries (a case study's image, a
// module's picture) and from the page code (the hero video, logos). A file in use can't be
// deleted. Issues: in use without an English description, rights unknown or expiring, unused.
//
// SEO: a health check per page and entry (what a search result and a shared link need), the
// redirects (validated: no chains, loops, or redirects covering a real page), and indexing:
// search visibility, the sitemap and robots.txt, generated from the same entries.
const fs = require("fs");
const path = require("path");

const clone = (v) => JSON.parse(JSON.stringify(v));
const codec = require("./state-codec");
const RIGHTS = ["unknown", "owned", "licensed", "stock", "client"];
// Where each routable type lives on the website (after S3; today most open through # routes).
const ADDRESS = {
  page: (e, c) => c.slug.en,
  caseStudy: (e, c) => `/work/${c.slug.en}`,
  serviceFamily: (e, c) => `/services/${c.slug.en}`,
  service: (e, c, entries) => `/services/${(entries.get(e.parent)?.draft ?? entries.get(e.parent)?.live)?.slug.en ?? "…"}/${c.slug.en}`,
  softwareModule: (e, c) => `/software/${c.slug.en}`,
  article: (e, c) => `/insights/${c.slug.en}`,
  legalDocument: (e, c) => `/legal/${c.slug.en}`,
};
const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, "").trim();

function makeLibrary({ seed, store, now, uploads, demo = false, locales, site, publicLocales }) {
  const media = new Map((seed.media ?? []).map((m) => [m.id, clone(m)]));
  const redirects = new Map((seed.seo?.redirects ?? []).map((r) => [r.id, clone(r)]));
  const settings = clone(seed.seo?.settings ?? { visibility: "noindex", canonicalHost: "https://orgtik-site.vercel.app", publicLocales: ["en"], version: 1, history: [] });
  let nextMedia = media.size + 1;
  let nextRedirect = redirects.size + 1;
  const ensureDemo = () => { if (demo) { require("./seed/demo-states").redirectExamples(redirects, now); require("./seed/workflow-examples").mediaExamples(media); } };
  ensureDemo();
  const current = (e) => e.draft ?? e.live;
  const log = (who, action, id, type, extra = {}) => store.audit.unshift({ at: now(), by: who, action, entry: id, type, ...extra });

  // ---- media ----
  // Every place an entry names the file: { entry, type, name, field, ownAlt } (live and draft).
  function usesOf(m) {
    const files = [m.file, ...(m.retainedFiles || [])];
    const uses = [];
    for (const e of store.entries.values()) {
      const seen = new Set();
      for (const c of [e.live, e.draft].filter(Boolean)) {
        (function walk(v, at, parent) {
          if (typeof v === "string") {
            if (files.some(file => v === file || v === file.split("/").pop() || v.endsWith(`/assets/${file}`) || v.endsWith(`/media/${file}`))) {
              if (!seen.has(at)) {
                seen.add(at);
                uses.push({ entry: e.id, type: e.type, name: plain(c.locales.en?.name ?? c.name ?? e.id), field: at.replace(/^\./, ""), ownAlt: Boolean(parent?.alt?.en?.trim()) });
              }
            }
          } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}.${i}`, v));
          else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${at}.${k}`, v);
        })(c, "", null);
      }
    }
    return uses;
  }
  function issuesOf(m, uses) {
    const inUse = uses.length > 0 || m.templateUses.length > 0;
    const out = [];
    if (inUse && m.kind !== "video" && !m.alt.en?.trim()) out.push("noAlt");
    // A description Claude suggested (D-038) counts as missing until someone reviews and saves it.
    else if (inUse && m.altSuggested) out.push("altSuggested");
    if (inUse && m.rights.status === "unknown") out.push("rightsUnknown");
    if (m.rights.expires && m.rights.expires <= new Date(Date.parse(now()) + 30 * 864e5).toISOString().slice(0, 10)) out.push("rightsExpiring");
    if (!inUse) out.push("unused");
    return out;
  }
  function mediaOut(m, withUses = false) {
    const uses = usesOf(m);
    return { ...m, usage: uses.length + m.templateUses.length, issues: issuesOf(m, uses), ...(withUses ? { uses } : {}) };
  }
  // Resolve retained file references at read time; saved content and old revisions stay intact.
  function resolveMedia(value, base) {
    const replacements = [...media.values()].filter(m => m.source === 'upload' && m.retainedFiles?.length);
    if (!replacements.length) return value;
    const walk = v => {
      if (typeof v === 'string') {
        const m = replacements.find(m => [m.file, ...m.retainedFiles].some(file => v === file || v.endsWith(`/assets/${file}`) || v.endsWith(`/media/${file}`)));
        return m ? `${base.replace(/\/$/, '')}/v2/media/${encodeURIComponent(m.file)}` : v;
      }
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([key, child]) => [key, walk(child)]));
      return v;
    };
    return walk(value);
  }
  function updateMedia(m, who, patch) {
    const next = clone(m);
    const errors = {};
    if (patch.description !== undefined) {
      if (typeof patch.description !== "string" || patch.description.length > 2000) errors.description = "too_long";
      else next.description = patch.description.trim();
    }
    if (patch.tags !== undefined) {
      if (!Array.isArray(patch.tags) || patch.tags.length > 30 || patch.tags.some(tag => typeof tag !== "string" || tag.length > 80)) errors.tags = "invalid";
      else next.tags = [...new Set(patch.tags.map(tag => tag.trim()).filter(Boolean))];
    }
    if (patch.alt) for (const [l, v] of Object.entries(patch.alt)) next.alt[l] = String(v ?? "").trim();
    // Saving the description is the review.
    if (patch.alt) delete next.altSuggested;
    if (patch.rights) {
      next.rights = { ...next.rights, ...patch.rights };
      if (!RIGHTS.includes(next.rights.status)) errors["rights.status"] = "required";
      if (["licensed", "stock", "client"].includes(next.rights.status) && !String(next.rights.holder ?? "").trim()) errors["rights.holder"] = "required";
      if (next.rights.expires && !/^\d{4}-\d{2}-\d{2}$/.test(next.rights.expires)) errors["rights.expires"] = "required";
    }
    if (patch.focal) {
      const { x, y } = patch.focal;
      if (![x, y].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) errors.focal = "out_of_range";
      else next.focal = { x: Math.round(x), y: Math.round(y) };
    }
    if (Object.keys(errors).length) return { errors };
    next.version = m.version + 1;
    next.updatedAt = now();
    next.updatedBy = who.key;
    Object.assign(m, next);
    log(who.key, "media_update", m.id, "media");
    return { media: m };
  }
  function addUpload(who, file, metadata = {}) {
    const id = `md_${String(nextMedia++).padStart(2, "0")}`;
    const name = `${id}-${file.originalname.replace(/[^A-Za-z0-9._-]+/g, "-").toLowerCase()}`;
    fs.mkdirSync(uploads, { recursive: true });
    fs.writeFileSync(path.join(uploads, name), file.buffer);
    const ext = name.split(".").pop();
    const kind = file.mimetype === "image/svg+xml" ? "vector" : file.mimetype.startsWith("video/") ? "video" : "image";
    const m = { id, file: name, kind, bytes: file.size, width: null, height: null, alt: {}, rights: { status: "unknown", holder: "", expires: null, note: "" }, focal: { x: 50, y: 50 }, templateUses: [], source: "upload", addedAt: now(), addedBy: who.key, version: 1, ext };
    media.set(id, m);
    m.description = metadata.description ?? "";
    m.tags = metadata.tags ?? [];
    log(who.key, "media_upload", id, "media");
    return m;
  }
  function removeMedia(m, who) {
    const uses = usesOf(m);
    const count = uses.length + m.templateUses.length;
    if (count) return { status: 409, code: "in_use", message: "This file is used on the website.", count };
    media.delete(m.id);
    // Bytes are retained until storage garbage collection: a failed journal commit can
    // restore this record. The public media route serves only registered library files.
    log(who.key, "media_delete", m.id, "media");
    return { ok: true };
  }

  // ---- SEO health ----
  // Every language the site has switched on, published or not, so gaps are fixed before a language
  // goes live. Without a site list (tests, packaged tools), the public languages.
  const checkedLocales = () => locales?.() ?? settings.publicLocales;
  const CHECKS = ["titleMissing", "titleLong", "titleDuplicate", "descriptionMissing", "descriptionShort", "descriptionLong", "descriptionDuplicate", "addressDuplicate", "focusDuplicate", "textDuplicate", "noSocialImage", "imageNoAlt"];
  // A page's own copy, as passages long enough to matter (a heading or button label repeating is
  // normal): every string under its language, without addresses, images or its SEO block.
  const TEXT_MIN = 60;
  const NOT_TEXT = new Set(["slug", "href", "url", "src", "icon", "id", "image", "alt", "seo", "path", "link", "cta"]);
  function passages(node, out = new Map()) {
    if (node == null) return out;
    if (typeof node === "string") {
      const text = plain(node).replace(/\s+/g, " ");
      if (text.length >= TEXT_MIN && !/^(https?:|\/)/.test(text)) out.set(text.toLowerCase(), text);
    } else if (Array.isArray(node)) for (const n of node) passages(n, out);
    else if (typeof node === "object") for (const [k, v] of Object.entries(node)) if (!NOT_TEXT.has(k)) passages(v, out);
    return out;
  }
  // Two pages competing for one search result: the same title, description, address or focus keyphrase in one language.
  const DUPLICATES = { title: "titleDuplicate", description: "descriptionDuplicate", address: "addressDuplicate", focus: "focusDuplicate" };
  function health() {
    const rows = [];
    const seen = { title: new Map(), description: new Map(), address: new Map(), focus: new Map() };
    const note = (kind, value, index) => { if (value) seen[kind].set(value, [...(seen[kind].get(value) ?? []), index]); };
    // Page text: each passage, per language, with the rows that carry it and how it reads.
    const text = new Map(), excerptOf = new Map();
    for (const e of store.entries.values()) {
      if (!ADDRESS[e.type]) continue;
      const c = current(e);
      if (c.seo?.en?.robots === "noindex" && c.seo?.en?.inSitemap === false) continue; // sign-in and the like
      for (const l of checkedLocales()) {
        const seo = c.seo?.[l] ?? {};
        const title = String(seo.title ?? "").trim();
        const description = String(seo.description ?? "").trim();
        const keywords = Array.isArray(seo.keywords) ? seo.keywords.filter((k) => String(k ?? "").trim()).length : 0;
        const issues = [];
        if (!title) issues.push("titleMissing");
        else if (title.length > 60) issues.push("titleLong");
        if (!description) issues.push("descriptionMissing");
        else if (description.length < 60) issues.push("descriptionShort");
        else if (description.length > 160) issues.push("descriptionLong");
        if (!seo.ogImage && !c.image?.src) issues.push("noSocialImage");
        if (c.image?.src && !c.image.alt?.[l]?.trim()) issues.push("imageNoAlt");
        // Duplicates are per language: the same brand title in two languages is expected.
        const path = ADDRESS[e.type](e, c, store.entries), focus = String(seo.focus ?? "").trim().toLowerCase();
        note("title", title && `${l}:${title.toLowerCase()}`, rows.length);
        note("description", description && `${l}:${description.toLowerCase()}`, rows.length);
        note("address", `${l}:${path}`, rows.length);
        note("focus", focus && `${l}:${focus}`, rows.length);
        for (const [key, shown] of passages(c.locales?.[l])) {
          const k = `${l}:${key}`;
          text.set(k, [...(text.get(k) ?? []), rows.length]);
          excerptOf.set(k, shown);
        }
        rows.push({ id: e.id, type: e.type, name: plain(c.locales.en?.name ?? c.name ?? e.id), path, locale: l, title, description, titleLength: title.length, descriptionLength: description.length, keywords, focus: String(seo.focus ?? "").trim(), issues, duplicates: {}, state: e.draft ? e.workflow.state : "published" });
      }
    }
    // Each duplicate names the other pages, so the hint can say where the title or phrase is already used.
    for (const [kind, issue] of Object.entries(DUPLICATES)) for (const idx of seen[kind].values()) {
      const pages = [...new Set(idx.map((i) => rows[i].id))];
      if (pages.length < 2) continue;
      for (const i of idx) {
        rows[i].issues.push(issue);
        rows[i].duplicates[kind] = idx.filter((j) => rows[j].id !== rows[i].id).map((j) => ({ id: rows[j].id, type: rows[j].type, name: rows[j].name, path: rows[j].path }));
      }
    }
    // A page names each other page once, with the first passage they share.
    for (const [k, idx] of text) {
      if (new Set(idx.map((i) => rows[i].id)).size < 2) continue;
      for (const i of idx) {
        const others = new Map((rows[i].duplicates.text ?? []).map((o) => [o.id, o]));
        for (const j of idx) if (rows[j].id !== rows[i].id && !others.has(rows[j].id)) others.set(rows[j].id, { id: rows[j].id, type: rows[j].type, name: rows[j].name, path: rows[j].path, excerpt: excerptOf.get(k) });
        rows[i].duplicates.text = [...others.values()];
        rows[i].issues.push("textDuplicate");
      }
    }
    for (const row of rows) row.issues = CHECKS.filter((k) => row.issues.includes(k));
    const counts = Object.fromEntries(CHECKS.map((k) => [k, rows.filter((r) => r.issues.includes(k)).length]));
    return { rows, counts, healthy: rows.filter((r) => !r.issues.length).length };
  }
  // The SEO health table: one row per page and set of issues, so languages with exactly the same
  // issues share a row.
  function groupHealthRows(rows) {
    const groups = new Map();
    for (const row of rows) {
      const key = `${row.id}|${row.issues.join(",")}`;
      const g = groups.get(key);
      if (!g) groups.set(key, { ...row, locales: [row.locale], titleLengths: [row.titleLength], descriptionLengths: [row.descriptionLength] });
      else { g.locales.push(row.locale); g.titleLengths.push(row.titleLength); g.descriptionLengths.push(row.descriptionLength); }
    }
    return [...groups.values()];
  }
  // What the SEO editor warns about while typing: other pages in this language already using the
  // title, focus keyphrase or address.
  function seoConflicts({ entry, lang, title, description, focus }) {
    const rows = health().rows.filter((r) => r.locale === lang);
    const own = rows.find((r) => r.id === entry), others = rows.filter((r) => r.id !== entry);
    const same = (a, b) => Boolean(a) && a.trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
    const pick = (r) => ({ id: r.id, type: r.type, name: r.name, path: r.path });
    return {
      title: others.filter((r) => same(r.title, title)).map(pick),
      description: others.filter((r) => same(r.description, description)).map(pick),
      focus: others.filter((r) => same(r.focus, focus)).map(pick),
      address: own ? others.filter((r) => r.path === own.path).map(pick) : [],
      text: own?.duplicates.text ?? [],
    };
  }
  // SEO missing: SEO health's checks plus the keyword fields, grouped like the SEO editor's
  // sections (search results, keywords, shared links) and the content editor's image, one row per
  // page with the languages that have something to fix.
  const SEO_GROUPS = {
    search: ["titleMissing", "titleLong", "titleDuplicate", "descriptionMissing", "descriptionShort", "descriptionLong", "descriptionDuplicate", "addressDuplicate", "textDuplicate"],
    keywords: ["focusMissing", "focusDuplicate", "keywordsMissing"],
    sharing: ["noSocialImage"],
    images: ["imageNoAlt"],
  };
  const SEO_ISSUES = Object.values(SEO_GROUPS).flat();
  function missingSeo() {
    const pages = new Map();
    for (const { issues, duplicates, ...row } of health().rows) {
      const e = store.entries.get(row.id), seo = current(e).seo?.[row.locale] ?? {};
      const found = [...issues, ...(String(seo.focus ?? "").trim() ? [] : ["focusMissing"]), ...(row.keywords ? [] : ["keywordsMissing"])];
      const page = pages.get(row.id) ?? { id: row.id, type: row.type, name: row.name, path: row.path, title: row.title, state: row.state, visibility: e.workflow.visibility, updatedAt: e.workflow.updatedAt, languages: [], issues: [], byLanguage: {}, duplicates: {} };
      pages.set(row.id, page);
      if (!found.length) continue;
      page.languages.push(row.locale);
      page.byLanguage[row.locale] = SEO_ISSUES.filter((i) => found.includes(i));
      if (Object.keys(duplicates).length) page.duplicates[row.locale] = duplicates;
      page.issues = SEO_ISSUES.filter((i) => page.issues.includes(i) || found.includes(i));
    }
    const locales = checkedLocales();
    const rows = [...pages.values()].filter((p) => p.issues.length).map((p) => ({ ...p, locale: p.languages[0], allLanguages: locales.length > 1 && p.languages.length === locales.length }));
    // Pages on the site come first: their gaps are what visitors and search engines see today.
    const live = (r) => (r.visibility === "live" ? 0 : 1);
    rows.sort((x, y) => live(x) - live(y) || y.issues.length - x.issues.length || x.name.localeCompare(y.name));
    const counts = Object.fromEntries(Object.entries(SEO_GROUPS).map(([group, keys]) => [group, rows.filter((r) => r.issues.some((i) => keys.includes(i))).length]));
    return { rows, counts, incomplete: rows.length, checked: pages.size, locales };
  }

  // ---- redirects ----
  const livePaths = () => new Set([...store.entries.values()].filter((e) => ADDRESS[e.type] && e.live && e.workflow.visibility === "live").map((e) => ADDRESS[e.type](e, e.live, store.entries)));
  // Active redirects run; disabled ones are kept but not served; "attention" still runs and is flagged for review.
  const REDIRECT_STATUSES = ["active", "disabled", "attention"];
  const QUERY_MODES = ["keep", "drop"];
  // Two addresses are the same redirect source when they differ only by a trailing slash or letter
  // case (/About/ and /about); fragments and query strings never take part in matching.
  const normPath = (p) => { let x = String(p ?? "").trim().split("#")[0].split("?")[0]; if (x.length > 1) x = x.replace(/\/+$/, ""); return x.toLowerCase(); };
  // Where one redirect sends a path, exactly as the website's server applies it (orgtik-site/middleware.js).
  function applyRedirect(r, path) {
    const p = normPath(path);
    if (r.from.endsWith("/*")) {
      const prefix = normPath(r.from.slice(0, -2));
      if (p !== prefix && !p.startsWith(prefix + "/")) return null;
      const rest = p.slice(prefix.length + 1);
      return r.to.includes("*") ? r.to.replace("*", rest).replace(/\/(?=#|$)/, (m) => (rest ? m : "")) : r.to;
    }
    return normPath(r.from) === p ? r.to : null;
  }
  // Exact sources before wildcards, longer wildcards first: the order the server tries them.
  const byPrecedence = (list) => [...list].sort((a, b) => Number(a.from.endsWith("/*")) - Number(b.from.endsWith("/*")) || b.from.length - a.from.length);
  const firstMatch = (list, path) => { for (const r of byPrecedence(list)) { const to = applyRedirect(r, path); if (to != null) return { r, to }; } return null; };
  // The path a redirect is checked from: its own address, or a sample under a wildcard.
  const samplePath = (r) => (r.from.endsWith("/*") ? r.from.replace("*", "sample") : r.from);
  function validateRedirect(r, selfId) {
    const errors = {};
    const status = r.status ?? "active";
    if (!REDIRECT_STATUSES.includes(status)) errors.status = "required";
    const query = r.query ?? "keep";
    if (!QUERY_MODES.includes(query)) errors.query = "required";
    const from = String(r.from ?? "").trim();
    const to = String(r.to ?? "").trim();
    if (!/^\/[^\s?#]*$/.test(from)) errors.from = "path_format";
    else if (from.includes("*") && !from.endsWith("/*")) errors.from = "wildcard_end";
    if (!/^(\/|https:\/\/)\S*$/.test(to)) errors.to = "path_format";
    else if (to.includes("*") && !from.includes("*")) errors.to = "wildcard_unmatched";
    if (from && normPath(from) === normPath(to)) errors.to = "same_as_from";
    if (![301, 302].includes(Number(r.code))) errors.code = "required";
    const others = [...redirects.values()].filter((x) => x.id !== selfId);
    if (others.some((x) => normPath(x.from) === normPath(from))) errors.from = "duplicate";
    if (livePaths().has(from)) errors.from = "shadows_page";
    // A redirect to an address another redirect catches (exactly or by wildcard) is a chain, or a
    // loop when it comes back: point straight at the end instead.
    const serving = others.filter((x) => x.status !== "disabled");
    if (!errors.to && !errors.from && to.startsWith("/") && !to.includes("*")) {
      const next = firstMatch(serving, to);
      if (next) {
        const seen = new Set([normPath(from)]);
        let at = next.to, hops = 0, loop = false;
        while (at && hops < 10) {
          if (seen.has(normPath(at))) { loop = true; break; }
          seen.add(normPath(at));
          const step = at.startsWith("/") ? firstMatch(serving, at) : null;
          if (!step) break;
          at = step.to; hops += 1;
        }
        errors.to = loop || normPath(next.to) === normPath(from) ? "loop" : "chain";
      }
    }
    return { errors, clean: { from, to, code: Number(r.code), status, query, note: String(r.note ?? "").trim() || undefined } };
  }
  // Every problem in the saved redirects, with its reason and the redirects it concerns. With the
  // live build's redirect list (`deployed`), also where the website's server differs from here.
  function redirectProblems({ deployed = null, addresses = null } = {}) {
    const all = [...redirects.values()];
    const serving = all.filter((r) => r.status !== "disabled");
    const host = serving.filter((r) => (r.handledBy ?? "host") === "host");
    const problems = [];
    const add = (kind, ids, detail = {}) => problems.push({ kind, ids, ...detail });
    // Duplicate sources (after normalising), and redirects to themselves.
    const bySource = new Map();
    for (const r of all) bySource.set(normPath(r.from), [...(bySource.get(normPath(r.from)) ?? []), r]);
    for (const group of bySource.values()) if (group.length > 1) add("duplicate", group.map((r) => r.id), { from: group[0].from });
    for (const r of all) if (normPath(r.from) === normPath(r.to)) add("self", [r.id], { from: r.from });
    // Loops and chains: follow each serving redirect the way the server would, up to 10 steps.
    for (const r of serving) {
      const path = [samplePath(r)];
      const ids = [r.id];
      let at = applyRedirect(r, path[0]);
      let loop = false;
      for (let hop = 0; at && at.startsWith("/") && hop < 10; hop++) {
        const seen = path.some((p) => normPath(p) === normPath(at));
        path.push(at);
        if (seen) { loop = true; break; }
        const step = firstMatch(serving, at);
        if (!step) break;
        ids.push(step.r.id);
        at = step.to;
      }
      if (loop) add("loop", [...new Set(ids)], { path });
      else if (ids.length > 1) add("chain", [r.id], { path, related: ids.slice(1), suggestion: path[path.length - 1] });
    }
    // Destinations the site doesn't have: an internal address that is neither a page nor caught by
    // another redirect. Full https:// destinations are outside the site and checked by Test.
    if (addresses) for (const r of serving) {
      if (!r.to.startsWith("/") || r.to.includes("*")) continue;
      const path = normPath(r.to);
      if (!addresses.has(path) && !firstMatch(serving.filter((x) => x.id !== r.id), path)) add("destinationMissing", [r.id], { to: r.to });
    }
    // The website's server against the settings here (from the live build's record).
    if (deployed) {
      const live = new Map(deployed.map((d) => [normPath(d.from), d]));
      for (const r of all.filter((x) => (x.handledBy ?? "host") === "host")) {
        const d = live.get(normPath(r.from));
        if (r.status === "disabled") { if (d) add("disabledStillLive", [r.id], { from: r.from }); continue; }
        if (!d) add("notDeployed", [r.id], { from: r.from });
        else if (d.to !== r.to || Number(d.code) !== Number(r.code) || (d.query ?? "keep") !== (r.query ?? "keep")) add("deployedDiffers", [r.id], { from: r.from, live: { to: d.to, code: d.code, query: d.query ?? "keep" } });
      }
      const known = new Set(all.map((r) => normPath(r.from)));
      for (const d of deployed) if (!known.has(normPath(d.from))) add("deletedStillLive", [], { from: d.from });
    }
    return problems;
  }
  // How a redirect runs on the website: on its server (in the live build), in the browser, saved
  // here but not on the site yet, or only configured (no build to compare with, or disabled).
  function executionOf(r, deployed) {
    if ((r.handledBy ?? "host") === "browser") return "browser";
    if (!deployed) return "configured";
    const d = deployed.find((x) => normPath(x.from) === normPath(r.from));
    if (r.status === "disabled") return d ? "server" : "configured";
    return d && d.to === r.to && Number(d.code) === Number(r.code) && (d.query ?? "keep") === (r.query ?? "keep") ? "server" : "notDeployed";
  }
  // What a test of the redirect expects from the website's server.
  function expectedTest(r) {
    const path = samplePath(r);
    const probe = `${path}?redirect-test=1`;
    return { path, probe, status: Number(r.code), to: applyRedirect(r, path), query: (r.query ?? "keep") === "keep" };
  }
  function recordTest(r, who, result) {
    r.lastTest = { at: now(), by: who.key, ...result };
    log(who.key, "redirect_test", r.id, "redirect", { pass: result.pass });
    return r.lastTest;
  }
  function saveRedirect(who, input, existing) {
    const { errors, clean } = validateRedirect(input, existing?.id);
    if (Object.keys(errors).length) return { errors };
    if (existing) {
      Object.assign(existing, clean, { version: existing.version + 1, updatedAt: now(), updatedBy: who.key });
      log(who.key, "redirect_update", existing.id, "redirect");
      return { redirect: existing };
    }
    const r = { id: `rd_${String(nextRedirect++).padStart(2, "0")}`, ...clean, source: "manager", handledBy: "host", createdAt: now(), createdBy: who.key, version: 1 };
    redirects.set(r.id, r);
    log(who.key, "redirect_create", r.id, "redirect");
    return { redirect: r };
  }
  // What the website's server applies (the publish pipeline), and what only the browser handles.
  const servedRedirects = () => [...redirects.values()].filter((r) => r.status !== "disabled");
  const serverRedirects = () => servedRedirects().filter((r) => (r.handledBy ?? "host") === "host").map(({ id, from, to, code, query }) => ({ id, from, to, code, query: query ?? "keep" })).sort((a, b) => a.from.localeCompare(b.from));
  // Publishing the website: the last request to rebuild it, and by whom.
  let lastPublish = null;
  // The last Validate indexing settings: when, by whom, and every check's result.
  let lastValidation = null;
  const recordValidation = (value) => (lastValidation = value);
  function recordPublish(who, result) {
    lastPublish = { at: now(), by: who.key, ok: result.ok, status: result.status ?? null, reason: String(result.reason ?? "").trim() || null };
    log(who.key, "site_publish", "site", "settings", { ok: result.ok });
    return lastPublish;
  }
  function removeRedirect(r, who) {
    redirects.delete(r.id);
    log(who.key, "redirect_delete", r.id, "redirect");
  }

  // ---- a published address that changes keeps working (plan: "a change after publishing creates 301s") ----
  const liveAddresses = () => new Map([...store.entries.values()].filter((e) => ADDRESS[e.type] && e.workflow.visibility === "live" && e.live).map((e) => [e.id, ADDRESS[e.type](e, e.live, liveOnly)]));
  // A service's address uses its family's live slug, not a draft one.
  const liveOnly = { get: (id) => { const x = store.entries.get(id); return x && { live: x.live, draft: x.live }; } };
  function keepAddresses(who, fn) {
    const before = liveAddresses();
    const result = fn();
    const after = liveAddresses();
    for (const [id, at] of after) {
      if (before.has(id)) continue;
      // Back on the site (or new): nothing may redirect away from its address.
      for (const r of [...redirects.values()]) if (r.from === at) redirects.delete(r.id);
    }
    for (const [id, was] of before) {
      const now_ = after.get(id);
      if (!now_) {
        // Off the site: its address goes to the list it was part of, so no link breaks.
        const listing = "/" + was.split("/")[1];
        if (listing === was || [...redirects.values()].some((r) => r.from === was)) continue;
        const r = { id: `rd_${String(nextRedirect++).padStart(2, "0")}`, from: was, to: listing, code: 301, note: "Taken off the site.", entry: id, source: "archived", handledBy: "host", createdAt: now(), createdBy: who.key, version: 1 };
        redirects.set(r.id, r);
        log(who.key, "redirect_auto", id, store.entries.get(id)?.type ?? "entry", { from: was, to: listing });
        continue;
      }
      if (now_ === was) continue;
      // Anything that pointed at the old address points at the new one (no chains)…
      for (const r of redirects.values()) {
        const [path, hash] = r.to.split("#");
        if (path === was) Object.assign(r, { to: now_ + (hash ? "#" + hash : ""), version: r.version + 1, updatedAt: now(), updatedBy: who.key });
      }
      // …a redirect away from the new address would hide the page now there…
      for (const r of [...redirects.values()]) if (r.from === now_) redirects.delete(r.id);
      // …and the old address sends visitors and search engines on.
      const existing = [...redirects.values()].find((r) => r.from === was);
      if (existing) Object.assign(existing, { to: now_, code: 301, version: existing.version + 1, updatedAt: now(), updatedBy: who.key });
      else {
        const r = { id: `rd_${String(nextRedirect++).padStart(2, "0")}`, from: was, to: now_, code: 301, note: "The address changed when this was published.", entry: id, source: "address_change", handledBy: "host", createdAt: now(), createdBy: who.key, version: 1 };
        redirects.set(r.id, r);
      }
      log(who.key, "redirect_auto", id, store.entries.get(id).type, { from: was, to: now_ });
    }
    return result;
  }

  // What the preview can open: every address as the drafts have it (a draft slug moves it).
  function previewAddresses() {
    return [...store.entries.values()]
      .filter((e) => ADDRESS[e.type] && e.workflow.visibility !== "archived")
      .map((e) => ({ path: ADDRESS[e.type](e, current(e), store.entries), id: e.id, type: e.type, name: plain(current(e).locales?.en?.name ?? current(e).name ?? e.id), draft: Boolean(e.draft), onSite: e.workflow.visibility === "live" }))
      .sort((x, y) => x.path.localeCompare(y.path));
  }

  // ---- indexing ----
  // The public languages: the Site settings toggles (one source with the website, which builds its
  // pages and hreflang from them). Without Site settings (tests, tools), the saved list.
  const sitePublicLocales = () => publicLocales?.() ?? settings.publicLocales;
  const urlIn = (locale, path) => settings.canonicalHost + (locale === "en" ? "" : `/${locale}`) + (path === "/" && locale !== "en" ? "" : path);
  // Every published address in every public language: its own policy, what search engines are
  // told after the site-wide setting, its canonical, and whether the published sitemap lists it.
  function indexingUrls() {
    const urls = [];
    const hidden = settings.visibility === "noindex";
    for (const entry of store.entries.values()) {
      if (!ADDRESS[entry.type] || entry.workflow.visibility !== "live" || !entry.live) continue;
      for (const locale of sitePublicLocales()) {
        const seo = entry.live.seo?.[locale] ?? entry.live.seo?.en ?? {};
        const path = ADDRESS[entry.type](entry, entry.live, liveOnly);
        const loc = urlIn(locale, path);
        const pagePolicy = seo.robots === "noindex" ? "noindex" : "index";
        const policy = hidden || pagePolicy === "noindex" ? "noindex" : "index";
        // Always the page's own address; an override saved before it became automatic is ignored.
        const canonical = loc;
        const sitemapSetting = seo.inSitemap !== false;
        const canonicalSelf = canonical === loc;
        // The website's rule (orgtik-site/scripts/prerender-heads.mjs): indexable, its own original, and wanted in the sitemap.
        const inSitemap = sitemapSetting && policy === "index" && canonicalSelf;
        const warnings = [];
        if (sitemapSetting && pagePolicy === "noindex") warnings.push("noindexInSitemap");
        if (sitemapSetting && !canonicalSelf) warnings.push("canonicalElsewhere");
        const lastmod = entry.workflow.publishedAt ?? entry.workflow.updatedAt ?? null;
        urls.push({
          id: entry.id, type: entry.type, name: plain(entry.live.locales?.en?.name ?? entry.live.name ?? entry.id), locale, path, loc, canonical, canonicalSelf,
          pagePolicy, policy, overridden: hidden && pagePolicy === "index",
          reason: hidden ? "siteOverride" : pagePolicy === "noindex" ? "pagePolicy" : "allowed",
          sitemapSetting, inSitemap, warnings, lastmod,
        });
      }
    }
    return urls.sort((a, b) => a.loc.localeCompare(b.loc));
  }
  // Canonical addresses that can't be right, for Validate indexing settings: one on another website,
  // or one the site doesn't serve. A canonical naming another live page is a choice, not a problem.
  function canonicalProblems() {
    const urls = indexingUrls();
    const host = new URL(settings.canonicalHost).host;
    const trim = (s) => s.replace(/\/+$/, "");
    const served = new Set(urls.map((u) => trim(u.loc)));
    const out = [];
    for (const u of urls) {
      if (u.canonicalSelf) continue;
      let target = null;
      try { target = new URL(u.canonical); } catch { /* the editor only saves https addresses */ }
      if (!target || target.host !== host) out.push({ id: u.id, locale: u.locale, kind: "otherHost", canonical: u.canonical });
      else if (!served.has(trim(target.origin + target.pathname))) out.push({ id: u.id, locale: u.locale, kind: "notServed", canonical: u.canonical });
    }
    return out;
  }
  // The sitemap the website publishes: only what search engines may index, each at its own address.
  const sitemap = () => indexingUrls().filter((u) => u.inSitemap).map(({ loc, lastmod, type, id }) => ({ loc, lastmod: String(lastmod ?? "").slice(0, 10), type, id }));
  // robots.txt: as written here when someone has, otherwise generated from the site-wide setting.
  const generatedRobots = () =>
    settings.visibility === "noindex"
      ? "# Page heads carry noindex. Crawling remains allowed so engines can read it.\nUser-agent: *\nAllow: /\n"
      : `User-agent: *\nAllow: /\n\nSitemap: ${settings.canonicalHost}/sitemap.xml\n`;
  const robots = () => (typeof settings.robotsTxt === "string" ? settings.robotsTxt : generatedRobots());
  const robotsTools = require("./robots");
  // Every published address, for the robots.txt warnings: is it one search engines should find?
  const robotsPages = () => indexingUrls().filter((u) => u.locale === "en").map((u) => ({ path: u.path, url: u.loc, name: u.name, indexable: u.policy === "index" || u.pagePolicy === "index" }));
  const robotsWarnings = (text) => robotsTools.robotsWarnings(text, { pages: robotsPages(), canonicalHost: settings.canonicalHost, visible: settings.visibility === "index" });
  function setRobots(who, text, reason) {
    if (!String(reason ?? "").trim()) return { errors: { reason: "required" } };
    if (text !== null && typeof text !== "string") return { errors: { robots: "required" } };
    if (typeof text === "string" && Buffer.byteLength(text) > robotsTools.MAX_BYTES) return { errors: { robots: "too_long" } };
    const next = text === null ? undefined : text.replace(/\r\n/g, "\n").replace(/\s*$/, "\n");
    if (next === settings.robotsTxt) return { settings };
    if (next === undefined) delete settings.robotsTxt; else settings.robotsTxt = next;
    settings.version += 1;
    settings.history.unshift({ at: now(), by: who.key, visibility: settings.visibility, robots: next === undefined ? "generated" : "custom", note: String(reason).trim() });
    log(who.key, "robots_txt", "site", "settings", { custom: next !== undefined });
    return { settings };
  }
  function setVisibility(who, visibility, reason) {
    if (!["index", "noindex"].includes(visibility)) return { errors: { visibility: "required" } };
    if (!String(reason ?? "").trim()) return { errors: { reason: "required" } };
    if (visibility === settings.visibility) return { settings };
    settings.visibility = visibility;
    settings.version += 1;
    settings.history.unshift({ at: now(), by: who.key, visibility, note: String(reason).trim() });
    log(who.key, "search_visibility", "site", "settings", { visibility });
    return { settings };
  }

  // The address every canonical, hreflang and sitemap URL is built on: an https origin, nothing more.
  function setCanonicalHost(who, host, reason) {
    let url = null;
    try { url = new URL(String(host ?? "").trim()); } catch { /* reported below */ }
    if (!url || url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username) return { errors: { canonicalHost: "origin_format" } };
    if (!String(reason ?? "").trim()) return { errors: { reason: "required" } };
    if (url.origin === settings.canonicalHost) return { settings };
    const was = settings.canonicalHost;
    settings.canonicalHost = url.origin;
    settings.version += 1;
    settings.history.unshift({ at: now(), by: who.key, visibility: settings.visibility, canonicalHost: url.origin, note: String(reason).trim() });
    log(who.key, "canonical_host", "site", "settings", { from: was, to: url.origin });
    return { settings };
  }

  const exportState = () => ({ data: clone({ media: [...media], redirects: [...redirects], settings, lastPublish, lastValidation, demoVersion: 3 }), sequences: { nextMedia, nextRedirect } });
  const validateState = value => {
    const incoming = codec.object(value), rows = codec.mapRows(incoming.data?.media), redirects_ = codec.mapRows(incoming.data?.redirects), settings_ = codec.object(incoming.data?.settings);
    if (!Number.isSafeInteger(settings_.version) || !Array.isArray(settings_.history) || !Array.isArray(settings_.publicLocales)) throw codec.fail("Website Manager SEO settings are incomplete.");
    return { data: { media: rows, redirects: redirects_, settings: settings_, lastPublish: incoming.data.lastPublish ?? null, lastValidation: incoming.data.lastValidation ?? null, demoVersion: incoming.data.demoVersion ?? 0 }, sequences: { nextMedia: codec.sequence(incoming.sequences?.nextMedia, rows, "md"), nextRedirect: codec.sequence(incoming.sequences?.nextRedirect, redirects_, "rd") } };
  };
  const importState = value => { const incoming = validateState(value); codec.replaceMap(media, incoming.data.media); codec.replaceMap(redirects, incoming.data.redirects); codec.replaceObject(settings, incoming.data.settings); lastPublish = incoming.data.lastPublish; lastValidation = incoming.data.lastValidation; nextMedia = incoming.sequences.nextMedia; nextRedirect = incoming.sequences.nextRedirect; if (incoming.data.demoVersion < 1) ensureDemo(); else if (demo && incoming.data.demoVersion < 2) require("./seed/workflow-examples").mediaExamples(media); if (demo && incoming.data.demoVersion < 3) require("./seed/demo-states").redirectStatusExamples(redirects); };
  return { media, redirects, settings, mediaOut, resolveMedia, updateMedia, addUpload, removeMedia, serverRedirects, redirectProblems, executionOf, expectedTest, recordTest, normPath, applyRedirect, QUERY_MODES, recordPublish, lastPublish: () => lastPublish, recordValidation, lastValidation: () => lastValidation, health, groupHealthRows, CHECKS, missingSeo, SEO_GROUPS, checkedLocales, seoConflicts, saveRedirect, removeRedirect, REDIRECT_STATUSES, sitemap, indexingUrls, canonicalProblems, robots, generatedRobots, robotsWarnings, robotsTools, setRobots, sitePublicLocales, setVisibility, setCanonicalHost, RIGHTS, keepAddresses, previewAddresses, exportState, importState, validateState };
}

module.exports = { makeLibrary };
