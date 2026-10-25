"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { FilmStrip, MagnifyingGlass, UploadSimple, X } from "@phosphor-icons/react";
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  FileField,
  Field,
  Textarea,
  Input,
  LoadingState,
  NoPermissionState,
  Pagination,
  Select,
  Tabs,
  TabsList,
  toast,
  useFormatter,
} from "@orgtik/ui";
import { PageHeader } from "@/components/frame/PageHeader";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { Link, useRouter } from "@/i18n/routing";
import { Thumb } from "@/components/media/Thumb";
import { useListState } from "@/lib/useListState";
import { statusOf, useMediaQuery, useUploadMediaMutation, type ApiError, type MediaIssue } from "@/store/api";

const ISSUES = ["all", "attention", "noAlt", "altSuggested", "rightsUnknown", "rightsExpiring", "unused"] as const;
type IssueTab = (typeof ISSUES)[number];
const ACCEPT = "image/webp,image/png,image/jpeg,image/svg+xml,video/mp4,video/webm";

function Library() {
  const t = useTranslations("Media");
  const f = useFormatter();
  const url = useListState();
  const issue = url.get("issue", "all") as IssueTab;
  const kind = url.get("kind", "all");
  const search = url.get("search");
  const setIssue = (issue: string) => url.set({ issue });
  const setKind = (kind: string) => url.set({ kind });
  const setSearch = (search: string) => url.set({ search });
  const { data, isLoading, error, refetch, isFetching } = useMediaQuery({ issue: issue === "all" ? undefined : issue, kind: kind === "all" ? undefined : kind, search: search || undefined, page: url.page, pageSize: 10 });
  useEffect(() => {
    if (data && !isFetching && url.page > Math.max(1, Math.ceil(data.total / 10))) url.set({ page: Math.max(1, Math.ceil(data.total / 10)) });
  }, [data, isFetching, url.page]);
  const counts = data?.counts ?? {};
  const filtered = issue !== "all" || kind !== "all" || Boolean(search);
  const s = statusOf(error);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <div className="wm-table-filters">
        <Input size="sm" type="search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("search")} placeholder={t("search")} startIcon={<MagnifyingGlass className="size-4" />} className="wm-search" />
        <Select size="sm" aria-label={t("issues.all")} value={issue} onValueChange={value=>setIssue((value??"all") as IssueTab)} options={ISSUES.map(value=>({value,label:t(`issues.${value}`)}))} />
        <Select size="sm" aria-label={t("kind")} value={kind} onValueChange={(v) => setKind(v ?? "all")} options={["all", "image", "vector", "video"].map((k) => ({ value: k, label: t(`kinds.${k}`) }))} className="w-44" />
      </div>
      {isLoading ? (
        <LoadingState rows={4} />
      ) : s === 403 ? (
        <NoPermissionState />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={<FilmStrip />}
          title={filtered ? t("noMatch") : t("empty")}
          action={
            filtered ? (
              <Button size="sm" variant="secondary" startIcon={<X />} onClick={() => url.set({ issue: null, kind: null, search: null })}>
                {t("clear")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul aria-label={t("title")} aria-busy={isFetching || undefined} className="grid grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))] gap-4">
          {data.items.map((m) => (
            <li key={m.id} className="flex min-w-0 flex-col gap-2">
              <Link
                href={`/media/${m.id}?returnTo=${encodeURIComponent(url.href)}`}
                className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-raised transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span className="relative block aspect-[4/3] bg-sunken">
                  <Thumb m={m} className="absolute inset-0 size-full" />
                  {m.kind === "video" ? <Badge size="sm" className="absolute start-2 top-2">{t("kinds.video")}</Badge> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
                  <span dir="ltr" className="truncate text-start font-mono text-body-sm text-fg">{m.file}</span>
                  <span className="text-caption text-fg-subtle">
                    {f.bytes(m.bytes)}
                    {m.width ? <span dir="ltr"> · {m.width}×{m.height}</span> : null} · {t("usedCount", { count: m.usage })}
                  </span>
                  {m.issues.length ? (
                    <span className="mt-auto flex flex-wrap gap-1 pt-1">
                      {m.issues.map((i) => (
                        <Badge key={i} size="sm" tone={i === "unused" ? "neutral" : "warning"}>{t(`issues.${i}`)}</Badge>
                      ))}
                    </span>
                  ) : (
                    <Badge size="sm" tone="success" className="mt-auto self-start">{t("ready")}</Badge>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data ? <Pagination page={url.page} pageSize={10} total={data.total} onPageChange={page => url.set({ page })} /> : null}

    </div>
  );
}

export default function MediaPage() {
  return (
    <RequirePermission permission="media:view">
      <Library />
    </RequirePermission>
  );
}
