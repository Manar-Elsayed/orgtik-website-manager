"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowSquareOut, CheckCircle, Eye, EyeSlash, GoogleLogo, Info, ListChecks, Warning, WarningCircle } from "@phosphor-icons/react";
import { Badge, Button, Card, ConfirmDialog, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, ErrorState, Field, Input, LoadingState, NoPermissionState, PageHeader, Select, Switch, Textarea, buttonVariants, cn, toast, useFormatter } from "@orgtik/ui";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { SitePublishCard } from "@/components/seo/SitePublishCard";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { Link } from "@/i18n/routing";
import { useListState } from "@/lib/useListState";
import { useCan } from "@/lib/permissions";
import { statusOf, useCheckRobotsMutation, useIndexingQuery, useSetCanonicalHostMutation, useSetRobotsMutation, useSetVisibilityMutation, useSiteLiveQuery, useValidateIndexingMutation, type ApiError, type Indexing, type IndexingCheck, type IndexingUrl, type RobotsCheck, type RobotsWarning } from "@/store/api";

const PAGE_SIZES = [10, 25, 50];
const NATIVE: Record<string, string> = { en: "English", ar: "العربية", de: "Deutsch", fr: "Français", it: "Italiano" };
const LEVEL_TONE: Record<IndexingCheck["level"], "success" | "info" | "warning" | "danger"> = { pass: "success", info: "info", warn: "warning", fail: "danger" };
const LEVEL_ICON = { pass: CheckCircle, info: Info, warn: Warning, fail: WarningCircle };

// A link that stays on this page for an anchor (#robots) and opens another screen otherwise.
function FixLink({ href, children }: { href: string; children: React.ReactNode }) {
  const cls = cn(buttonVariants({ variant: "secondary", size: "sm" }), "whitespace-nowrap");
  if (href.startsWith("#")) return <a href={href} className={cls}>{children}</a>;
  return <Link href={href} className={cls}>{children}</Link>;
}

/** Validate indexing settings: every check with its reason, and where to fix it. */
function ValidationCard({ data }: { data: Indexing }) {
  const t = useTranslations("Seo.indexing");
  const f = useFormatter();
  const [validate, validating] = useValidateIndexingMutation();
  const v = data.lastValidation;
  const run = () => validate().unwrap().then((r) => toast.success(t("validated", { fail: r.summary.fail, warn: r.summary.warn }))).catch(() => toast.error(t("validateFailed")));
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="flex items-center gap-2 font-display text-title-sm text-fg"><ListChecks aria-hidden="true" className="size-5 text-fg-subtle" />{t("validateTitle")}</h2>
          <p className="text-body-sm text-fg-muted">{t("validateHelp")}</p>
        </div>
        <Button variant={v ? "secondary" : "primary"} loading={validating.isLoading} onClick={run}>{t("validate")}</Button>
      </div>
      {v ? (
        <>
          <p className="flex flex-wrap items-center gap-2 text-body-sm text-fg-muted">
            {t("lastValidated", { time: f.date(v.at, { dateStyle: "medium", timeStyle: "short" }), name: v.by.name ?? v.by.key })}
            <Badge size="sm" tone="success">{t("summary.pass", { count: v.summary.pass })}</Badge>
            {v.summary.warn ? <Badge size="sm" tone="warning">{t("summary.warn", { count: v.summary.warn })}</Badge> : null}
            {v.summary.fail ? <Badge size="sm" tone="danger">{t("summary.fail", { count: v.summary.fail })}</Badge> : null}
          </p>
          <ul className="flex flex-col divide-y divide-line">
            {v.checks.map((c) => {
              const Icon = LEVEL_ICON[c.level];
              return (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-2 text-body-sm">
                  <span className="flex min-w-0 flex-1 items-start gap-2">
                    <Icon aria-hidden="true" weight="fill" className={cn("mt-0.5 size-4 shrink-0", { pass: "text-success", info: "text-info", warn: "text-warning", fail: "text-danger" }[c.level])} />
                    <span className="flex flex-col">
                      <span className="text-fg">{t(`check.${c.id}.title`)}</span>
                      <span className="text-fg-muted" dir="auto">{t(`check.${c.id}.${c.level}`, c.params)}</span>
                    </span>
                  </span>
                  {c.fix && c.level !== "pass" ? <FixLink href={c.fix}>{t("fix")}</FixLink> : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="text-body-sm text-fg-muted">{t("notValidated")}</p>
      )}
    </Card>
  );
}

/** The site-wide policy: what search engines are told, with the real impact of switching it. */
function VisibilityCard({ data }: { data: Indexing }) {
  const t = useTranslations("Seo");
  const tx = useTranslations("Seo.indexing");
  const ti = useTranslations("Improvements");
  const f = useFormatter();
  const can = useCan();
  const [confirm, setConfirm] = useState(false);
  const [setVisibility] = useSetVisibilityMutation();
  const hidden = data.settings.visibility === "noindex";
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2">
            {hidden ? <EyeSlash aria-hidden="true" className="size-5 text-fg-muted" /> : <Eye aria-hidden="true" className="size-5 text-success" />}
            <h2 className="font-display text-title-sm text-fg">{t(hidden ? "hiddenTitle" : "visibleTitle")}</h2>
          </span>
          <p className="text-body-sm text-fg-muted">{tx(hidden ? "hiddenBody" : "visibleBody", { indexable: data.impact.indexableNow, own: data.impact.becomeIndexable })}</p>
        </div>
        <label className="flex items-center gap-3 text-body-sm font-semibold"><Switch checked={!hidden} disabled={!can("site:visibility")} onCheckedChange={() => setConfirm(true)} />{ti("siteIndexing")}</label>
      </div>
      {/* Settings are what the site asks for, not what Google has done. */}
      <ul className="flex flex-col gap-1 rounded-field bg-sunken px-3 py-2 text-body-sm text-fg-muted">
        <li>{tx("overrideExplained")}</li>
        <li>{tx("notIndexedYet")}</li>
        <li>{tx("notRemovedAtOnce")}</li>
      </ul>
      {!can("site:visibility") ? <p className="text-body-sm text-fg-subtle">{t("visibilityPermission")}</p> : null}
      {can("site:visibility") ? (
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          tone={hidden ? "primary" : "danger"}
          title={t(hidden ? "makeVisibleTitle" : "hideTitle")}
          impact={hidden ? tx("makeVisibleImpact", { indexable: data.impact.becomeIndexable, noindex: data.impact.stayNoindex }) : tx("hideImpact", { count: data.impact.indexableNow })}
          reason={{ label: t("visibilityReason"), required: true }}
          acknowledgement={hidden ? t("makeVisibleAck") : undefined}
          confirmLabel={t(hidden ? "makeVisible" : "hide")}
          onConfirm={({ reason }) =>
            setVisibility({ version: data.settings.version, visibility: hidden ? "index" : "noindex", reason })
              .unwrap()
              .then(() => toast.success(tx(hidden ? "nowVisible" : "nowHidden")))
              .catch((e: ApiError) => {
                toast.error(e.status === 412 ? t("stale") : t("failed"));
                throw e;
              })
          }
        />
      ) : null}
      <ol aria-label={t("visibilityHistory")} className="flex flex-col gap-1 border-t border-line pt-3">
        {data.settings.history.slice(0, 6).map((h, i) => (
          <li key={i} className="text-body-sm text-fg-muted">
            <Badge size="sm" tone={h.canonicalHost || h.robots ? "info" : h.visibility === "index" ? "success" : "neutral"}>{h.canonicalHost ? tx("historyCanonical") : h.robots ? tx("historyRobots") : t(h.visibility === "index" ? "stateVisible" : "stateHidden")}</Badge>{" "}
            {f.date(h.at, { dateStyle: "medium", timeStyle: "short" })} · <bdi dir="auto">{h.by.name ?? t("imported")}</bdi> · <span dir="auto">{h.note}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// What Google reports: kept apart from the settings, and sample data until Search Console is connected.
const SAMPLE = { indexed: 0, notIndexed: 48, reasons: [{ key: "noindex", count: 47 }, { key: "discovered", count: 1 }], redirects: 10, lastCrawl: "2026-10-18T06:12:00Z" };
function SearchConsoleCard() {
  const t = useTranslations("Seo.indexing.google");
  const f = useFormatter();
  const [open, setOpen] = useState(false);
  return (
    <Card className="flex flex-col gap-3 border-dashed">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-title-sm text-fg"><GoogleLogo aria-hidden="true" className="size-5 text-fg-subtle" />{t("title")}</h2>
        <Badge tone="warning">{t("sample")}</Badge>
      </div>
      <p className="text-body-sm text-fg-muted">{t("help")}</p>
      <dl className="grid grid-cols-3 gap-3 text-center" aria-label={t("sample")}>
        {([["indexed", SAMPLE.indexed], ["notIndexed", SAMPLE.notIndexed], ["redirects", SAMPLE.redirects]] as const).map(([key, value]) => (
          <div key={key} className="rounded-field bg-sunken p-2">
            <dt className="text-caption text-fg-muted">{t(key)}</dt>
            <dd className="font-display text-title text-fg tabular-nums">{f.number(value)}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-col gap-1 text-body-sm text-fg-muted">
        {SAMPLE.reasons.map((r) => <li key={r.key}>{t(`reason.${r.key}`, { count: r.count })}</li>)}
        <li>{t("lastCrawl", { time: f.date(SAMPLE.lastCrawl, { dateStyle: "medium" }) })}</li>
      </ul>
      <Button variant="secondary" size="sm" className="self-start" onClick={() => setOpen(true)}>{t("connect")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t("connectTitle")}</DialogTitle>
            <DialogDescription>{t("connectHelp")}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ol className="flex list-decimal flex-col gap-2 ps-5 text-body-sm text-fg">
              {(["step1", "step2", "step3", "step4"] as const).map((s) => <li key={s}>{t(s)}</li>)}
            </ol>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t("close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/** The sitemap: the published file, and every address with its policy and why it is or isn't listed. */
function SitemapSection({ data }: { data: Indexing }) {
  const t = useTranslations("Seo");
  const tx = useTranslations("Seo.indexing");
  const tt = useTranslations("Types");
  const ti = useTranslations("Improvements");
  const f = useFormatter();
  const url = useListState();
  const live = useSiteLiveQuery();
  const size = PAGE_SIZES.includes(Number(url.get("size"))) ? Number(url.get("size")) : PAGE_SIZES[0];
  const columns = useMemo<ColumnDef<IndexingUrl, any>[]>(
    () => [
      {
        id: "page",
        header: t("colPage"),
        meta: { truncate: true },
        cell: ({ row }) => (
          <span className="flex min-w-0 flex-col">
            <Link href={`/seo/content/${row.original.id}?lang=${row.original.locale}&field=robots&returnTo=${encodeURIComponent(url.href)}`} dir="auto" className="truncate font-semibold text-fg hover:underline focus-visible:outline-2 focus-visible:outline-focus">{row.original.name}</Link>
            <span dir="ltr" className="truncate text-start font-mono text-caption text-fg-subtle">{row.original.loc.replace(/^https?:\/\/[^/]+/, "") || "/"}</span>
          </span>
        ),
      },
      { id: "type", header: t("colType"), meta: { width: "1%" }, cell: ({ row }) => <span className="whitespace-nowrap text-fg-muted">{tt(`${row.original.type}.one`)}</span> },
      { id: "lang", header: t("missing.colLanguage"), meta: { width: "1%" }, cell: ({ row }) => <span dir="ltr" className="font-mono text-caption text-fg-muted">{row.original.locale.toUpperCase()}</span> },
      { id: "own", header: tx("colOwnPolicy"), meta: { width: "1%" }, cell: ({ row }) => <Badge size="sm" tone={row.original.pagePolicy === "index" ? "success" : "neutral"}>{row.original.pagePolicy}</Badge> },
      {
        id: "effective",
        header: tx("colEffective"),
        cell: ({ row }) => (
          <span className="flex flex-col gap-0.5">
            <Badge size="sm" tone={row.original.policy === "index" ? "success" : "warning"} className="w-fit">{row.original.policy}</Badge>
            <span className="text-caption text-fg-muted">{ti(row.original.reason)}</span>
          </span>
        ),
      },
      { id: "canonical", header: ti("canonical"), cell: ({ row }) => (row.original.canonicalSelf ? <span className="text-fg-muted">{tx("canonicalSelf")}</span> : <span dir="ltr" className="break-all text-body-sm text-warning">{row.original.canonical}</span>) },
      {
        id: "sitemap",
        header: ti("sitemap"),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <span className="flex flex-col gap-0.5">
              <span className={r.inSitemap ? "text-success" : "text-fg-muted"}>{tx(r.inSitemap ? "listed" : "notListed")}</span>
              {!r.inSitemap ? <span className="text-caption text-fg-subtle">{tx(!r.sitemapSetting ? "whyExcluded" : r.policy === "noindex" ? "whyNoindex" : "whyCanonical")}</span> : null}
              {r.warnings.map((w) => <Badge key={w} size="sm" tone="warning" className="w-fit">{tx(`warning.${w}`)}</Badge>)}
            </span>
          );
        },
      },
      { id: "lastmod", header: t("colLastmod"), meta: { numeric: true, width: "1%" }, cell: ({ row }) => <span className="whitespace-nowrap text-fg-muted">{row.original.lastmod ? f.date(row.original.lastmod, { dateStyle: "medium", timeStyle: "short" }) : "–"}</span> },
    ],
    [t, tx, tt, ti, f, url.href],
  );
  const search = url.get("search").toLowerCase(), type = url.get("type"), policy = url.get("policy"), sitemap = url.get("sitemap"), warning = url.get("warning");
  const rows = useMemo(
    () => data.urls.filter((r) => (!search || `${r.name} ${r.loc}`.toLowerCase().includes(search)) && (!type || r.type === type) && (!policy || r.policy === policy) && (!sitemap || (sitemap === "listed") === r.inSitemap) && (!warning || (warning === "any" ? r.warnings.length > 0 : r.warnings.includes(warning as IndexingUrl["warnings"][number])))),
    [data.urls, search, type, policy, sitemap, warning],
  );
  const types = [...new Set(data.urls.map((r) => r.type))];
  const file = live.data?.sitemap;
  const hidden = data.settings.visibility === "noindex";
  return (
    <section id="sitemap" aria-labelledby="sitemap-title" className="flex scroll-mt-6 flex-col gap-3">
      <h2 id="sitemap-title" className="font-display text-title-sm text-fg">{tx("sitemapTitle")}</h2>
      {/* The published file itself, read from the live site. */}
      <Card id="sitemap-file" className="flex scroll-mt-6 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-fg">{tx("fileTitle")}</h3>
          {file ? (
            <span className="flex flex-wrap gap-2">
              <a href={file.url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "gap-1")}>{tx("openFile")}<ArrowSquareOut aria-hidden="true" className="size-3.5" /></a>
              <a href="#live" className={buttonVariants({ variant: "ghost", size: "sm" })}>{tx("regenerate")}</a>
            </span>
          ) : null}
        </div>
        {live.isLoading ? <p className="text-body-sm text-fg-muted">{tx("fileChecking")}</p> : !file ? <p className="text-body-sm text-fg-muted">{tx("fileUnavailable")}</p> : (
          <dl className="grid gap-x-6 gap-y-1 text-body-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-fg-muted">{tx("fileUrl")}</dt><dd dir="ltr" className="break-all font-mono">{file.url}</dd>
            <dt className="text-fg-muted">{tx("fileCount")}</dt><dd>{tx("fileCountValue", { live: file.count, expected: data.sitemap.length })}</dd>
            <dt className="text-fg-muted">{tx("fileUpdated")}</dt><dd>{live.data?.build?.builtAt ? f.date(live.data.build.builtAt, { dateStyle: "medium", timeStyle: "short" }) : tx("unknown")}</dd>
            <dt className="text-fg-muted">{tx("fileStatus")}</dt>
            <dd>{file.problems.length ? <span className="text-warning">{file.problems.map((p) => tx(`fileProblem.${p}`)).join(" · ")}</span> : <span className="text-success">{tx("fileValid")}</span>}</dd>
          </dl>
        )}
        <p className="text-caption text-fg-subtle">{tx(hidden ? "sitemapRulesHidden" : "sitemapRules")}</p>
      </Card>
      <div className="wm-table-filters">
        <Input size="sm" aria-label={tx("searchLabel")} placeholder={tx("searchLabel")} value={url.get("search")} onChange={(e) => url.set({ search: e.target.value })} className="wm-search" />
        <Select size="sm" label={ti("type")} value={url.get("type", "all")} onValueChange={(type) => url.set({ type })} options={[{ value: "all", label: ti("all") }, ...types.map((value) => ({ value, label: tt(`${value}.many`) }))]} />
        <Select size="sm" label={tx("colEffective")} value={url.get("policy", "all")} onValueChange={(policy) => url.set({ policy })} options={[{ value: "all", label: ti("all") }, { value: "index", label: "index" }, { value: "noindex", label: "noindex" }]} />
        <Select size="sm" label={ti("sitemap")} value={url.get("sitemap", "all")} onValueChange={(sitemap) => url.set({ sitemap })} options={[{ value: "all", label: ti("all") }, { value: "listed", label: tx("listed") }, { value: "not", label: tx("notListed") }]} />
        <Select size="sm" label={tx("warningsFilter")} value={url.get("warning", "all")} onValueChange={(warning) => url.set({ warning })} options={[{ value: "all", label: ti("all") }, { value: "any", label: tx("anyWarning") }, { value: "noindexInSitemap", label: tx("warning.noindexInSitemap") }, { value: "canonicalElsewhere", label: tx("warning.canonicalElsewhere") }]} />
      </div>
      <DataTable
        className="[&_tbody_td]:py-2"
        label={tx("sitemapTitle")}
        columns={columns.map((column) => ({ ...column, enableSorting: false }))}
        data={rows}
        getRowId={(r) => `${r.id}-${r.locale}`}
        pagination={{ pageIndex: url.page - 1, pageSize: size }}
        pageSizes={PAGE_SIZES}
        onPaginationChange={(update) => {
          const next = typeof update === "function" ? update({ pageIndex: url.page - 1, pageSize: size }) : update;
          url.set(next.pageSize !== size ? { size: next.pageSize === PAGE_SIZES[0] ? "" : next.pageSize, page: 1 } : { page: next.pageIndex + 1 });
        }}
        status="ready"
        paginate
        empty={{ title: tx("noAddresses") }}
      />
      <p className="text-caption text-fg-subtle">{tx("languagesNote", { languages: data.publicLocales.map((l) => NATIVE[l] ?? l).join(", ") })}</p>
    </section>
  );
}

const WARNING_LEVEL: Record<RobotsWarning["kind"], "danger" | "warning"> = { tooLong: "danger", blocksHome: "danger", blocksIndexable: "danger", unknownLines: "warning", blocksNoindex: "warning", noSitemapLine: "warning", sitemapOtherHost: "warning" };
/** robots.txt: edited here with its warnings as you type, a tester, and the difference from noindex. */
function RobotsSection({ data }: { data: Indexing }) {
  const t = useTranslations("Seo");
  const tx = useTranslations("Seo.indexing");
  const can = useCan();
  const editable = can("site:visibility");
  const [text, setText] = useState(data.robots);
  const [path, setPath] = useState("/services");
  const [agent, setAgent] = useState("googlebot");
  const [check, setCheck] = useState<RobotsCheck | null>(null);
  const [confirm, setConfirm] = useState<"save" | "reset" | null>(null);
  const [runCheck] = useCheckRobotsMutation();
  const [setRobots] = useSetRobotsMutation();
  useEffect(() => setText(data.robots), [data.robots]);
  // Warnings and the tester follow the text as typed (before saving), after a short pause.
  useEffect(() => {
    const id = setTimeout(() => runCheck({ text, path, agent }).unwrap().then(setCheck).catch(() => setCheck(null)), 350);
    return () => clearTimeout(id);
  }, [text, path, agent, runCheck]);
  const changed = text !== data.robots;
  const warnings = check?.warnings ?? data.robotsWarnings;
  const save = (robots: string | null) => ({ reason }: { reason: string }) =>
    setRobots({ version: data.settings.version, robots, reason })
      .unwrap()
      .then(() => toast.success(tx(robots === null ? "robotsReset" : "robotsSaved")))
      .catch((e: ApiError) => {
        toast.error(e.status === 412 ? t("stale") : e.fieldErrors?.robots === "too_long" ? tx("robotsTooLong") : t("failed"));
        throw e;
      });
  return (
    <section id="robots" aria-labelledby="robots-title" className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="robots-title" dir="ltr" className="text-start font-display text-title-sm text-fg">robots.txt</h2>
        <Badge size="sm" tone={data.settings.robotsCustom ? "info" : "neutral"}>{tx(data.settings.robotsCustom ? "robotsCustom" : "robotsGenerated")}</Badge>
      </div>
      <p className="text-body-sm text-fg-muted">{tx("robotsVsNoindex")}</p>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <Card className="flex flex-col gap-3">
          <Field label={tx("robotsEditor")} description={editable ? tx("robotsEditorHelp") : tx("robotsReadOnly")}>
            <Textarea dir="ltr" rows={10} className="font-mono text-body-sm" readOnly={!editable} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
          </Field>
          {warnings.length ? (
            <ul className="flex flex-col gap-1">
              {warnings.map((w, i) => (
                <li key={i} className={cn("flex items-start gap-2 rounded-field px-3 py-2 text-body-sm", WARNING_LEVEL[w.kind] === "danger" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning")}>
                  <Warning aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span dir="auto">{tx(`robotsWarning.${w.kind}`, { count: w.count ?? 0, pages: (w.pages ?? []).join(", "), lines: (w.lines ?? []).join(", "), sitemaps: (w.sitemaps ?? []).join(", ") })}</span>
                </li>
              ))}
            </ul>
          ) : <p className="flex items-center gap-2 text-body-sm text-success"><CheckCircle aria-hidden="true" weight="fill" className="size-4" />{tx("robotsNoWarnings")}</p>}
          {editable ? (
            <div className="flex flex-wrap gap-2">
              <Button disabled={!changed} onClick={() => setConfirm("save")}>{tx("robotsSave")}</Button>
              {changed ? <Button variant="secondary" onClick={() => setText(data.robots)}>{t("cancel")}</Button> : null}
              {data.settings.robotsCustom ? <Button variant="ghost" onClick={() => setConfirm("reset")}>{tx("robotsResetAction")}</Button> : null}
            </div>
          ) : null}
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h3 className="font-semibold text-fg">{tx("testerTitle")}</h3>
            <Field label={tx("testerPath")}><Input dir="ltr" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/services" /></Field>
            <Field label={tx("testerAgent")}>
              <Select value={agent} onValueChange={(v) => v && setAgent(v)} options={[{ value: "googlebot", label: "Googlebot" }, { value: "bingbot", label: "Bingbot" }, { value: "googlebot-image", label: "Googlebot-Image" }, { value: "*", label: tx("anyCrawler") }]} />
            </Field>
            {check?.test ? (
              <p role="status" className={cn("text-body-sm font-semibold", check.test.allowed ? "text-success" : "text-danger")}>
                {tx(check.test.allowed ? "testerAllowed" : "testerBlocked")}
                <span className="block font-normal text-fg-muted" dir="ltr">{check.test.rule ? tx("testerRule", { line: check.test.rule.line, rule: `${check.test.rule.type === "allow" ? "Allow" : "Disallow"}: ${check.test.rule.path}` }) : tx("testerNoRule")}</span>
              </p>
            ) : null}
            <p className="text-caption text-fg-subtle">{tx("testerNote")}</p>
          </Card>
          <Card className="flex flex-col gap-2 text-body-sm text-fg-muted">
            <h3 className="font-semibold text-fg">{tx("guideTitle")}</h3>
            <p dir="ltr" className="font-mono text-caption text-fg">User-agent: * · Allow: /path · Disallow: /path · Sitemap: https://…</p>
            <p>{tx("guideAllow")}</p>
            <p>{tx("guideDisallow")}</p>
            <p>{tx("guideWildcards")}</p>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        tone={confirm === "save" && warnings.some((w) => WARNING_LEVEL[w.kind] === "danger") ? "danger" : "primary"}
        title={tx(confirm === "reset" ? "robotsResetTitle" : "robotsSaveTitle")}
        impact={confirm === "reset" ? tx("robotsResetImpact") : warnings.length ? tx("robotsSaveImpactWarnings", { count: warnings.length }) : tx("robotsSaveImpact")}
        reason={{ label: t("visibilityReason"), required: true }}
        confirmLabel={tx(confirm === "reset" ? "robotsResetAction" : "robotsSave")}
        onConfirm={confirm === "reset" ? save(null) : save(text)}
      />
    </section>
  );
}

/** The address every canonical, hreflang and sitemap URL is built on. */
function CanonicalHostCard({ data }: { data: Indexing }) {
  const t = useTranslations("Seo");
  const tx = useTranslations("Seo.indexing");
  const can = useCan();
  const [value, setValue] = useState(data.settings.canonicalHost);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setHost] = useSetCanonicalHostMutation();
  useEffect(() => setValue(data.settings.canonicalHost), [data.settings.canonicalHost]);
  const editable = can("site:visibility");
  return (
    <Card id="canonical-host" className="flex scroll-mt-6 flex-col gap-3">
      <h2 className="font-display text-title-sm text-fg">{tx("hostTitle")}</h2>
      <p className="text-body-sm text-fg-muted">{tx("hostHelp")}</p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label={tx("hostLabel")} error={error ?? undefined} className="min-w-64 flex-1">
          <Input dir="ltr" readOnly={!editable} value={value} onChange={(e) => { setError(null); setValue(e.target.value); }} placeholder="https://orgtik.ch" />
        </Field>
        {editable ? <Button disabled={value.trim().replace(/\/$/, "") === data.settings.canonicalHost} onClick={() => setConfirm(true)}>{tx("hostSave")}</Button> : null}
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="warning"
        title={tx("hostConfirmTitle")}
        impact={tx("hostConfirmImpact", { host: value.trim() })}
        reason={{ label: t("visibilityReason"), required: true }}
        confirmLabel={tx("hostSave")}
        onConfirm={({ reason }) =>
          setHost({ version: data.settings.version, canonicalHost: value.trim(), reason })
            .unwrap()
            .then(() => toast.success(tx("hostSaved")))
            .catch((e: ApiError) => {
              if (e.fieldErrors?.canonicalHost) setError(tx("hostInvalid"));
              toast.error(e.status === 412 ? t("stale") : e.fieldErrors?.canonicalHost ? tx("hostInvalid") : t("failed"));
              throw e;
            })
        }
      />
    </Card>
  );
}

function IndexingView() {
  const t = useTranslations("Seo");
  const { data, isLoading, error, refetch } = useIndexingQuery();
  const s = statusOf(error);
  if (isLoading) return <LoadingState rows={5} />;
  if (s === 403) return <NoPermissionState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("indexingTitle")} description={t("indexingDescription")} />
      <ValidationCard data={data} />
      <div id="live" className="scroll-mt-6"><SitePublishCard focus="indexing" /></div>
      {/* What the site asks search engines (left) and what Google reports (right) stay apart. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
        <VisibilityCard data={data} />
        <SearchConsoleCard />
      </div>
      <SitemapSection data={data} />
      <RobotsSection data={data} />
      <CanonicalHostCard data={data} />
    </div>
  );
}

export default function IndexingPage() {
  return (
    <RequirePermission permission="seo:view">
      <IndexingView />
    </RequirePermission>
  );
}
