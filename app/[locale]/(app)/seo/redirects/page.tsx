"use client";
import { RowActionsMenu } from "@/components/content/RowActionsMenu";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ArrowSquareOut, Eye, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import {
  MenuSeparator,
  MenuItem,
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  PageHeader,
  Select,
  cn,
  toast,
} from "@orgtik/ui";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { SitePublishCard } from "@/components/seo/SitePublishCard";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { useListState } from "@/lib/useListState";
import { useCan } from "@/lib/permissions";
import { WEBSITE_URL } from "@/lib/env";
import { statusOf, useDeleteRedirectMutation, useRedirectsQuery, useSaveRedirectMutation, type ApiError, type Redirect, type RedirectStatus } from "@/store/api";

type Draft = { id?: string; version?: number; from: string; to: string; code: number; status: RedirectStatus };
const STATUSES: RedirectStatus[] = ["active", "attention", "disabled"];
const STATUS_TONE: Record<RedirectStatus, "success" | "warning" | "neutral"> = { active: "success", attention: "warning", disabled: "neutral" };

// An address as a link on the website, in a new tab. A wildcard opens the folder it covers;
// a full https:// target opens as it is.
function AddressLink({ path, label, className }: { path: string; label: string; className?: string }) {
  const href = path.startsWith("https://") ? path : `${WEBSITE_URL}${path.replace(/\*$/, "")}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cn("inline-flex items-center gap-1 hover:underline focus-visible:outline-2 focus-visible:outline-focus", className)}>
      {path}
      <ArrowSquareOut aria-hidden="true" className="size-3.5 shrink-0 text-fg-subtle" />
    </a>
  );
}

function RedirectDialog({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const t = useTranslations("Seo");
  const [d, setD] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [save, saving] = useSaveRedirectMutation();
  const err = (k: string) => (errors[k] ? t(`redirectErrors.${errors[k]}`) : undefined);
  const submit = () => {
    setErrors({});
    save(d)
      .unwrap()
      .then(() => {
        toast.success(t(initial.id ? "redirectSaved" : "redirectAdded"));
        onClose();
      })
      .catch((e: ApiError) => {
        if (e.status === 422 && e.fieldErrors) setErrors(e.fieldErrors);
        else if (e.status === 412) toast.error(t("stale"));
        else toast.error(t("failed"));
      });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !saving.isLoading && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t(initial.id ? "editRedirect" : "addRedirect")}</DialogTitle>
          <DialogDescription>{t("redirectHelp")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <Field label={t("from")} description={t("fromHelp")} error={err("from")}>
            <Input dir="ltr" value={d.from} onChange={(e) => setD({ ...d, from: e.target.value })} placeholder="/old-address" />
          </Field>
          <Field label={t("to")} description={t("toHelp")} error={err("to")}>
            <Input dir="ltr" value={d.to} onChange={(e) => setD({ ...d, to: e.target.value })} placeholder="/new-address" />
          </Field>
          <Field label={t("code")} error={err("code")}>
            <Select value={String(d.code)} onValueChange={(v) => v && setD({ ...d, code: Number(v) })} options={[{ value: "301", label: t("code301") }, { value: "302", label: t("code302") }]} />
          </Field>
          <Field label={t("colStatus")} description={t(`redirectStatusHelp.${d.status}`)} error={err("status")}>
            <Select value={d.status} onValueChange={(v) => v && setD({ ...d, status: v as RedirectStatus })} options={STATUSES.map((value) => ({ value, label: t(`redirectStatus.${value}`) }))} />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" disabled={saving.isLoading} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={saving.isLoading} disabled={!d.from || !d.to} onClick={submit}>
            {t(initial.id ? "save" : "addRedirect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Redirects() {
  const t = useTranslations("Seo");
  const can = useCan();
  const ti = useTranslations("Improvements");
  const url = useListState();
  const [viewing, setViewing] = useState<Redirect | null>(null);
  const [deleting, setDeleting] = useState<Redirect | null>(null);
  const editable = can("seo:edit");
  const creatable = can("seo:create"), deletable = can("seo:delete");
  const { data, isLoading, error, refetch } = useRedirectsQuery({ search: url.get("search"), kind: url.get("kind"), status: url.get("status"), page: url.page, pageSize: 10 });
  const [remove] = useDeleteRedirectMutation();
  const [editing, setEditing] = useState<Draft | null>(null);

  const columns = useMemo<ColumnDef<Redirect, any>[]>(
    () => [
      {
        id: "route",
        header: t("colRoute"),
        cell: ({ row }) => (
          // Addresses read left to right in every language.
          <span dir="ltr" className="inline-flex flex-wrap items-center gap-2 font-mono text-body-sm">
            <AddressLink path={row.original.from} label={t("openOnSite", { path: row.original.from })} className="text-fg" />
            <ArrowRight aria-label={t("to")} className="size-4 text-fg-subtle" />
            <AddressLink path={row.original.to} label={t("openOnSite", { path: row.original.to })} className="text-fg-muted" />
          </span>
        ),
      },
      { id: "code", header: t("code"), cell: ({ row }) => <Badge size="sm">{row.original.code}</Badge> },
      { id: "status", header: t("colStatus"), cell: ({ row }) => <Badge size="sm" tone={STATUS_TONE[row.original.status ?? "active"]} className="whitespace-nowrap">{t(`redirectStatus.${row.original.status ?? "active"}`)}</Badge> },
      {
        id: "source",
        header: t("colSource"),
        cell: ({ row }) => (
          <span className="flex flex-col">
            <span className="text-fg-muted">{t(row.original.source === "website" ? "fromWebsite" : row.original.source === "address_change" ? "fromAddressChange" : "addedHere")}</span>
            {row.original.handledBy === "browser" ? <span className="text-caption text-fg-subtle">{t("handledByBrowser")}</span> : null}
          </span>
        ),
      },
      {
        id: "actions",
        header: ti("actions"),
        meta: { numeric: true },
        cell: ({ row }) => <RowActionsMenu target={row.original.from}>
          <MenuItem icon={<Eye />} onClick={() => setViewing(row.original)}>{ti("view")}</MenuItem>
          <MenuItem icon={<PencilSimple />} disabled={!editable} onClick={() => setEditing({ id: row.original.id, version: row.original.version, from: row.original.from, to: row.original.to, code: row.original.code, status: row.original.status ?? "active" })}>{ti("edit")}</MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Trash />} tone="danger" disabled={!deletable} onClick={() => setDeleting(row.original)}>{ti("delete")}</MenuItem>
        </RowActionsMenu>,
      },
    ],
    [t, ti, editable, deletable],
  );

  const status = isLoading ? "loading" : error ? (statusOf(error) === 403 ? "forbidden" : "error") : "ready";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("redirectsTitle")}
        description={t("redirectsDescription")}
        actions={creatable ? <Button startIcon={<Plus />} onClick={() => setEditing({ from: "", to: "", code: 301, status: "active" })}>{t("addRedirect")}</Button> : null}
      />
      <SitePublishCard focus="redirects" />
      <div className="wm-table-filters">
        <Input aria-label={ti("search")} placeholder={ti("search")} value={url.get("search")} onChange={e => url.set({ search: e.target.value })} className="wm-search" />
        <Select label={ti("kind")} value={url.get("kind", "all")} onValueChange={kind => url.set({ kind })} options={[{ value: "all", label: ti("all") }, { value: "301", label: t("code301") }, { value: "302", label: t("code302") }]} />
        <Select label={t("colStatus")} value={url.get("status", "all")} onValueChange={status => url.set({ status })} options={[{ value: "all", label: ti("all") }, ...STATUSES.map(value => ({ value, label: t(`redirectStatus.${value}`) }))]} />
      </div>
      <DataTable mode="server" rowCount={data?.total ?? 0} pagination={{ pageIndex: url.page - 1, pageSize: 10 }} onPaginationChange={update => url.set({ page: (typeof update === "function" ? update({ pageIndex: url.page - 1, pageSize: 10 }) : update).pageIndex + 1 })} label={t("redirectsTitle")} columns={columns.map(column => ({ ...column, enableSorting: false }))} data={data?.items ?? []} getRowId={(r) => r.id} status={status} paginate onRetry={refetch} empty={{ title: t("noRedirects") }} />
      {viewing ? <Dialog open onOpenChange={open => !open && setViewing(null)}><DialogContent><DialogHeader><DialogTitle dir="ltr">{viewing.from}</DialogTitle></DialogHeader><DialogBody className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-3"><dt>{t("from")}</dt><dd dir="ltr"><AddressLink path={viewing.from} label={t("openOnSite", { path: viewing.from })} /></dd><dt>{t("to")}</dt><dd dir="ltr"><AddressLink path={viewing.to} label={t("openOnSite", { path: viewing.to })} /></dd><dt>{ti("kind")}</dt><dd>{t(viewing.code === 301 ? "code301" : "code302")}</dd><dt>{t("colSource")}</dt><dd>{t(viewing.source === "website" ? "fromWebsite" : viewing.source === "address_change" ? "fromAddressChange" : viewing.source === "archived" ? "fromArchive" : "addedHere")}</dd><dt>{t("colStatus")}</dt><dd>{t(`redirectStatus.${viewing.status ?? "active"}`)}</dd></dl>
        <h3 className="font-semibold">{ti("history")}</h3><ol className="flex flex-col gap-2">{(viewing.history ?? []).map((event, i) => <li key={i}><time>{event.at}</time> · {event.by.name} · {event.action}</li>)}</ol>
      </DialogBody></DialogContent></Dialog> : null}
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={open => !open && setDeleting(null)} title={t("deleteTitle", { from: deleting?.from ?? "" })} impact={t("deleteImpact")} confirmLabel={t("delete")} onConfirm={() => deleting ? remove(deleting.id).unwrap().then(() => toast.success(t("deleted"))) : undefined} />
      {editing ? <RedirectDialog initial={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

export default function RedirectsPage() {
  return (
    <RequirePermission permission="seo:view">
      <Redirects />
    </RequirePermission>
  );
}
