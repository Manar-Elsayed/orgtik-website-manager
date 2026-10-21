"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "@phosphor-icons/react";
import { Badge, Button, FilterChips, Input, Select, PageHeader, StatusBadge, buttonVariants, cn, useFormatter } from "@orgtik/ui";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { Link } from "@/i18n/routing";
import { useListState } from "@/lib/useListState";
import { TYPES } from "@/lib/contentTypes";
import { useEntryName } from "@/lib/entryName";
import { statusOf, useSeoMissingQuery, type Locale, type SeoDuplicateKind, type SeoIssue, type SeoMissingRow } from "@/store/api";

// In the SEO editor's order, then the image (fixed in the content editor).
const SEARCH_ISSUES: SeoIssue[] = ["titleMissing", "titleLong", "titleDuplicate", "descriptionMissing", "descriptionShort", "descriptionLong", "descriptionDuplicate", "addressDuplicate"];
const ALL_ISSUES: SeoIssue[] = [...SEARCH_ISSUES, "focusMissing", "focusDuplicate", "keywordsMissing", "noSocialImage", "imageNoAlt"];
// Issues shown in the warning tone: the search result ones and every duplicate.
const WARNING_ISSUES: SeoIssue[] = [...SEARCH_ISSUES, "focusDuplicate"];
// A duplicate issue opens a note naming the other pages and what they share.
const DUPLICATE_OF: Partial<Record<SeoIssue, SeoDuplicateKind>> = { titleDuplicate: "title", descriptionDuplicate: "description", addressDuplicate: "address", focusDuplicate: "focus" };
// Pages named in a note before the rest are counted.
const NOTE_PAGES = 5;
const LOCALES: Locale[] = ["en", "ar", "de", "fr", "it"];
const NATIVE: Record<Locale, string> = { en: "English", ar: "العربية", de: "Deutsch", fr: "Français", it: "Italiano" };
// Issues shown per row before the rest fold behind "+N".
const VISIBLE_ISSUES = 3;
const COLUMN_ORDER = ["page", "issues", "status", "type", "lang", "updated", "fix"];

// Every page with something to fix for search results, shared links or screen readers, one row
// per page. Each issue opens the editor that fixes it.
function Missing() {
  const t = useTranslations("Seo");
  const tm = useTranslations("Seo.missing");
  const tt = useTranslations("Types");
  const ti = useTranslations("Improvements");
  const f = useFormatter();
  const entryName = useEntryName();
  const url = useListState();
  const { data, isLoading, error, refetch, isFetching } = useSeoMissingQuery({ entry: url.get("entry"), issues: url.get("issues"), search: url.get("search"), kind: url.get("kind"), lang: url.get("lang"), page: url.page, pageSize: 10 });

  // Only switched-on languages are checked; say so rather than claim another one is fine.
  const lang = url.get("lang");
  const locales = data?.locales ?? LOCALES;
  const unpublished = Boolean(lang && data && !data.locales.includes(lang as Locale));
  const picked = url.get("issues").split(",").filter(Boolean) as SeoIssue[];
  const pickedKey = picked.join(",");
  // Rows whose folded issues have been opened with "+N".
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setExpanded((open) => { const next = new Set(open); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  // The duplicate issue whose note is open, per row.
  const [notes, setNotes] = useState<Record<string, SeoIssue | undefined>>({});
  const toggleNote = (id: string, issue: SeoIssue) => setNotes((open) => ({ ...open, [id]: open[id] === issue ? undefined : issue }));
  const columns = useMemo<ColumnDef<SeoMissingRow, unknown>[]>(() => {
    const returnTo = encodeURIComponent(url.href);
    // Image descriptions are edited with the image, in the content editor; everything else in the SEO editor.
    // Every issue, or only the picked ones.
    const chosen = pickedKey ? pickedKey.split(",") : [];
    const inView = (i: SeoIssue) => !chosen.length || chosen.includes(i);
    // The issues in view, and only the chosen language's when the list is filtered by one.
    const shown = (r: SeoMissingRow) => (lang && r.byLanguage?.[lang as Locale] ? r.byLanguage[lang as Locale]! : r.issues).filter(inView);
    // The languages with an issue in view; the editor opens in the filtered one, else the first.
    const langsFor = (r: SeoMissingRow) => (chosen.length ? r.languages.filter((l) => r.byLanguage?.[l]?.some(inView)) : r.languages);
    const openIn = (r: SeoMissingRow, issue?: SeoIssue) => {
      const langs = issue ? langsFor(r).filter((l) => r.byLanguage?.[l]?.includes(issue)) : langsFor(r);
      return langs.includes(lang as Locale) ? lang : langs[0] ?? r.locale;
    };
    const fixHref = (r: SeoMissingRow, issue?: SeoIssue) => (issue === "imageNoAlt" ? `/content/${TYPES[r.type].area}/${r.id}?lang=${openIn(r, issue)}&returnTo=${returnTo}` : `/seo/content/${r.id}?lang=${openIn(r, issue)}&returnTo=${returnTo}`);
    const columns: ColumnDef<SeoMissingRow, unknown>[] = [
      {
        id: "page",
        header: t("colPage"),
        meta: { truncate: true },
        cell: ({ row }) => (
          <span className="flex min-w-0 flex-col">
            <Link href={fixHref(row.original, shown(row.original)[0])} dir="auto" className="truncate font-semibold text-fg hover:underline focus-visible:outline-2 focus-visible:outline-focus">
              {entryName(row.original)}
            </Link>
            <span dir="ltr" className="truncate text-start font-mono text-caption text-fg-subtle">{row.original.path}</span>
          </span>
        ),
      },
      {
        id: "issues",
        header: tm("colIssues"),
        cell: ({ row }) => {
          const all = shown(row.original), open = expanded.has(row.original.id);
          const visible = open ? all : all.slice(0, VISIBLE_ISSUES), more = all.length - VISIBLE_ISSUES;
          return (
          <span className="flex min-w-56 flex-wrap items-center gap-1">
            {visible.map((issue) => DUPLICATE_OF[issue] ? (
              <button key={issue} type="button" onClick={() => toggleNote(row.original.id, issue)} aria-expanded={notes[row.original.id] === issue} aria-controls={`dup-${row.original.id}`} className="rounded-pill focus-visible:outline-2 focus-visible:outline-focus">
                <Badge size="sm" tone="warning" className={cn("hover:underline", notes[row.original.id] === issue && "underline")}>{t(`checks.${issue}`)}</Badge>
              </button>
            ) : (
              <Link key={issue} href={fixHref(row.original, issue)} aria-label={tm("fixIn", { issue: t(`checks.${issue}`), page: entryName(row.original) })} className="rounded-pill focus-visible:outline-2 focus-visible:outline-focus">
                <Badge size="sm" tone={WARNING_ISSUES.includes(issue) ? "warning" : "neutral"} className="hover:underline">{t(`checks.${issue}`)}</Badge>
              </Link>
            ))}
            {more > 0 ? (
              <button type="button" onClick={() => toggle(row.original.id)} aria-expanded={open} aria-label={open ? tm("fewerIssues") : tm("moreIssuesLabel", { count: more, page: entryName(row.original) })} className="rounded-pill focus-visible:outline-2 focus-visible:outline-focus">
                <Badge size="sm" tone="neutral" className="hover:underline">{open ? tm("fewerIssues") : tm("moreIssues", { count: more })}</Badge>
              </button>
            ) : null}
            {(() => {
              // What the open duplicate clashes with, in each language that has it.
              const issue = notes[row.original.id], kind = issue ? DUPLICATE_OF[issue] : undefined;
              if (!issue || !kind || !all.includes(issue)) return null;
              const langs = langsFor(row.original).filter((l) => row.original.byLanguage?.[l]?.includes(issue));
              return (
                <span id={`dup-${row.original.id}`} className="flex w-full max-w-md flex-col gap-2 whitespace-normal break-words rounded-field bg-info-subtle px-3 py-2 text-body-sm text-info">
                  {langs.map((l) => {
                    const others = row.original.duplicates?.[l]?.[kind] ?? [], text = row.original.duplicateText?.[l]?.[kind];
                    return (
                      <span key={l} className="flex flex-col gap-1">
                        <span>
                          {langs.length > 1 ? <span dir="ltr" className="me-2 font-mono text-caption">{l.toUpperCase()}</span> : null}
                          {tm(`duplicateNote.${kind}`)}
                        </span>
                        {text ? <span dir={kind === "address" ? "ltr" : "auto"} lang={l} className={cn("line-clamp-2 font-semibold", kind === "address" && "font-mono text-start")}>{kind === "address" ? text : `“${text}”`}</span> : null}
                        <span className="flex flex-col">
                          {others.slice(0, NOTE_PAGES).map((o) => (
                            <Link key={o.id} href={`/seo/content/${o.id}?lang=${l}&returnTo=${encodeURIComponent(url.href)}`} className="w-fit underline hover:no-underline focus-visible:outline-2 focus-visible:outline-focus">
                              {entryName(o)} <span dir="ltr" className="font-mono text-caption">{o.path}</span>
                            </Link>
                          ))}
                          {others.length > NOTE_PAGES ? <span>{tm("duplicateMore", { count: others.length - NOTE_PAGES })}</span> : null}
                        </span>
                      </span>
                    );
                  })}
                </span>
              );
            })()}
          </span>
          );
        },
      },
      { id: "status", header: tm("colStatus"), meta: { width: "1%" }, cell: ({ row }) => <StatusBadge size="sm" entity="cms_revision" state={row.original.state} /> },
      { id: "type", header: t("colType"), meta: { width: "1%" }, cell: ({ row }) => <span className="whitespace-nowrap text-fg-muted">{tt(`${row.original.type}.one`)}</span> },
      {
        id: "lang",
        header: tm("colLanguage"),
        meta: { width: "1%" },
        // "All" when every checked language has an issue in view, otherwise the codes that do (EN AR).
        cell: ({ row }) => {
          const langs = langsFor(row.original);
          return langs.length > 1 && langs.length === locales.length ? (
            <span className="whitespace-nowrap text-fg-muted" title={langs.map((l) => NATIVE[l]).join(", ")}>{tm("allLanguages")}</span>
          ) : (
            <span dir="ltr" className="whitespace-nowrap font-mono text-caption text-fg-muted" title={langs.map((l) => NATIVE[l]).join(", ")}>
              {langs.map((l) => l.toUpperCase()).join(" ")}
            </span>
          );
        },
      },
      { id: "updated", header: tm("colUpdated"), meta: { numeric: true, width: "1%" }, cell: ({ row }) => <span className="whitespace-nowrap text-fg-muted">{f.date(row.original.updatedAt, { dateStyle: "medium" })}</span> },
      {
        id: "fix",
        meta: { width: "1%" },
        header: () => <span className="sr-only">{tm("colFix")}</span>,
        cell: ({ row }) => {
          const issue = shown(row.original)[0];
          return (
            <Link href={fixHref(row.original, issue)} aria-label={tm("fixIn", { issue: t(`checks.${issue}`), page: entryName(row.original) })} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "whitespace-nowrap")}>
              <span>{tm("fix")}</span>
              <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
            </Link>
          );
        },
      },
    ];
    // What needs fixing sits next to the page name, so it stays in view when the table scrolls.
    return COLUMN_ORDER.map((id) => columns.find((column) => column.id === id)!);
  }, [t, tm, tt, f, entryName, url.href, lang, locales, pickedKey, expanded, notes]);

  // One chip per issue that some listed page has (with how many), plus any already chosen.
  const chips = ALL_ISSUES.filter((i) => (data?.issueCounts?.[i] ?? 0) > 0 || picked.includes(i)).map((i) => ({ value: i, label: t(`checks.${i}`), count: data?.issueCounts?.[i] ?? 0 }));
  const filtered = url.get("search") || url.get("kind") || url.get("lang") || url.get("entry") || picked.length;
  const clear = () => url.set({ search: "", kind: "all", lang: "all", entry: "", issues: "" });
  const status = isLoading ? "loading" : error ? (statusOf(error) === 403 ? "forbidden" : "error") : "ready";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tm("title")} description={tm("description")} />
      <div className="flex flex-col gap-4">
        <div className="wm-table-filters">
          <Input size="sm" aria-label={ti("search")} placeholder={ti("search")} value={url.get("search")} onChange={(e) => url.set({ search: e.target.value })} className="wm-search" />
          <Select size="sm" label={ti("type")} value={url.get("kind", "all")} onValueChange={(kind) => url.set({ kind })} options={[{ value: "all", label: ti("all") }, ...Object.values(TYPES).filter((type) => type.seo).map((type) => ({ value: type.key, label: tt(`${type.key}.many`) }))]} />
          <Select size="sm" label={tm("colLanguage")} value={url.get("lang", "all")} onValueChange={(lang) => url.set({ lang })} options={[{ value: "all", label: ti("all") }, ...LOCALES.map((value) => ({ value, label: NATIVE[value] }))]} />
          {url.get("entry") ? <Button size="sm" variant="ghost" onClick={clear}>{tm("showAllPages")}</Button> : null}
        </div>
        <section aria-label={tm("title")} className="flex flex-col gap-4">
          {chips.length ? <FilterChips label={tm("issueFilter")} chips={chips} value={picked} onValueChange={(value) => url.set({ issues: value.join(",") })} /> : null}
          <DataTable
            label={tm("title")}
            columns={columns.map((column) => ({ ...column, enableSorting: false }))}
            mode="server"
            rowCount={data?.total ?? 0}
            pagination={{ pageIndex: url.page - 1, pageSize: 10 }}
            onPaginationChange={(update) => url.set({ page: (typeof update === "function" ? update({ pageIndex: url.page - 1, pageSize: 10 }) : update).pageIndex + 1 })}
            data={data?.items ?? []}
            getRowId={(r) => r.id}
            status={status}
            paginate
            onRetry={refetch}
            className={isFetching && !isLoading ? "opacity-70" : undefined}
            empty={unpublished ? { title: t("languageNotPublic", { language: NATIVE[lang as Locale] ?? lang }), description: t("languageNotPublicHelp"), action: <Link href="/settings/site" className={buttonVariants({ variant: "secondary", size: "sm" })}>{t("openSiteSettings")}</Link> } : { title: tm("empty"), description: filtered ? tm("emptyFiltered") : undefined, action: filtered ? <Button size="sm" variant="secondary" onClick={clear}>{tm("clearFilters")}</Button> : undefined }}
          />
        </section>
      </div>
    </div>
  );
}

export default function SeoMissingPage() {
  return (
    <RequirePermission permission="seo:view">
      <Missing />
    </RequirePermission>
  );
}
