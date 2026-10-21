// What the public website actually serves, read over HTTP: its build record (/build.json), the
// published sitemap and robots.txt, and how an address answers (status and Location, without
// following redirects). The Website Manager compares these with its own settings, so a setting is
// never shown as live just because it was saved here.
const crypto = require("crypto");

const TIMEOUT = 8000;
const websiteUrl = (env = process.env) => String(env.WEBSITE_URL || env.NEXT_PUBLIC_WEBSITE_URL || "").replace(/\/$/, "");
const hash = (text) => crypto.createHash("sha256").update(String(text ?? "")).digest("hex").slice(0, 16);

function makeLiveSite({ env = process.env, fetcher = (...args) => fetch(...args), now = () => Date.now() } = {}) {
  const base = () => websiteUrl(env);
  let cache = null;

  async function get(path, { text = false } = {}) {
    const res = await fetcher(base() + path, { redirect: "manual", cache: "no-store", headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return { status: res.status, body: null };
    return { status: res.status, body: text ? await res.text() : await res.json().catch(() => null) };
  }

  // The site's files, at most every 20 seconds (pages read this on every open).
  async function snapshot({ fresh = false } = {}) {
    if (!base()) return { configured: false, reachable: false, url: null };
    if (!fresh && cache && now() - cache.at < 20000) return cache.value;
    let value;
    try {
      const [build, sitemap, robots] = await Promise.all([get("/build.json"), get("/sitemap.xml", { text: true }), get("/robots.txt", { text: true })]);
      value = { configured: true, reachable: true, url: base(), build: build.body, sitemap: sitemap.body == null ? { status: sitemap.status, xml: null } : { status: sitemap.status, xml: sitemap.body }, robots: robots.body == null ? { status: robots.status, text: null } : { status: robots.status, text: robots.body } };
    } catch {
      value = { configured: true, reachable: false, url: base() };
    }
    cache = { at: now(), value };
    return value;
  }

  // One address on the live site: its status and where it sends the visitor.
  async function probe(path) {
    if (!base()) return { configured: false };
    const url = base() + path;
    try {
      const res = await fetcher(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
      const location = res.headers.get("location");
      return { configured: true, url, status: res.status, location: location ? new URL(location, url).toString() : null };
    } catch {
      return { configured: true, url, status: 0, location: null };
    }
  }

  return { base, snapshot, probe, forget: () => { cache = null; } };
}

// A sitemap's URLs, and what is wrong with the file: not XML, no urlset, addresses on another host.
function readSitemap(xml, canonicalHost) {
  const problems = [];
  if (!xml) return { urls: [], problems: ["missing"] };
  if (!/^\s*<\?xml/.test(xml) || !/<urlset[\s>]/.test(xml) || !/<\/urlset>\s*$/.test(xml)) problems.push("not_valid_xml");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].length;
  if (canonicalHost) {
    const host = new URL(canonicalHost).host;
    if (urls.some((u) => { try { return new URL(u).host !== host; } catch { return true; } })) problems.push("other_host");
  }
  if (urls.length && lastmods < urls.length) problems.push("no_lastmod");
  return { urls, problems };
}

module.exports = { makeLiveSite, readSitemap, hash, websiteUrl };
