"use client";
import { RowActionsMenu } from "@/components/content/RowActionsMenu";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowSquareOut, CheckCircle, Eye, Flask, PencilSimple, Plus, Power, Trash, Warning, WarningCircle } from "@phosphor-icons/react";
import {
  MenuSeparator,
  MenuItem,
  Badge,
  Button,
  Card,
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
  useFormatter,
} from "@orgtik/ui";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { SitePublishCard } from "@/components/seo/SitePublishCard";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { useListState } from "@/lib/useListState";
import { useCan } from "@/lib/permissions";
import { WEBSITE_URL } from "@/lib/env";
import { statusOf, useDeleteRedirectMutation, useRedirectsQuery, useSaveRedirectMutation, useTestRedirectMutation, type ApiError, type Redirect, type RedirectProblem, type RedirectStatus, type RedirectTest } from "@/store/api";

type Draft = { id?: string; version?: number; from: string; to: string; code: number; status: RedirectStatus; query: "keep" | "drop" };
type Execution = Redirect["execution"];
const STATUSES: RedirectStatus[] = ["active", "attention", "disabled"];
const STATUS_TONE: Record<RedirectStatus, "success" | "warning" | "neutral"> = { active: "success", attention: "warning", disabled: "neutral" };
const ORIGINS: Redirect["source"][] = ["website", "manager", "address_change", "archived"];
const EXECUTIONS: Execution[] = ["server", "browser", "notDeployed", "configured"];
const EXECUTION_TONE: Record<Execution, "success" | "info" | "warning" | "neutral"> = { server: "success", browser: "info", notDeployed: "warning", configured: "neutral" };
const PAGE_SIZES = [10, 25, 50];

// An address as a link on the website, in a new tab. A wildcard opens the folder it covers;
// a full https:// target opens as it is.
function AddressLink({ path, label, className }: { path: string; label: string; className?: string }) {
  const href = path.startsWith("https://") ? path : `${WEBSITE_URL}${path.replace(/\*$/, "")}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} dir="ltr" className={cn("inline-flex min-w-0 items-center gap-1 break-all font-mono text-body-sm hover:underline focus-visible:outline-2 focus-visible:outline-focus", className)}>
      {path}
      <ArrowSquareOut aria-hidden="true" className="size-3.5 shrink-0 text-fg-subtle" />
    </a>
  );
}

// The checks the server makes, made here first, so a mistake shows before saving.
function checkDraft(d: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  const from = d.from.trim(), to = d.to.trim();
  const norm = (p: string) => (p.length > 1 ? p.split(/[?#]/)[0].replace(/\/+$/, "") : p).toLowerCase();
  if (!from) errors.from = "empty";
  else if (!/^\/[^\s?#]*$/.test(from)) errors.from = "path_format";
  else if (from.includes("*") && !from.endsWith("/*")) errors.from = "wildcard_end";
  if (!to) errors.to = "empty";
  else if (!/^(\/|https:\/\/)\S*$/.test(to)) errors.to = "path_format";
  else if (to.includes("*") && !from.includes("*")) errors.to = "wildcard_unmatched";
  else if (from && norm(from) === norm(to)) errors.to = "same_as_from";
  return errors;
}

function RedirectDialog({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const t = useTranslations("Seo");
  const tr = useTranslations("Seo.redirects");
  const [d, setD] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [save, saving] = useSaveRedirectMutation();
  const local = touched ? checkDraft(d) : {};
  const err = (k: string) => (errors[k] ?? local[k] ? t(`redirectErrors.${errors[k] ?? local[k]}`) : undefined);
  const submit = () => {
    setTouched(true);
    if (Object.keys(checkDraft(d)).length) return;
    setErrors({});
    save({ ...d, from: d.from.trim(), to: d.to.trim() })
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
  const set = (patch: Partial<Draft>) => { setErrors({}); setD({ ...d, ...patch }); };
  return (
    <Dialog open onOpenChange={(o) => !o && !saving.isLoading && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t(initial.id ? "editRedirect" : "addRedirect")}</DialogTitle>
          <DialogDescription>{tr("dialogHelp")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <Field label={tr("colSource")} description={t("fromHelp")} error={err("from")} required>
            <Input dir="ltr" value={d.from} onBlur={() => setTouched(true)} onChange={(e) => set({ from: e.target.value })} placeholder="/old-address" />
          </Field>
          <Field label={tr("colDestination")} description={t("toHelp")} error={err("to")} required>
            <Input dir="ltr" value={d.to} onBlur={() => setTouched(true)} onChange={(e) => set({ to: e.target.value })} placeholder="/new-address" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("colType")} error={err("code")}>
              <Select value={String(d.code)} onValueChange={(v) => v && set({ code: Number(v) })} options={[{ value: "301", label: t("code301") }, { value: "302", label: t("code302") }]} />
            </Field>
            <Field label={tr("colStatus")} error={err("status")}>
              <Select value={d.status} onValueChange={(v) => v && set({ status: v as RedirectStatus })} options={STATUSES.map((value) => ({ value, label: t(`redirectStatus.${value}`) }))} />
            </Field>
          </div>
          <p className="-mt-2 text-caption text-fg-subtle">{t(`redirectStatusHelp.${d.status}`)}</p>
          <Field label={tr("query")} description={tr("queryHelp")} error={err("query")}>
            <Select value={d.query} onValueChange={(v) => v && set({ query: v as Draft["query"] })} options={[{ value: "keep", label: tr("queryKeep") }, { value: "drop", label: tr("queryDrop") }]} />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" disabled={saving.isLoading} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={saving.isLoading} onClick={submit}>
            {t(initial.id ? "save" : "addRedirect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// A test result: what the server should answer, what it did.
function TestResult({ result }: { result: RedirectTest }) {
  const tr = useTranslations("Seo.redirects");
  const f = useFormatter();
  const answer = (x: { status: number; location: string | null }) => (x.location ? `${x.status} → ${x.location}` : `${x.status} · ${tr("noRedirect")}`);
  return (
    <div className="flex flex-col gap-2 text-body-sm">
      <p className={cn("flex items-center gap-2 font-semibold", result.pass ? "text-success" : "text-danger")}>
        {result.pass ? <CheckCircle aria-hidden="true" weight="fill" className="size-4" /> : <WarningCircle aria-hidden="true" weight="fill" className="size-4" />}
        {tr(result.pass ? "testPass" : "testFail")}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-fg-muted">{tr("tested")}</dt>
        <dd dir="ltr" className="break-all font-mono">{result.path}</dd>
        <dt className="text-fg-muted">{tr("expected")}</dt>
        <dd dir="ltr" className="break-all font-mono">{result.disabled ? tr("noRedirectExpected") : answer(result.expected)}</dd>
        <dt className="text-fg-muted">{tr("actual")}</dt>
        <dd dir="ltr" className="break-all font-mono">{answer(result.actual)}</dd>
      </dl>
      {result.handledBy === "browser" ? <p className="text-caption text-fg-subtle">{tr("testBrowserNote")}</p> : null}
      <p className="text-caption text-fg-subtle">{tr("testedAt", { time: f.date(result.at, { dateStyle: "medium", timeStyle: "short" }), name: result.by.name ?? result.by.key })}</p>
    </div>
  );
}

function Redirects() {
  const t = useTranslations("Seo");
  const tr = useTranslations("Seo.redirects");
  const f = useFormatter();
  const can = useCan();
  const ti = useTranslations("Improvements");
  const url = useListState();
  const [viewing, setViewing] = useState<Redirect | null>(null);
  const [deleting, setDeleting] = useState<Redirect | null>(null);
  const [tested, setTested] = useState<{ redirect: Redirect; result: RedirectTest } | null>(null);
  const editable = can("seo:edit");
  const creatable = can("seo:create"), deletable = can("seo:delete");
  const size = PAGE_SIZES.includes(Number(url.get("size"))) ? Number(url.get("size")) : PAGE_SIZES[0];
  const { data, isLoading, error, refetch } = useRedirectsQuery({ search: url.get("search"), kind: url.get("kind"), status: url.get("status"), source: url.get("origin"), execution: url.get("execution"), page: url.page, pageSize: size });
  const [remove] = useDeleteRedirectMutation();
  const [save] = useSaveRedirectMutation();
  const [runTest, testing] = useTestRedirectMutation();
  const [editing, setEditing] = useState<Draft | null>(null);
  const draftOf = (r: Redirect, patch: Partial<Draft> = {}): Draft => ({ id: r.id, version: r.version, from: r.from, to: r.to, code: r.code, status: r.status ?? "active", query: r.query ?? "keep", ...patch });
  const test = (r: Redirect) =>
    runTest(r.id)
      .unwrap()
      .then((result) => setTested({ redirect: r, result }))
      .catch((e: ApiError) => toast.error(tr(e.code === "site_unreachable" || e.code === "site_not_configured" ? "testUnavailable" : "testFailed")));
  const toggle = (r: Redirect) =>
    save(draftOf(r, { status: r.status === "disabled" ? "active" : "disabled" }))
      .unwrap()
      .then(() => toast.success(tr(r.status === "disabled" ? "enabled" : "disabled")))
      .catch((e: ApiError) => toast.error(e.status === 412 ? t("stale") : t("failed")));
  const problemText = (p: RedirectProblem) =>
    tr(`problem.${p.kind}`, { from: p.from ?? p.redirects?.[0]?.from ?? "", to: p.to ?? "", path: (p.path ?? []).join(" → "), suggestion: p.suggestion ?? "" });

  const columns = useMemo<ColumnDef<Redirect, any>[]>(
    () => [
      { id: "from", header: tr("colSource"), cell: ({ row }) => <AddressLink path={row.original.from} label={t("openOnSite", { path: row.original.from })} className="text-fg" /> },
      { id: "to", header: tr("colDestination"), cell: ({ row }) => <AddressLink path={row.original.to} label={t("openOnSite", { path: row.original.to })} className="text-fg-muted" /> },
      { id: "code", header: tr("colType"), meta: { width: "1%" }, cell: ({ row }) => <Badge size="sm">{row.original.code}</Badge> },
      { id: "origin", header: tr("colOrigin"), cell: ({ row }) => <span className="whitespace-nowrap text-fg-muted">{tr(`origin.${row.original.source}`)}</span> },
      {
        id: "status",
        header: tr("colStatus"),
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1">
            <Badge size="sm" tone={STATUS_TONE[row.original.status ?? "active"]} className="whitespace-nowrap">{t(`redirectStatus.${row.original.status ?? "active"}`)}</Badge>
            {row.original.problems.length && row.original.status !== "attention" ? <Badge size="sm" tone="warning" className="whitespace-nowrap" title={row.original.problems.map(problemText).join(" · ")}>{tr("needsAttention")}</Badge> : null}
          </span>
        ),
      },
      {
        id: "execution",
        header: tr("colExecution"),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <span className="flex flex-col gap-0.5">
              <Badge size="sm" tone={EXECUTION_TONE[r.execution]} title={tr(`executionHelp.${r.execution}`)} className="w-fit whitespace-nowrap">{tr(`execution.${r.execution}`)}</Badge>
              {r.lastTest ? (
                <span className={cn("whitespace-nowrap text-caption", r.lastTest.pass ? "text-success" : "text-danger")}>
                  {tr(r.lastTest.pass ? "lastTestPass" : "lastTestFail", { time: f.date(r.lastTest.at, { dateStyle: "short", timeStyle: "short" }) })}
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: ti("actions"),
        meta: { numeric: true, width: "1%" },
        cell: ({ row }) => (
          <RowActionsMenu target={row.original.from}>
            <MenuItem icon={<Eye />} onClick={() => setViewing(row.original)}>{ti("view")}</MenuItem>
            <MenuItem icon={<PencilSimple />} disabled={!editable} onClick={() => setEditing(draftOf(row.original))}>{ti("edit")}</MenuItem>
            <MenuItem icon={<Flask />} disabled={testing.isLoading} onClick={() => test(row.original)}>{tr("test")}</MenuItem>
            <MenuItem icon={<Power />} disabled={!editable} onClick={() => toggle(row.original)}>{tr(row.original.status === "disabled" ? "enable" : "disable")}</MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Trash />} tone="danger" disabled={!deletable} onClick={() => setDeleting(row.original)}>{ti("delete")}</MenuItem>
          </RowActionsMenu>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tr, ti, f, editable, deletable, testing.isLoading],
  );
  const status = isLoading ? "loading" : error ? (statusOf(error) === 403 ? "forbidden" : "error") : "ready";
  const problems = data?.problems ?? [];
  const byId = (id: string) => data?.items.find((r) => r.id === id);
  const filtered = url.get("search") || url.get("kind") || url.get("status") || url.get("origin") || url.get("execution");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("redirectsTitle")}
        description={t("redirectsDescription")}
        actions={creatable ? <Button startIcon={<Plus />} onClick={() => setEditing({ from: "", to: "", code: 301, status: "active", query: "keep" })}>{t("addRedirect")}</Button> : null}
      />
      <SitePublishCard focus="redirects" />
      {/* Problems in the saved redirects and between them and the live site, each with its reason. */}
      {data ? (
        problems.length ? (
          <Card className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 font-display text-title-sm text-fg">
              <Warning aria-hidden="true" className="size-5 text-warning" />
              {tr("problemsTitle", { count: problems.length })}
            </h2>
            <ul className="flex flex-col divide-y divide-line">
              {problems.map((p, i) => {
                const first = p.ids[0];
                const r = first ? byId(first) : undefined;
                return (
                  <li key={`${p.kind}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-body-sm">
                    <span className="min-w-0 flex-1" dir="auto">{problemText(p)}</span>
                    <span className="flex gap-2">
                      {p.kind === "chain" && r && editable ? <Button size="sm" variant="secondary" onClick={() => setEditing(draftOf(r, { to: p.suggestion ?? r.to }))}>{tr("shorten")}</Button> : null}
                      {r ? <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>{tr("open")}</Button> : first ? <Button size="sm" variant="ghost" onClick={() => url.set({ search: p.redirects?.[0]?.from ?? "" })}>{tr("open")}</Button> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : (
          <p role="status" className="flex items-center gap-2 text-body-sm text-success">
            <CheckCircle aria-hidden="true" weight="fill" className="size-4" />
            {tr(data.liveKnown ? "noProblems" : "noProblemsLiveUnknown")}
          </p>
        )
      ) : null}
      <div className="wm-table-filters">
        <Input aria-label={tr("searchLabel")} placeholder={tr("searchLabel")} value={url.get("search")} onChange={(e) => url.set({ search: e.target.value })} className="wm-search" />
        <Select label={tr("colType")} value={url.get("kind", "all")} onValueChange={(kind) => url.set({ kind })} options={[{ value: "all", label: ti("all") }, { value: "301", label: t("code301") }, { value: "302", label: t("code302") }]} />
        <Select label={tr("colStatus")} value={url.get("status", "all")} onValueChange={(status) => url.set({ status })} options={[{ value: "all", label: ti("all") }, ...STATUSES.map((value) => ({ value, label: value === "attention" ? tr("needsAttention") : t(`redirectStatus.${value}`) }))]} />
        <Select label={tr("colOrigin")} value={url.get("origin", "all")} onValueChange={(origin) => url.set({ origin })} options={[{ value: "all", label: ti("all") }, ...ORIGINS.map((value) => ({ value, label: tr(`origin.${value}`) }))]} />
        <Select label={tr("colExecution")} value={url.get("execution", "all")} onValueChange={(execution) => url.set({ execution })} options={[{ value: "all", label: ti("all") }, ...EXECUTIONS.map((value) => ({ value, label: tr(`execution.${value}`) }))]} />
      </div>
      <DataTable
        mode="server"
        rowCount={data?.total ?? 0}
        pagination={{ pageIndex: url.page - 1, pageSize: size }}
        pageSizes={PAGE_SIZES}
        onPaginationChange={(update) => {
          const next = typeof update === "function" ? update({ pageIndex: url.page - 1, pageSize: size }) : update;
          url.set(next.pageSize !== size ? { size: next.pageSize === PAGE_SIZES[0] ? "" : next.pageSize, page: 1 } : { page: next.pageIndex + 1 });
        }}
        label={t("redirectsTitle")}
        columns={columns.map((column) => ({ ...column, enableSorting: false }))}
        data={data?.items ?? []}
        getRowId={(r) => r.id}
        status={status}
        paginate
        onRetry={refetch}
        empty={{ title: t("noRedirects"), description: filtered ? tr("emptyFiltered") : undefined, action: filtered ? <Button size="sm" variant="secondary" onClick={() => url.set({ search: "", kind: "all", status: "all", origin: "all", execution: "all" })}>{tr("clearFilters")}</Button> : undefined }}
      />
      <p className="text-caption text-fg-subtle">{tr("executionLegend")}</p>
      {viewing ? (
        <Dialog open onOpenChange={(open) => !open && setViewing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle dir="ltr">{viewing.from}</DialogTitle>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
                <dt className="text-fg-muted">{tr("colSource")}</dt>
                <dd><AddressLink path={viewing.from} label={t("openOnSite", { path: viewing.from })} /></dd>
                <dt className="text-fg-muted">{tr("colDestination")}</dt>
                <dd><AddressLink path={viewing.to} label={t("openOnSite", { path: viewing.to })} /></dd>
                <dt className="text-fg-muted">{tr("colType")}</dt>
                <dd>{t(viewing.code === 301 ? "code301" : "code302")}</dd>
                <dt className="text-fg-muted">{tr("query")}</dt>
                <dd>{tr(viewing.query === "drop" ? "queryDrop" : "queryKeep")}</dd>
                <dt className="text-fg-muted">{tr("colOrigin")}</dt>
                <dd>{tr(`origin.${viewing.source}`)}</dd>
                <dt className="text-fg-muted">{tr("colStatus")}</dt>
                <dd>{t(`redirectStatus.${viewing.status ?? "active"}`)}</dd>
                <dt className="text-fg-muted">{tr("colExecution")}</dt>
                <dd>{tr(`execution.${viewing.execution}`)} <span className="text-fg-subtle">· {tr(`executionHelp.${viewing.execution}`)}</span></dd>
              </dl>
              {viewing.problems.length ? (
                <section className="flex flex-col gap-1">
                  <h3 className="font-semibold">{tr("problemsHere")}</h3>
                  <ul className="flex list-disc flex-col gap-1 ps-5 text-body-sm">{viewing.problems.map((p, i) => <li key={i} dir="auto">{problemText(p)}</li>)}</ul>
                </section>
              ) : null}
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{tr("lastTest")}</h3>
                  <Button size="sm" variant="secondary" startIcon={<Flask />} loading={testing.isLoading} onClick={() => test(viewing).then(() => setViewing(null))}>{tr("test")}</Button>
                </div>
                {viewing.lastTest ? <TestResult result={viewing.lastTest} /> : <p className="text-body-sm text-fg-muted">{tr("notTested")}</p>}
              </section>
              <section className="flex flex-col gap-1">
                <h3 className="font-semibold">{ti("history")}</h3>
                <ol className="flex flex-col gap-1 text-body-sm">{(viewing.history ?? []).map((event, i) => <li key={i}><time dateTime={event.at}>{f.date(event.at, { dateStyle: "medium", timeStyle: "short" })}</time> · {event.by.name ?? event.by.key} · {tr.has(`action.${event.action}`) ? tr(`action.${event.action}`) : event.action}</li>)}</ol>
              </section>
            </DialogBody>
          </DialogContent>
        </Dialog>
      ) : null}
      {tested ? (
        <Dialog open onOpenChange={(open) => !open && setTested(null)}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>{tr("testTitle", { from: tested.redirect.from })}</DialogTitle>
              <DialogDescription>{tr("testHelp")}</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <TestResult result={tested.result} />
            </DialogBody>
          </DialogContent>
        </Dialog>
      ) : null}
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} tone="danger" title={t("deleteTitle", { from: deleting?.from ?? "" })} impact={deleting?.execution === "server" ? tr("deleteImpactLive") : t("deleteImpact")} confirmLabel={t("delete")} onConfirm={() => (deleting ? remove(deleting.id).unwrap().then(() => toast.success(t("deleted"))) : undefined)} />
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
