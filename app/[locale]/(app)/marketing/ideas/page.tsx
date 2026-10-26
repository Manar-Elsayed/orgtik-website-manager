"use client";
import { RowActionsMenu } from "@/components/content/RowActionsMenu";

import { ActionDialog, NEXT } from "@/components/marketing/IdeaDetail";
import { IDEA_CATEGORIES, IdeaTags } from "@/components/marketing/IdeaTags";
import { Link, useRouter } from "@/i18n/routing";
import { useListState } from "@/lib/useListState";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, PencilSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import { Badge, Button, Input, Select, MenuItem, MenuLinkItem, StatusBadge, useFormatter, useStatusLabel } from "@orgtik/ui";
import { PageHeader } from "@/components/frame/PageHeader";
import { FilterFold } from "@/components/frame/FilterFold";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { useCan } from "@/lib/permissions";
import { statusOf, useIdeasQuery, type Idea, type IdeaAction } from "@/store/api";

const STATUSES = ["all", "pending", "open", "planned", "in_progress", "shipped", "closed"] as const;
type StatusFilter = (typeof STATUSES)[number];
function IdeasList() {
  const t = useTranslations("Ideas");
  const f = useFormatter();
  const statusLabel = useStatusLabel();
  const can = useCan();
  const canModerate = can("marketing:edit");

  const url = useListState();
  const router = useRouter();
  const ti = useTranslations("Improvements");
  const search = url.get("search");
  const setSearch = (search: string) => url.set({ search });
  const statusFilter = url.get("status", "all") as StatusFilter;
  const setStatusFilter = (status: StatusFilter) => url.set({ status });
  const tag = url.get("tag", url.get("theme")), category = url.get("category");
  const setTag = (value: string | null) => {
    const [path, query = ""] = url.href.split("?");
    const next = new URLSearchParams(query);
    next.delete("page"); next.delete("theme");
    if (!value || value === "all") next.delete("tag");
    else next.set("tag", value.slice(4));
    router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const [acting, setActing] = useState<{ idea: Idea; action: IdeaAction } | null>(null);
  const { data, isLoading, error, refetch, isFetching } = useIdeasQuery({ status: statusFilter === "all" ? undefined : statusFilter, search: search || undefined, tag: tag || undefined, category: category || undefined, page: url.page, pageSize: 10 }, { refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true });
  const tags = [...new Map([...(data?.tags ?? []), ...(tag ? [tag] : [])].map(value => [value.toLowerCase(), value])).values()].sort((a, b) => a.localeCompare(b));

  const columns = useMemo<ColumnDef<Idea, any>[]>(
    () => [
      {
        id: "idea",
        header: t("colIdea"),
        meta: { truncate: true },
        cell: ({ row }) => {
          const x = row.original;
          return (
            <span className="flex min-w-0 flex-col items-start">
              <span className="flex max-w-full items-center gap-2">
                <Link dir="auto" href={`/marketing/ideas/${x.id}?returnTo=${encodeURIComponent(url.href)}`} className="truncate text-start font-semibold text-fg hover:underline focus-visible:outline-2 focus-visible:outline-focus">
                  {x.title}
                </Link>
                {x.discussion?.some(comment => comment.status === "pending") ? <Badge size="sm" tone="warning">{t("discussion.waiting", { count: x.discussion.filter(comment => comment.status === "pending").length })}</Badge> : null}
              </span>
              <span dir="auto" className="max-w-full truncate text-caption text-fg-subtle">{x.body}</span>
            </span>
          );
        },
      },
      { id: "category", header: t("colCategory"), cell: ({ row }) => <span className="text-fg-muted">{t(`categories.${row.original.category ?? "unassigned"}`)}</span> },
      { id: "tags", header: t("colTags"), cell: ({ row }) => <IdeaTags tags={row.original.tags} empty={t("noTags")} /> },
      { id: "votes", header: t("colVotes"), meta: { numeric: true }, cell: ({ row }) => <span className="tabular-nums">{f.number(row.original.votes)}</span> },
      { id: "submitted", header: t("colSubmitted"), meta: { numeric: true }, cell: ({ row }) => <span className="text-fg-muted">{f.date(row.original.submittedAt, { dateStyle: "medium" })}</span> },
      { id: "status", header: t("colStatus"), cell: ({ row }) => <StatusBadge entity="roadmap_idea" state={row.original.status} size="sm" /> },
      { id: "actions", header: ti("actions"), enableSorting: false, cell: ({ row }) => <RowActionsMenu target={row.original.title}>
          <MenuLinkItem icon={<Eye />} render={<Link href={`/marketing/ideas/${row.original.id}?returnTo=${encodeURIComponent(url.href)}`} />}>{ti("view")}</MenuLinkItem>
          {canModerate ? <MenuLinkItem icon={<PencilSimple />} render={<Link href={`/marketing/ideas/${row.original.id}?edit=1&returnTo=${encodeURIComponent(url.href)}`} />}>{ti("edit")}</MenuLinkItem> : null}
          {canModerate && (NEXT[row.original.status] ?? []).includes("hide") ? <MenuItem tone="danger" onClick={() => setActing({ idea: row.original, action: "hide" })}>{t("actions.hide")}</MenuItem> : null}
        </RowActionsMenu> },
    ],
    [t, ti, f, canModerate, router, url.href],
  );

  const status = isLoading ? "loading" : error ? (statusOf(error) === 403 ? "forbidden" : "error") : "ready";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <FilterFold open={Boolean(tag)}>
        <Input size="sm" type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label={t("search")} placeholder={t("search")} startIcon={<MagnifyingGlass className="size-4" />} className="wm-search" />
        <Select
          size="sm"
          label={t("colStatus")}
          aria-label={t("colStatus")}
          value={statusFilter}
          onValueChange={value => setStatusFilter((value ?? "all") as StatusFilter)}
          options={STATUSES.map(value => ({
            value,
            label: value === "all" ? ti("all") : value === "closed" ? t("closed") : value === "open" ? ti("opened") : statusLabel("roadmap_idea", value),
          }))}
        />
        <Select size="sm" className="md:basis-64!" label={t("colCategory")} aria-label={t("colCategory")} value={category || "all"} onValueChange={value => url.set({ category: value })} options={[{ value: "all", label: ti("all") }, { value: "unassigned", label: t("categories.unassigned") }, ...IDEA_CATEGORIES.map(value => ({ value, label: t(`categories.${value}`) }))]} />
        <Select size="sm" label={t("colTags")} aria-label={t("colTags")} value={tag ? `tag:${tag}` : "all"} onValueChange={setTag} options={[{ value: "all", label: ti("all") }, ...tags.map(value => ({ value: `tag:${value}`, label: value }))]} />
      </FilterFold>
      <DataTable
        mode="server"
        rowCount={data?.total ?? 0}
        pagination={{ pageIndex: url.page - 1, pageSize: 10 }}
        onPaginationChange={update => url.set({ page: (typeof update === "function" ? update({ pageIndex: url.page - 1, pageSize: 10 }) : update).pageIndex + 1 })}
        label={t("tableLabel")}
        columns={columns.map(column => ({ ...column, enableSorting: false }))}
        data={data?.items ?? []}
        getRowId={(r) => r.id}
        status={status}
        paginate
        onRetry={refetch}
        className={`[&_tbody_td]:py-2 ${isFetching && !isLoading ? "opacity-70" : ""}`}
        empty={
          search || tag || category
            ? {
                title: t("noMatch"),
                action: (
                  <Button size="sm" variant="secondary" startIcon={<X />} onClick={() => url.set({ search: "", tag: "", theme: "", category: "", status: "" })}>
                    {t("clearFilters")}
                  </Button>
                ),
              }
            : { title: t(`empty.${statusFilter}`) }
        }
      />

      {acting ? <ActionDialog idea={acting.idea} action={acting.action} onClose={() => setActing(null)} /> : null}
    </div>
  );
}

export default function IdeasPage() {
  return (
    <RequirePermission permission="marketing:view">
      <IdeasList />
    </RequirePermission>
  );
}
