"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge, Input, Select, ErrorState, LoadingState, NoPermissionState, PageHeader, useFormatter } from "@orgtik/ui";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { useListState } from "@/lib/useListState";
import { statusOf, useIndexingQuery } from "@/store/api";

// The addresses this prototype presents: the home page and the Services and Insights sections are
// public, the imprint stays out of search. Services and Insights share one row.
type Row = {
  id: string;
  /** The pages behind the row; their last change is the row's. */
  entries: string[];
  addresses: string[];
  type: "page" | "legalDocument";
  policy: "index" | "noindex";
  reason: "allowed" | "pagePolicy";
};
const HOST = "https://orgtik.ch";
const ROWS: Row[] = [
  { id: "home", entries: ["pg_home"], addresses: [`${HOST}/`], type: "page", policy: "index", reason: "allowed" },
  { id: "services-insights", entries: ["pg_services", "pg_insights"], addresses: [`${HOST}/services`, `${HOST}/insights`], type: "page", policy: "index", reason: "allowed" },
  { id: "imprint", entries: ["lg_imprint"], addresses: [`${HOST}/legal/imprint`], type: "legalDocument", policy: "noindex", reason: "pagePolicy" },
];

function IndexingView() {
  const t = useTranslations("Seo");
  const tt = useTranslations("Types");
  const tx = useTranslations("Seo.indexing");
  const f = useFormatter();
  const ti = useTranslations("Improvements");
  const url = useListState();
  const { data, isLoading, error, refetch } = useIndexingQuery();
  // Each row's last change: the latest of its pages, from the site's own records.
  const lastmod = useMemo(() => {
    const at = new Map((data?.urls ?? []).filter((u) => u.locale === "en").map((u) => [u.id, u.lastmod]));
    return (row: Row) => row.entries.map((id) => at.get(id)).filter((d): d is string => Boolean(d)).sort().pop() ?? null;
  }, [data?.urls]);
  const columns = useMemo<ColumnDef<Row, any>[]>(
    () => [
      {
        id: "loc",
        header: t("colAddress"),
        cell: ({ row }) => (
          <span className="flex flex-col">
            {row.original.addresses.map((a) => <span key={a} dir="ltr" className="block truncate text-start font-mono text-body-sm text-fg">{a}</span>)}
          </span>
        ),
      },
      { id: "type", header: t("colType"), cell: ({ row }) => <span className="text-fg-muted">{tt(`${row.original.type}.${row.original.addresses.length > 1 ? "many" : "one"}`)}</span> },
      { id: "policy", header: ti("indexing"), cell: ({ row }) => <div className="flex flex-col gap-1"><Badge tone={row.original.policy === "index" ? "success" : "warning"}>{row.original.policy === "index" ? tx("policyPublic") : "noindex"}</Badge><span className="text-caption text-fg-muted">{ti(row.original.reason)}</span></div> },
      // Each address is its own canonical.
      {
        id: "canonical",
        header: ti("canonical"),
        cell: ({ row }) => (
          <span className="flex flex-col">
            {row.original.addresses.map((a) => <span key={a} dir="ltr" className="break-all text-body-sm">{a}</span>)}
          </span>
        ),
      },
      { id: "sitemap", header: ti("sitemap"), cell: ({ row }) => ti(row.original.policy === "index" ? "included" : "excluded") },
      { id: "lastmod", header: t("colLastmod"), meta: { numeric: true }, cell: ({ row }) => { const d = lastmod(row.original); return <span className="text-fg-muted">{d ? f.date(d.length === 10 ? d + "T00:00:00" : d, { dateStyle: "medium" }) : "–"}</span>; } },
    ],
    [t, tt, tx, f, ti, lastmod],
  );
  const search = url.get("search").toLowerCase(), policy = url.get("policy");
  const rows = useMemo(() => ROWS.filter((row) => (!search || row.addresses.some((a) => a.toLowerCase().includes(search))) && (!policy || row.policy === policy)), [search, policy]);
  const s = statusOf(error);
  if (isLoading) return <LoadingState rows={5} />;
  if (s === 403) return <NoPermissionState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;
  // The sitemap lists every public address.
  const listed = ROWS.filter((row) => row.policy === "index").reduce((n, row) => n + row.addresses.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("indexingTitle")} description={t("indexingDescription")} />
      <div className="wm-table-filters">
        <Input size="sm" aria-label={ti("search")} placeholder={ti("search")} value={url.get("search")} onChange={e => url.set({ search: e.target.value })} className="wm-search" />
        <Select size="sm" label={ti("indexing")} value={url.get("policy", "all")} onValueChange={policy => url.set({ policy })} options={[{ value: "all", label: ti("all") }, { value: "index", label: tx("policyPublic") }, { value: "noindex", label: "noindex" }]} />
      </div>
      <section aria-labelledby="sitemap" className="flex flex-col gap-3">
        <h2 id="sitemap" className="font-display text-title-sm text-fg">{t("sitemapTitle", { count: listed })}</h2>
        <p className="text-body-sm text-fg-muted">{t("sitemapNote")}</p>
        <DataTable className="[&_tbody_td]:py-2" label={t("sitemapTitle", { count: listed })} columns={columns} data={rows} getRowId={(r) => r.id} status="ready" empty={{ title: t("sitemapEmpty") }} />
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
