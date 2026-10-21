// robots.txt: reading the rules, testing an address against them the way Google does, and the
// warnings worth showing before a change is published. Crawling only: robots.txt never keeps a page
// out of search results (that is noindex), and blocking a page stops search engines from reading
// its noindex.
const MAX_BYTES = 10000;
const DIRECTIVES = new Set(["user-agent", "allow", "disallow", "sitemap", "crawl-delay", "host"]);

/** Groups of user agents with their Allow/Disallow rules, the Sitemap lines, and lines not understood. */
function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  const unknown = [];
  let current = null;
  let lastWasAgent = false;
  String(text ?? "").split(/\r?\n/).forEach((raw, index) => {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) return;
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!match || !DIRECTIVES.has(match[1].toLowerCase())) { unknown.push(index + 1); return; }
    const key = match[1].toLowerCase(), value = match[2].trim();
    if (key === "sitemap") { sitemaps.push(value); return; }
    if (key === "user-agent") {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      return;
    }
    lastWasAgent = false;
    if (!current) { unknown.push(index + 1); return; }
    if (key === "allow" || key === "disallow") current.rules.push({ type: key, path: value, line: index + 1 });
  });
  return { groups, sitemaps, unknown };
}

// A rule path as a pattern: * matches anything, a trailing $ anchors the end.
function matches(pattern, path) {
  if (!pattern) return false;
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern).split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path);
}

/** Whether an address may be crawled: the agent's own group (else *), the longest matching rule wins, Allow on a tie. */
function testRobots(text, path, agent = "googlebot") {
  const { groups } = parseRobots(text);
  const name = agent.toLowerCase();
  const group = groups.find((g) => g.agents.some((a) => a !== "*" && name.startsWith(a))) ?? groups.find((g) => g.agents.includes("*"));
  if (!group) return { allowed: true, rule: null, agent: null };
  let best = null;
  for (const rule of group.rules) {
    // An empty Disallow allows everything; it never matches.
    if (!rule.path || !matches(rule.path, path)) continue;
    const length = rule.path.replace(/\$$/, "").length;
    if (!best || length > best.length || (length === best.length && rule.type === "allow")) best = { ...rule, length };
  }
  return { allowed: !best || best.type === "allow", rule: best ? { type: best.type, path: best.path, line: best.line } : null, agent: group.agents.join(", ") };
}

/**
 * What to warn about before saving: lines not understood, a site-wide block, blocked pages that
 * should be found, blocked noindex pages (their noindex can't be read), and the Sitemap line.
 * `pages`: { path, url, name, indexable } for every published address.
 */
function robotsWarnings(text, { pages = [], canonicalHost, visible }) {
  const warnings = [];
  if (Buffer.byteLength(String(text ?? "")) > MAX_BYTES) warnings.push({ kind: "tooLong" });
  const parsed = parseRobots(text);
  if (parsed.unknown.length) warnings.push({ kind: "unknownLines", lines: parsed.unknown });
  if (!testRobots(text, "/").allowed) warnings.push({ kind: "blocksHome" });
  const blocked = pages.filter((p) => !testRobots(text, p.path).allowed);
  const indexable = blocked.filter((p) => p.indexable);
  const noindex = blocked.filter((p) => !p.indexable);
  if (indexable.length) warnings.push({ kind: "blocksIndexable", count: indexable.length, pages: indexable.slice(0, 5).map((p) => p.path) });
  if (noindex.length) warnings.push({ kind: "blocksNoindex", count: noindex.length, pages: noindex.slice(0, 5).map((p) => p.path) });
  if (visible && !parsed.sitemaps.length) warnings.push({ kind: "noSitemapLine" });
  if (canonicalHost) {
    const host = new URL(canonicalHost).host;
    const other = parsed.sitemaps.filter((s) => { try { return new URL(s).host !== host; } catch { return true; } });
    if (other.length) warnings.push({ kind: "sitemapOtherHost", sitemaps: other });
  }
  return warnings;
}

module.exports = { parseRobots, testRobots, robotsWarnings, MAX_BYTES };
