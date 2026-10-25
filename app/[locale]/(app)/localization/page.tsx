"use client";
import { RowActionsMenu } from "@/components/content/RowActionsMenu";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge, MenuLinkItem, Input, Card, Select, Tabs, TabsList, useFormatter } from "@orgtik/ui";
import { PageHeader } from "@/components/frame/PageHeader";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { Link } from "@/i18n/routing";
import { Eye, PencilSimple } from "@phosphor-icons/react";
import { useCan } from "@/lib/permissions";
import { useListState } from "@/lib/useListState";
import { TYPES } from "@/lib/contentTypes";
import { useEntryName } from "@/lib/entryName";
import { statusOf, useSiteQuery, useLocalizationQuery, type EntryType, type Locale, type LocalizationRow, type TranslationState } from "@/store/api";

const LANGS: Locale[] = ["ar", "de", "fr", "it"];
const NATIVE: Record<Locale, string> = { en: "English", ar: "العربية", de: "Deutsch", fr: "Français", it: "Italiano" };
// Two statuses only: a translation is complete once it is ready or live; anything else is missing.
const FILTERS = ["all", "complete", "missing"] as const;
type Filter = (typeof FILTERS)[number];
const DONE: TranslationState[] = ["ready", "published"];
const isComplete = (state: TranslationState | undefined) => DONE.includes(state ?? "not_started");
// Older links (?status=gaps, needs_review, outdated, in_progress, not_started) all mean "not complete yet".
const toFilter = (value: string): Filter => (value === "all" || value === "complete" ? value : "missing");

// Every entry in every language: where each translation stands, and a way into it.
function Matrix() {
  const t = useTranslations("Localization");
  const site = useSiteQuery();
  const languages = (site.data?.locales.filter(locale=>locale.code!=="en" && locale.enabled).map(locale=>locale.code) ?? LANGS) as Locale[];
  const languageName = (locale:string)=>NATIVE[locale as Locale] ?? new Intl.DisplayNames([locale],{type:"language"}).of(locale) ?? locale;
  const tt = useTranslations("Types");
  const f = useFormatter();
  const entryName = useEntryName();
  const url = useListState();
  const ti = useTranslations("Improvements");
  const can = useCan();
  const filter = toFilter(url.get("status", "all"));
  const type = url.get("type", "all") as "all" | EntryType;
  const setFilter = (status: string) => url.set({ status });
  const setType = (type: string) => url.set({ type });
  const { data, isLoading, error, refetch } = useLocalizationQuery();
  // Prices are numbers and keys; they have nothing to translate beyond their words, kept with them.
  const all = useMemo(() => (data?.items ?? []).filter((r) => r.type !== "pricing"), [data?.items]);
  const search = url.get("search");
  // Complete: every language is complete. Missing: at least one language still is.
  const rows = useMemo(() => all.filter((r) => (!search || entryName(r).toLowerCase().includes(search.toLowerCase())) && (type === "all" || r.type === type) && (filter === "all" || (filter === "complete" ? languages.every((l) => isComplete(r.translation[l])) : languages.some((l) => !isComplete(r.translation[l]))))), [all, search, type, filter, entryName, languages.join(",")]);

  const columns = useMemo<ColumnDef<LocalizationRow, any>[]>(
    () => [
      {
        id: "entry",
        header: t("colEntry"),
        meta: { truncate: true },
        cell: ({ row }) => (
          <span className="flex min-w-0 flex-col">
            <Link href={`/content/${TYPES[row.original.type].area}/${row.original.id}?${can("content:edit") ? "" : "view=1&"}returnTo=${encodeURIComponent(url.href)}`} dir="auto" className="truncate font-semibold text-fg hover:underline focus-visible:outline-2 focus-visible:outline-focus">
              {entryName(row.original)}
            </Link>
            <span className="text-caption text-fg-subtle">{tt(`${row.original.type}.one`)}</span>
          </span>
        ),
      },
      ...languages.map<ColumnDef<LocalizationRow, any>>((l) => ({
        id: l,
        header: () => (
          <span lang={l} dir={l === "ar" ? "rtl" : "ltr"}>
            {languageName(l)}
          </span>
        ),
        cell: ({ row }) => (
          <Link href={`/content/${TYPES[row.original.type].area}/${row.original.id}?lang=${l}&returnTo=${encodeURIComponent(url.href)}`} aria-label={t("openIn", { language: languageName(l) })} className="inline-flex rounded-pill focus-visible:outline-2 focus-visible:outline-focus">
            {isComplete(row.original.translation[l]) ? <Badge tone="success" size="sm">{t("state.complete")}</Badge> : <Badge tone="warning" size="sm">{t("state.missing")}</Badge>}
          </Link>
        ),
      })),
      { id: "actions", header: ti("actions"), cell: ({ row }) => <RowActionsMenu target={entryName(row.original)}>
        <MenuLinkItem icon={<Eye />} render={<Link href={`/content/${TYPES[row.original.type].area}/${row.original.id}?view=1&returnTo=${encodeURIComponent(url.href)}`} />}>{ti("view")}</MenuLinkItem>
        {can("content:edit") ? <MenuLinkItem icon={<PencilSimple />} render={<Link href={`/content/${TYPES[row.original.type].area}/${row.original.id}?returnTo=${encodeURIComponent(url.href)}`} />}>{ti("edit")}</MenuLinkItem> : null}
      </RowActionsMenu> },
    ],
    [t, tt, ti, entryName, url.href, can, languages.join(",")],
  );

  const status = isLoading ? "loading" : error ? (statusOf(error) === 403 ? "forbidden" : "error") : "ready";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {languages.map((l) => {
            const done = all.filter((r) => isComplete(r.translation[l])).length;
            return (
              <Card key={l} padding="sm" className="flex flex-col gap-1">
                <span lang={l} dir={l === "ar" ? "rtl" : "ltr"} className="text-start text-body-sm text-fg-muted">{languageName(l)}</span>
                <span className="font-display text-title text-fg tabular-nums">{f.number(done)} <span className="text-body-sm text-fg-subtle">/ {f.number(all.length)}</span></span>
                <span className="text-caption text-fg-subtle">{t("readyCount")}</span>
              </Card>
            );
          })}
        </div>
      ) : null}
      <div className="wm-table-filters"><Input size="sm" className="wm-search" aria-label={ti("search")} placeholder={ti("search")} value={url.get("search")} onChange={e => url.set({ search: e.target.value })} /><Select size="sm" aria-label={t("filters.all")} value={filter} onValueChange={value=>setFilter(value??"all")} options={FILTERS.map(value=>({value,label:t(`filters.${value}`)}))} /><Select
        label={ti("type")}
        size="sm"
        aria-label={t("type")}
        value={type}
        onValueChange={(v) => setType((v ?? "all") as "all" | EntryType)}
        options={[{ value: "all", label: t("allTypes") }, ...(Object.keys(TYPES) as EntryType[]).filter((k) => k !== "pricing").map((k) => ({ value: k, label: tt(`${k}.many`) }))]}
        className="w-60"
      />
      </div>
      <DataTable pagination={{ pageIndex: url.page - 1, pageSize: 10 }} onPaginationChange={update => url.set({ page: (typeof update === "function" ? update({ pageIndex: url.page - 1, pageSize: 10 }) : update).pageIndex + 1 })} label={t("title")} columns={columns} data={rows} getRowId={(r) => r.id} status={status} paginate onRetry={refetch} empty={{ title: t("empty") }} />
    </div>
  );
}

export default function LocalizationPage() {
  return (
    <RequirePermission permission="localization:view">
      <Matrix />
    </RequirePermission>
  );
}
