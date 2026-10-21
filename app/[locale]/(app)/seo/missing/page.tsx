"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "@phosphor-icons/react";
import { Badge, Button, FilterChips, Input, Select, PageHeader, StatusBadge, Tabs, TabsList, buttonVariants, cn, useFormatter } from "@orgtik/ui";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { Link } from "@/i18n/routing";
import { useListState } from "@/lib/useListState";
import { TYPES } from "@/lib/contentTypes";
import { useEntryName } from "@/lib/entryName";
import { DUPLICATE_OF, fieldOf, isGuidance } from "@/lib/seoChecks";
import { statusOf, useSeoMissingQuery, type Locale, type SeoGroup, type SeoIssue, type SeoMissingRow } from "@/store/api";

// The SEO editor's sections, in its order, then the image (fixed in the content editor).
const GROUPS: SeoGroup[] = ["search", "keywords", "sharing", "images", "technical"];
const GROUP_ISSUES: Record<SeoGroup, SeoIssue[]> = {
  search: ["titleMissing", "titleShort", "titleLong", "titleDuplicate", "descriptionMissing", "descriptionShort", "descriptionLong", "descriptionDuplicate", "addressDuplicate"],
  keywords: ["focusMissing", "focusDuplicate", "keywordsMissing"],
  sharing: ["noSocialImage", "socialImageDefault"],
  images: ["imageNoAlt"],
  technical: ["canonicalHost", "canonicalUnreachable", "canonicalOther", "canonicalSitemap", "schemaInvalid"],
};
const ALL_ISSUES = Object.values(GROUP_ISSUES).flat();
const LOCALES: Locale[] = ["en", "ar", "de", "fr", "it"];
const NATIVE: Record<Locale, string> = { en: "English", ar: "العربية", de: "Deutsch", fr: "Français", it: "Italiano" };
const COLUMN_ORDER = ["page", "issues", "status", "type", "lang", "updated", "fix"];
const isGroup = (value: string): value is SeoGroup => (GROUPS as string[]).includes(value);

// Every page with something to fix for search results, shared links or screen readers, one row
// per page. The tabs are the SEO editor's sections; each issue opens the editor that fixes it.
function Missing() {
  const t = useTranslations("Seo");
  const tb = useTranslations("Seo.block");
  const tm = useTranslations("Seo.missing");
  const tt = useTranslations("Types");
  const ti = useTranslations("Improvements");
  const f = useFormatter();
  const entryName = useEntryName();
  const url = useListState();
  const tab = url.get("group", "all");
  const group = isGroup(tab) ? tab : undefined;
  const { data, isLoading, error, refetch, isFetching } = useSeoMissingQuery({ group, entry: url.get("entry"), issues: url.get("issues"), search: url.get("search"), kind: url.get("kind"), lang: url.get("lang"), page: url.page, pageSize: 10 });
  const groupLabel = (value: SeoGroup | "all") => (value === "all" || value === "images" || value === "technical" ? tm(`tabs.${value}`) : tb(value === "sharing" ? "social" : value));

  // Only switched-on languages are checked; say so rather than claim another one is fine.
  const lang = url.get("lang");
  const locales = data?.locales ?? LOCALES;
  const unpublished = Boolean(lang && data && !data.locales.includes(lang as Locale));
  const columns = useMemo<ColumnDef<SeoMissingRow, unknown>[]>(() => {
    const returnTo = encodeURIComponent(url.href);
    // Image descriptions are edited with the image, in the content editor; everything else in the SEO editor.
    // The issues in this tab, and only the chosen language's when the list is filtered by one.
    const shown = (r: SeoMissingRow) => {
      const own = lang && r.byLanguage?.[lang as Locale] ? r.byLanguage[lang as Locale]! : r.issues;
      return group ? own.filter((i) => GROUP_ISSUES[group].includes(i)) : own;
    };
    // The languages with something to fix in this tab; the editor opens in the filtered one, else the first.
    const langsFor = (r: SeoMissingRow) => (group ? r.languages.filter((l) => r.byLanguage?.[l]?.some((i) => GROUP_ISSUES[group].includes(i))) : r.languages);
    const openIn = (r: SeoMissingRow, issue?: SeoIssue) => {
      const langs = issue ? langsFor(r).filter((l) => r.byLanguage?.[l]?.includes(issue)) : langsFor(r);
      return langs.includes(lang as Locale) ? lang : langs[0] ?? r.locale;
    };
    const fixHref = (r: SeoMissingRow, issue?: SeoIssue) => (issue === "imageNoAlt" ? `/content/${TYPES[r.type].area}/${r.id}?lang=${openIn(r, issue)}&returnTo=${returnTo}` : `/seo/content/${r.id}?lang=${openIn(r, issue)}${issue && fieldOf(issue) ? `&field=${fieldOf(issue)}` : ""}&returnTo=${returnTo}`);
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
        cell: ({ row }) => (
          <span className="flex min-w-56 flex-wrap gap-1">
            {shown(row.original).map((issue) => (
              <Link key={issue} href={fixHref(row.original, issue)} aria-label={tm("fixIn", { issue: t(`checks.${issue}`), page: entryName(row.original) })} className="rounded-pill focus-visible:outline-2 focus-visible:outline-focus">
                <Badge size="sm" tone={isGuidance(issue) ? "neutral" : "warning"} className="hover:underline">{t(`checks.${issue}`)}</Badge>
              </Link>
            ))}
            {/* A duplicate says which page already uses the title, address or keyphrase. */}
            {shown(row.original).map((issue) => {
              const kind = DUPLICATE_OF[issue], others = kind ? row.original.duplicates?.[openIn(row.original, issue) as Locale]?.[kind] : undefined;
              return kind && others?.length ? <span key={`${issue}-hint`} className="w-full text-caption text-warning">{tm(`duplicateHint.${kind}`, { pages: others.map((o) => entryName(o)).join(", ") })}</span> : null;
            })}
          </span>
        ),
      },
      { id: "status", header: tm("colStatus"), meta: { width: "1%" }, cell: ({ row }) => <StatusBadge size="sm" entity="cms_revision" state={row.original.state} /> },
      { id: "type", header: t("colType"), meta: { width: "1%" }, cell: ({ row }) => <span className="whitespace-nowrap text-fg-muted">{tt(`${row.original.type}.one`)}</span> },
      {
        id: "lang",
        header: tm("colLanguage"),
        meta: { width: "1%" },
        // "All" when every checked language has something to fix in this tab, otherwise the codes that do (EN AR).
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
  }, [t, tm, tt, f, entryName, url.href, group, lang, locales]);

  const tabs = [{ value: "all", label: groupLabel("all"), count: data?.incomplete }, ...GROUPS.map((value) => ({ value, label: groupLabel(value), count: data?.counts[value] }))];
  // One chip per issue in this tab that some listed page has (with how many), plus any already chosen.
  const picked = url.get("issues").split(",").filter(Boolean) as SeoIssue[];
  const chips = (group ? GROUP_ISSUES[group] : ALL_ISSUES).filter((i) => (data?.issueCounts?.[i] ?? 0) > 0 || picked.includes(i)).map((i) => ({ value: i, label: t(`checks.${i}`), count: data?.issueCounts?.[i] ?? 0 }));
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
        <Tabs value={group ?? "all"} onValueChange={(value) => url.set({ group: String(value), issues: "" })}>
          <TabsList items={tabs} />
        </Tabs>
        <section aria-label={groupLabel(group ?? "all")} className="flex flex-col gap-4">
          <p className="text-body-sm text-fg-muted">{tm(`why.${group ?? "all"}`)}</p>
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
