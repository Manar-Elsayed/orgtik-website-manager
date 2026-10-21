"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Input, Select, PageHeader, buttonVariants, useFormatter } from "@orgtik/ui";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { SeoCountCard, revealList } from "@/components/seo/SeoCountCard";
import { Link } from "@/i18n/routing";
import { useListState } from "@/lib/useListState";
import { TYPES } from "@/lib/contentTypes";
import { useEntryName } from "@/lib/entryName";
import { statusOf, useSeoHealthQuery, type Locale, type SeoCheck, type SeoRow } from "@/store/api";

type Filter = "all" | "none" | "any" | SeoCheck;
// Every language the site can publish in, whether or not it is public yet.
const LOCALES: Locale[] = ["en", "ar", "de", "fr", "it"];
const NATIVE: Record<Locale, string> = { en: "English", ar: "العربية", de: "Deutsch", fr: "Français", it: "Italiano" };
const LIST = "seo-health-list";

// What a search result and a shared link need, page by page: a checklist, not a score.
function Health() {
  const t = useTranslations("Seo");
  const tt = useTranslations("Types");
  const f = useFormatter();
  const entryName = useEntryName();
  const ti = useTranslations("Improvements");
  const url = useListState();
  const check = url.get("issue", "all") as Filter;
  const setCheck = (issue: string) => url.set({ issue });
  // A card filters the list to its pages; choosing the active card again shows every page.
  const choose = (issue: Filter) => {
    setCheck(check === issue ? "all" : issue);
    revealList(LIST);
  };
  const { data, isLoading, error, refetch, isFetching } = useSeoHealthQuery({ issue: check === "all" ? undefined : check, search: url.get("search"), kind: url.get("kind"), lang: url.get("lang"), page: url.page, pageSize: 10 });

  const columns = useMemo<ColumnDef<SeoRow, any>[]>(() => {
    const returnTo = encodeURIComponent(url.href);
    const fixHref = (r: SeoRow) => `/seo/content/${r.id}?lang=${r.locale}&returnTo=${returnTo}`;
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
      { id: "lang", header: t("missing.colLanguage"), meta: { width: "1%" }, cell: ({ row }) => <span dir="ltr" title={NATIVE[row.original.locale]} className="font-mono text-caption text-fg-muted">{row.original.locale.toUpperCase()}</span> },
      { id: "title", header: t("colTitle"), meta: { numeric: true }, cell: ({ row }) => <span className="tabular-nums text-fg-muted">{f.number(row.original.titleLength)}</span> },
      { id: "description", header: t("colDescription"), meta: { numeric: true }, cell: ({ row }) => <span className="tabular-nums text-fg-muted">{f.number(row.original.descriptionLength)}</span> },
      {
        id: "status",
        header: t("colStatus"),
        meta: { width: "1%" },
        // The issues themselves are listed, by where each is fixed, on SEO missing.
        cell: ({ row }) =>
          row.original.issues.length ? (
            <Link href={`/seo/missing?entry=${row.original.id}`} title={row.original.issues.map((i) => t(`checks.${i}`)).join(", ")} aria-label={t("seeIssues", { page: entryName(row.original) })} className="inline-flex rounded-pill focus-visible:outline-2 focus-visible:outline-focus">
              <Badge size="sm" tone="warning" className="whitespace-nowrap hover:underline">{t("issuesFound")}</Badge>
            </Link>
          ) : (
            <Badge size="sm" tone="success" className="whitespace-nowrap">{t("ok")}</Badge>
          ),
      },
    ];
  }, [t, tt, f, entryName, url.href]);

  // Only switched-on languages are checked; say so rather than claim another one is fine.
  const lang = url.get("lang");
  const unpublished = Boolean(lang && data && !data.locales.includes(lang as Locale));
  const status = isLoading ? "loading" : error ? (statusOf(error) === 403 ? "forbidden" : "error") : "ready";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("healthTitle")} description={t("healthDescription")} />
      {data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SeoCountCard label={t("checked")} count={data.checked} active={check === "all"} hint={t("showAllPages")} onSelect={() => { setCheck("all"); revealList(LIST); }} />
          <SeoCountCard label={t("healthy")} count={data.healthy} active={check === "none"} hint={t("showPages")} onSelect={() => choose("none")} />
          {/* Every page with at least one check to fix; the To fix column lists each of its issues. */}
          <SeoCountCard label={t("issuesFound")} count={data.checked - data.healthy} active={check === "any"} hint={t("showToFix")} onSelect={() => choose("any")} />
        </div>
      ) : null}
      <div id={LIST} className="flex scroll-mt-6 flex-col gap-4">
        <div className="wm-table-filters">
          <Input size="sm" aria-label={ti("search")} placeholder={ti("search")} value={url.get("search")} onChange={e => url.set({ search: e.target.value })} className="wm-search" />
          <Select size="sm" label={ti("type")} value={url.get("kind", "all")} onValueChange={kind => url.set({ kind })} options={[{ value: "all", label: ti("all") }, ...Object.values(TYPES).filter(type => type.seo).map(type => ({ value: type.key, label: tt(`${type.key}.many`) }))]} />
          <Select size="sm" label={t("missing.colLanguage")} value={url.get("lang", "all")} onValueChange={lang => url.set({ lang })} options={[{ value: "all", label: ti("all") }, ...LOCALES.map(value => ({ value, label: NATIVE[value] }))]} />
        </div>
        <DataTable
          label={t("healthTitle")}
          columns={columns.map(column => ({ ...column, enableSorting: false }))}
          mode="server" rowCount={data?.total ?? 0}
          pagination={{ pageIndex: url.page - 1, pageSize: 10 }}
          onPaginationChange={update => url.set({ page: (typeof update === "function" ? update({ pageIndex: url.page - 1, pageSize: 10 }) : update).pageIndex + 1 })}
          data={data?.items ?? []}
          getRowId={(r) => `${r.id}-${r.locale}`}
          status={status}
          paginate
          onRetry={refetch}
          className={isFetching && !isLoading ? "opacity-70" : undefined}
          empty={unpublished ? { title: t("languageNotPublic", { language: NATIVE[lang as Locale] ?? lang }), description: t("languageNotPublicHelp"), action: <Link href="/settings/site" className={buttonVariants({ variant: "secondary", size: "sm" })}>{t("openSiteSettings")}</Link> } : { title: t("allGood"), action: check !== "all" || url.get("search") || url.get("kind") || url.get("lang") ? <Button size="sm" variant="secondary" onClick={() => url.set({ issue: "all", search: "", kind: "all", lang: "all" })}>{t("showAllPages")}</Button> : undefined }}
        />
      </div>
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
