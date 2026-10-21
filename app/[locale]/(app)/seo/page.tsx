"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowClockwise, Eye } from "@phosphor-icons/react";
import { Badge, Button, DialogBody, DialogDescription, DialogHeader, DialogTitle, Input, Select, PageHeader, Sheet, SheetContent, buttonVariants, cn, toast, useFormatter } from "@orgtik/ui";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { SeoCountCard, revealList } from "@/components/seo/SeoCountCard";
import { SearchResultPreview, SocialPreview } from "@/components/seo/SeoPreviews";
import { Link } from "@/i18n/routing";
import { useListState } from "@/lib/useListState";
import { TYPES } from "@/lib/contentTypes";
import { useEntryName } from "@/lib/entryName";
import { DUPLICATE_OF, MAIN_CHECKS, fieldOf, isGuidance } from "@/lib/seoChecks";
import { statusOf, useRunSeoCheckMutation, useSeoHealthQuery, type Locale, type SeoCheck, type SeoRow } from "@/store/api";

type Filter = "all" | "none" | "any" | "other" | SeoCheck;
// Every language the site can publish in, whether or not it is public yet.
const LOCALES: Locale[] = ["en", "ar", "de", "fr", "it"];
const NATIVE: Record<Locale, string> = { en: "English", ar: "العربية", de: "Deutsch", fr: "Français", it: "Italiano" };
// Every check, in the order the issue filter lists them.
const CHECKS: SeoCheck[] = ["titleMissing", "titleShort", "titleLong", "titleDuplicate", "descriptionMissing", "descriptionShort", "descriptionLong", "descriptionDuplicate", "addressDuplicate", "focusDuplicate", "noSocialImage", "socialImageDefault", "imageNoAlt", "canonicalHost", "canonicalUnreachable", "canonicalOther", "canonicalSitemap", "schemaInvalid"];
const PAGE_SIZES = [10, 25, 50];
// What needs fixing sits next to the page name, so it stays in view when the table scrolls.
const COLUMN_ORDER = ["page", "issues", "type", "lang", "title", "description", "preview"];
const LIST = "seo-health-list";

// What a search result and a shared link need, page by page and language by language: a
// checklist, not a score. Every count opens its pages; every issue opens the field that fixes it.
function Health() {
  const t = useTranslations("Seo");
  const th = useTranslations("Seo.health");
  const tm = useTranslations("Seo.missing");
  const tt = useTranslations("Types");
  const f = useFormatter();
  const entryName = useEntryName();
  const ti = useTranslations("Improvements");
  const url = useListState();
  const check = url.get("issue", "all") as Filter;
  const level = url.get("level", "all");
  const size = PAGE_SIZES.includes(Number(url.get("size"))) ? Number(url.get("size")) : PAGE_SIZES[0];
  // A card filters the list to its pages; choosing the active card again shows every page.
  const choose = (issue: Filter) => {
    url.set({ issue: check === issue ? "all" : issue });
    revealList(LIST);
  };
  const { data, isLoading, error, refetch, isFetching } = useSeoHealthQuery({ issue: check === "all" ? undefined : check, level: level === "all" ? undefined : level, search: url.get("search"), kind: url.get("kind"), lang: url.get("lang"), page: url.page, pageSize: size });
  const [runCheck, running] = useRunSeoCheckMutation();
  const [previewing, setPreviewing] = useState<SeoRow | null>(null);
  const run = async () => {
    try {
      const result = await runCheck().unwrap();
      toast.success(th("ran", { checked: result.checked, errors: result.errors, guidance: result.guidance }));
    } catch {
      toast.error(th("runFailed"));
    }
  };

  const columns = useMemo<ColumnDef<SeoRow, any>[]>(() => {
    const all = buildColumns();
    return COLUMN_ORDER.map((id) => all.find((column) => column.id === id)!);
    function buildColumns(): ColumnDef<SeoRow, any>[] {
    const returnTo = encodeURIComponent(url.href);
    const fixHref = (r: SeoRow, issue?: SeoCheck) => {
      if (issue === "imageNoAlt") return `/content/${TYPES[r.type].area}/${r.id}?lang=${r.locale}&returnTo=${returnTo}`;
      const field = issue ? fieldOf(issue) : null;
      return `/seo/content/${r.id}?lang=${r.locale}${field ? `&field=${field}` : ""}&returnTo=${returnTo}`;
    };
    // Why an issue was raised, where there is more to say than its name.
    const detail = (r: SeoRow, issue: SeoCheck) => {
      const found = r.details?.[issue];
      if (!found?.length) return null;
      if (issue === "schemaInvalid") return found.join("; ");
      return th(`detail.${issue}`, { value: found[0] });
    };
    return [
      {
        id: "page",
        header: t("colPage"),
        meta: { truncate: true },
        cell: ({ row }) => {
          const r = row.original;
          return (
            <span className="flex min-w-0 flex-col">
              <Link href={fixHref(r)} dir="auto" className="truncate font-semibold text-fg hover:underline focus-visible:outline-2 focus-visible:outline-focus">
                {entryName(r)}
              </Link>
              <span dir="ltr" className="truncate text-start font-mono text-caption text-fg-subtle">{r.path}</span>
            </span>
          );
        },
      },
      { id: "type", header: t("colType"), meta: { width: "1%" }, cell: ({ row }) => <span className="whitespace-nowrap text-fg-muted">{tt(`${row.original.type}.one`)}</span> },
      // Each page is checked once per language.
      { id: "lang", header: tm("colLanguage"), meta: { width: "1%" }, cell: ({ row }) => <span dir="ltr" title={NATIVE[row.original.locale]} className="font-mono text-caption text-fg-muted">{row.original.locale.toUpperCase()}</span> },
      { id: "title", header: t("colTitle"), meta: { numeric: true, width: "1%" }, cell: ({ row }) => <span title={row.original.renderedTitle} className="tabular-nums text-fg-muted">{f.number(row.original.titleLength)}</span> },
      { id: "description", header: t("colDescription"), meta: { numeric: true, width: "1%" }, cell: ({ row }) => <span className="tabular-nums text-fg-muted">{f.number(row.original.descriptionLength)}</span> },
      {
        id: "issues",
        header: tm("colIssues"),
        // Every issue, each opening the field that fixes it; a duplicate names the page it clashes with.
        cell: ({ row }) => {
          const r = row.original;
          if (!r.issues.length) return <Badge size="sm" tone="success" className="whitespace-nowrap">{t("ok")}</Badge>;
          return (
            <span className="flex min-w-60 flex-col gap-1.5">
              <span className="flex flex-wrap gap-1">
                {r.issues.map((issue) => (
                  <Link key={issue} href={fixHref(r, issue)} aria-label={tm("fixIn", { issue: t(`checks.${issue}`), page: entryName(r) })} title={detail(r, issue) ?? undefined} className="rounded-pill focus-visible:outline-2 focus-visible:outline-focus">
                    <Badge size="sm" tone={isGuidance(issue) ? "neutral" : "warning"} className="whitespace-nowrap hover:underline">{t(`checks.${issue}`)}</Badge>
                  </Link>
                ))}
              </span>
              {r.issues.map((issue) => {
                const kind = DUPLICATE_OF[issue], others = kind ? r.duplicates?.[kind] : undefined;
                if (others?.length)
                  return (
                    // Three pages by name, then how many more, so a widely shared text stays one short line.
                    <span key={`${issue}-hint`} className="max-w-md whitespace-normal break-words text-caption text-warning">
                      {th(`duplicateWith.${kind}`)}{" "}
                      {others.slice(0, 3).map((o, i) => (
                        <span key={o.id}>
                          {i ? ", " : null}
                          <Link href={`/seo/content/${o.id}?lang=${r.locale}&field=${fieldOf(issue) ?? "title"}&returnTo=${returnTo}`} dir="auto" className="underline hover:no-underline focus-visible:outline-2 focus-visible:outline-focus">{entryName(o)}</Link>
                        </span>
                      ))}
                      {others.length > 3 ? ` ${th("andMore", { count: others.length - 3 })}` : null}
                    </span>
                  );
                const why = issue.startsWith("canonical") || issue === "schemaInvalid" ? detail(r, issue) : null;
                return why ? <span key={`${issue}-why`} dir="auto" className="text-caption text-fg-muted">{why}</span> : null;
              })}
            </span>
          );
        },
      },
      {
        id: "preview",
        meta: { width: "1%" },
        header: () => <span className="sr-only">{th("preview")}</span>,
        cell: ({ row }) => (
          <Button size="sm" variant="ghost" startIcon={<Eye />} onClick={() => setPreviewing(row.original)} aria-label={th("previewOf", { page: entryName(row.original) })}>
            {th("preview")}
          </Button>
        ),
      },
    ];
    }
  }, [t, th, tm, tt, f, entryName, url.href]);

  // Only switched-on languages are checked; say so rather than claim another one is fine.
  const lang = url.get("lang");
  const unpublished = Boolean(lang && data && !data.locales.includes(lang as Locale));
  const status = isLoading ? "loading" : error ? (statusOf(error) === 403 ? "forbidden" : "error") : "ready";
  const filtered = check !== "all" || level !== "all" || url.get("search") || url.get("kind") || url.get("lang");
  const lastRun = data?.lastRun;
  const card = (issue: Filter, label: string, count: number) => <SeoCountCard key={issue} label={label} count={count} active={check === issue} hint={t("showPages")} onSelect={() => choose(issue)} />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("healthTitle")}
        description={t("healthDescription")}
        actions={
          <Button variant={lastRun?.changedSince || !lastRun ? "primary" : "secondary"} startIcon={<ArrowClockwise />} loading={running.isLoading} onClick={run}>
            {t("block.runCheck")}
          </Button>
        }
      />
      {/* When the checks last ran and whether content changed since; the list below is always current. */}
      <p role="status" className={cn("-mt-3 text-body-sm", lastRun?.changedSince ? "text-warning" : "text-fg-muted")}>
        {lastRun
          ? `${th("lastRun", { time: f.date(lastRun.at, { dateStyle: "medium", timeStyle: "short" }), errors: lastRun.errors, guidance: lastRun.guidance, checked: lastRun.checked })}${lastRun.changedSince ? ` ${th("changedSince")}` : ""}`
          : th("notRunYet")}
      </p>
      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SeoCountCard label={t("checked")} count={data.checked} active={check === "all"} hint={t("showAllPages")} onSelect={() => { url.set({ issue: "all" }); revealList(LIST); }} />
          {card("none", t("healthy"), data.healthy)}
          {MAIN_CHECKS.map((issue) => card(issue, th(`cards.${issue}`), data.counts[issue] ?? 0))}
          {card("other", th("cards.other"), data.other ?? 0)}
        </div>
      ) : null}
      <p className="-mt-2 text-caption text-fg-subtle">{th("legend")}</p>
      <div id={LIST} className="flex scroll-mt-6 flex-col gap-4">
        <div className="wm-table-filters">
          <Input size="sm" aria-label={th("searchLabel")} placeholder={th("searchLabel")} value={url.get("search")} onChange={(e) => url.set({ search: e.target.value })} className="wm-search" />
          <Select size="sm" label={ti("type")} value={url.get("kind", "all")} onValueChange={(kind) => url.set({ kind })} options={[{ value: "all", label: ti("all") }, ...Object.values(TYPES).filter((type) => type.seo).map((type) => ({ value: type.key, label: tt(`${type.key}.many`) }))]} />
          <Select size="sm" label={tm("colLanguage")} value={url.get("lang", "all")} onValueChange={(lang) => url.set({ lang })} options={[{ value: "all", label: ti("all") }, ...LOCALES.map((value) => ({ value, label: NATIVE[value] }))]} />
          <Select size="sm" label={th("issueFilter")} value={check} onValueChange={(issue) => url.set({ issue })} options={[{ value: "all", label: ti("all") }, { value: "any", label: t("issuesFound") }, { value: "other", label: th("cards.other") }, ...CHECKS.map((value) => ({ value, label: t(`checks.${value}`) }))]} />
          <Select size="sm" label={th("levelFilter")} value={level} onValueChange={(value) => url.set({ level: value })} options={[{ value: "all", label: ti("all") }, ...(["error", "guidance", "ok"] as const).map((value) => ({ value, label: th(`level.${value}`) }))]} />
        </div>
        <DataTable
          label={t("healthTitle")}
          columns={columns.map((column) => ({ ...column, enableSorting: false }))}
          mode="server"
          rowCount={data?.total ?? 0}
          pagination={{ pageIndex: url.page - 1, pageSize: size }}
          pageSizes={PAGE_SIZES}
          onPaginationChange={(update) => {
            const next = typeof update === "function" ? update({ pageIndex: url.page - 1, pageSize: size }) : update;
            url.set(next.pageSize !== size ? { size: next.pageSize === PAGE_SIZES[0] ? "" : next.pageSize, page: 1 } : { page: next.pageIndex + 1 });
          }}
          data={data?.items ?? []}
          getRowId={(r) => `${r.id}-${r.locale}`}
          status={status}
          paginate
          onRetry={refetch}
          className={isFetching && !isLoading ? "opacity-70" : undefined}
          empty={unpublished ? { title: t("languageNotPublic", { language: NATIVE[lang as Locale] ?? lang }), description: t("languageNotPublicHelp"), action: <Link href="/settings/site" className={buttonVariants({ variant: "secondary", size: "sm" })}>{t("openSiteSettings")}</Link> } : { title: t("allGood"), description: filtered ? th("emptyFiltered") : th("emptyHelp"), action: filtered ? <Button size="sm" variant="secondary" onClick={() => url.set({ issue: "all", level: "all", search: "", kind: "all", lang: "all" })}>{t("showAllPages")}</Button> : undefined }}
        />
      </div>
      <Sheet open={Boolean(previewing)} onOpenChange={(open) => { if (!open) setPreviewing(null); }}>
        <SheetContent>
          {previewing?.preview ? (
            <>
              <DialogHeader>
                <DialogTitle><span dir="auto">{entryName(previewing)}</span> · <span dir="ltr">{previewing.locale.toUpperCase()}</span></DialogTitle>
                <DialogDescription>{th("previewNote")}</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="flex flex-col gap-5">
                  <section className="flex flex-col gap-2">
                    <h3 className="text-body-sm font-semibold text-fg">{t("block.searchPreview")}</h3>
                    <SearchResultPreview url={previewing.preview.url} title={previewing.preview.title} description={previewing.preview.description} lang={previewing.locale} />
                  </section>
                  <section className="flex flex-col gap-2">
                    <h3 className="text-body-sm font-semibold text-fg">{t("block.socialPreview")}</h3>
                    <SocialPreview url={previewing.preview.url} title={previewing.preview.ogTitle} description={previewing.preview.ogDescription} image={previewing.preview.ogImage} lang={previewing.locale} />
                  </section>
                  <Link href={`/seo/content/${previewing.id}?lang=${previewing.locale}&field=title&returnTo=${encodeURIComponent(url.href)}`} className={cn(buttonVariants({ variant: "primary" }), "self-start")}>
                    {th("editSeo")}
                  </Link>
                </div>
              </DialogBody>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function SeoHealthPage() {
  return (
    <RequirePermission permission="seo:view">
      <Health />
    </RequirePermission>
  );
}
