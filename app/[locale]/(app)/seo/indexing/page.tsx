"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge, Input, Select, ErrorState, LoadingState, NoPermissionState, PageHeader, useFormatter } from "@orgtik/ui";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { useListState } from "@/lib/useListState";
import { statusOf, useIndexingQuery, type Indexing } from "@/store/api";

type Url = Indexing["urls"][number];

function IndexingView() {
  const t = useTranslations("Seo");
  const tt = useTranslations("Types");
  const f = useFormatter();
  const ti = useTranslations("Improvements");
  const url = useListState();
  const { data, isLoading, error, refetch } = useIndexingQuery();
  const columns = useMemo<ColumnDef<Url, any>[]>(
    () => [
      { id: "loc", header: t("colAddress"), meta: { truncate: true }, cell: ({ row }) => <span dir="ltr" className="block truncate text-start font-mono text-body-sm text-fg">{row.original.loc}</span> },
      { id: "type", header: t("colType"), cell: ({ row }) => <span className="text-fg-muted">{tt(`${row.original.type}.one`)}</span> },
      { id: "policy", header: ti("indexing"), cell: ({ row }) => <div className="flex flex-col gap-1"><Badge tone={row.original.policy === "index" ? "success" : "warning"}>{row.original.policy}</Badge><span className="text-caption text-fg-muted">{ti(row.original.reason)}</span></div> },
      { id: "canonical", header: ti("canonical"), cell: ({ row }) => <span dir="ltr" className="break-all text-body-sm">{row.original.canonical}</span> },
      { id: "sitemap", header: ti("sitemap"), cell: ({ row }) => ti(row.original.inSitemap ? "included" : "excluded") },
      { id: "lastmod", header: t("colLastmod"), meta: { numeric: true }, cell: ({ row }) => <span className="text-fg-muted">{row.original.lastmod ? f.date(row.original.lastmod.length === 10 ? row.original.lastmod + "T00:00:00" : row.original.lastmod, { dateStyle: "medium" }) : "–"}</span> },
    ],
    [t, tt, f, ti],
  );
  const search = url.get("search"), type = url.get("type"), policy = url.get("policy");
  const rows = useMemo(() => (data?.urls ?? []).filter(row => (!search || row.loc.toLowerCase().includes(search.toLowerCase())) && (!type || row.type === type) && (!policy || row.policy === policy)), [data?.urls, search, type, policy]);
  const s = statusOf(error);
  if (isLoading) return <LoadingState rows={5} />;
  if (s === 403) return <NoPermissionState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;
  const types = [...new Set(data.urls.map(row => row.type))];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("indexingTitle")} description={t("indexingDescription")} />
      <div className="wm-table-filters">
        <Input size="sm" aria-label={ti("search")} placeholder={ti("search")} value={url.get("search")} onChange={e => url.set({ search: e.target.value })} className="wm-search" />
        <Select size="sm" label={ti("type")} value={url.get("type", "all")} onValueChange={type => url.set({ type })} options={[{ value: "all", label: ti("all") }, ...types.map(type => ({ value: type, label: tt(`${type}.many`) }))]} />
        <Select size="sm" label={ti("indexing")} value={url.get("policy", "all")} onValueChange={policy => url.set({ policy })} options={[{ value: "all", label: ti("all") }, { value: "index", label: "index" }, { value: "noindex", label: "noindex" }]} />
      </div>
      <section aria-labelledby="sitemap" className="flex flex-col gap-3">
        <h2 id="sitemap" className="font-display text-title-sm text-fg">{t("sitemapTitle", { count: data.sitemap.length })}</h2>
        <p className="text-body-sm text-fg-muted">{t("sitemapNote")}</p>
        <DataTable className="[&_tbody_td]:py-2" label={t("sitemapTitle", { count: data.sitemap.length })} columns={columns} data={rows} getRowId={(r) => `${r.id}-${r.locale}`} pagination={{ pageIndex: url.page - 1, pageSize: 10 }} onPaginationChange={update => url.set({ page: (typeof update === "function" ? update({ pageIndex: url.page - 1, pageSize: 10 }) : update).pageIndex + 1 })} status="ready" paginate empty={{ title: t("sitemapEmpty") }} />
      </section>

      <section aria-labelledby="robots" className="flex flex-col gap-3">
        <h2 id="robots" dir="ltr" className="text-start font-display text-title-sm text-fg">robots.txt</h2>
        <pre dir="ltr" className="overflow-x-auto rounded-card border border-line bg-sunken p-4 text-start font-mono text-body-sm text-fg">{data.robots}</pre>
      </section>
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
