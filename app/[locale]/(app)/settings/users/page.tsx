"use client";
import { RowActionsMenu } from "@/components/content/RowActionsMenu";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  Input,
  MenuItem,
  MenuSeparator,
  PageHeader,
  Select,
} from "@orgtik/ui";
import { Eye, PencilSimple, Trash } from "@phosphor-icons/react";
import { DataTable, type ColumnDef } from "@orgtik/ui/table";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { UserForm } from "@/components/users/UserForm";
import { UserStatusSwitch } from "@/components/users/UserAccessActions";
import { CentralUsersAction } from "@/components/users/CentralUsersAction";
import { UserDeleteDialog } from "@/components/users/UserDeleteDialog";
import { useCan } from "@/lib/permissions";
import { useListState } from "@/lib/useListState";
import {
  useMeQuery,
  useUsersQuery,
  useRolesQuery,
  type SuiteUser,
} from "@/store/api";

function Users() {
  const t = useTranslations("Improvements");
  const tr = useTranslations("Roles");
  const can = useCan();
  const url = useListState();
  const me = useMeQuery();
  const roles = useRolesQuery();
  const roleLabel = (key: string) => {
    const role = roles.data?.find(role => role.key === key);
    return !role?.labelOverridden && tr.has(key) ? tr(key) : role?.label ?? key;
  };
  const query = useUsersQuery({
    search: url.get("search"),
    status: url.get("status"),
    role: url.get("role"),
    page: url.page,
    pageSize: 10,
  });
  const latestUsers = useRef(query);
  latestUsers.current = query;
  const refreshStaleUser = async () => {
    const alreadyFetching = latestUsers.current.isFetching;
    await latestUsers.current.refetch().unwrap();
    // A refetch can join a request started before the stale response. Once that
    // request settles, require a fresh response before permitting a new dialog.
    if (alreadyFetching) await latestUsers.current.refetch().unwrap();
  };
  const [editing, setEditing] = useState<SuiteUser | "new" | null>(null);
  const [viewing, setViewing] = useState<SuiteUser | null>(null);
  const [deleting, setDeleting] = useState<SuiteUser | null>(null);
  const columns: ColumnDef<SuiteUser>[] = [
    {
      id: "name",
      header: t("name"),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <button
            className="text-start font-semibold hover:underline"
            onClick={() => setViewing(row.original)}
          >
            {row.original.name}
          </button>
          <span className="text-caption text-fg-muted">
            {row.original.email}
          </span>
        </div>
      ),
    },
    {
      id: "active",
      header: t("status"),
      cell: ({ row }) => (
        <UserStatusSwitch user={row.original} />
      ),
    },
    {
      id: "roles",
      header: t("websiteRoles"),
      cell: ({ row }) =>
        row.original.roles.length
          ? <span className="inline-flex flex-wrap items-center gap-2"><span>{row.original.roles.map(roleLabel).join(" · ")}</span>{row.original.rolePaused ? <Badge tone="warning">{t("rolePaused")}</Badge> : null}</span>
          : t("noAccess"),
    },
    {
      id: "actions",
      header: t("actions"),
      cell: ({ row }) => (
        <RowActionsMenu target={row.original.name}>
            <MenuItem icon={<Eye />} onClick={() => setViewing(row.original)}>
              {t("view")}
            </MenuItem>
            {can("users:manage") ? (
              <MenuItem
                icon={<PencilSimple />}
                onClick={() => setEditing(row.original)}
              >
                {t("edit")}
              </MenuItem>
            ) : null}
            {can("users:manage") && me.data?.identity.accounts ? <>
              <MenuSeparator />
              <MenuItem icon={<Trash />} tone="danger" disabled={row.original.id === me.data.user.id || query.isFetching || Boolean(query.error)} title={row.original.id === me.data.user.id ? t("deleteOwnUserBlocked") : undefined} onClick={() => setDeleting(row.original)}>
                {t("delete")}
              </MenuItem>
            </> : null}
          </RowActionsMenu>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("userManagement")}
        description={t("userManagementHelp")}
        actions={
          <div className="flex flex-wrap gap-3">
            <CentralUsersAction allowed={Boolean(me.data?.identity.accounts)} />
            {can("users:manage") && me.data?.identity.accounts ? (
              <Button onClick={() => setEditing("new")}>
                {t("newAccount")}
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="wm-table-filters">
        <Input
          className="wm-search"
          aria-label={t("search")}
          placeholder={t("search")}
          value={url.get("search")}
          onChange={(e) => url.set({ search: e.target.value })}
        />
        <Select
          label={t("status")}
          value={url.get("status", "all")}
          onValueChange={(status) => url.set({ status })}
          options={["all", "active", "inactive"].map((value) => ({
            value,
            label: t(value),
          }))}
        />
        <Select
          label={t("rolesFilter")}
          value={url.get("role", "all")}
          onValueChange={(role) => url.set({ role })}
          options={[
            { value: "all", label: t("all") },
            ...(roles.data ?? []).map((role) => ({
              value: role.key,
              label: roleLabel(role.key),
            })),
          ]}
        />
      </div>
      <DataTable
        empty={{ title: t("noResults") }}
        label={t("userManagement")}
        data={query.data?.items ?? []}
        columns={columns.map((column) => ({ ...column, enableSorting: false }))}
        getRowId={(row) => row.key}
        mode="server"
        rowCount={query.data?.total ?? 0}
        pagination={{ pageIndex: url.page - 1, pageSize: 10 }}
        onPaginationChange={(update) =>
          url.set({
            page:
              (typeof update === "function"
                ? update({ pageIndex: url.page - 1, pageSize: 10 })
                : update
              ).pageIndex + 1,
          })
        }
        status={query.isLoading ? "loading" : query.error ? "error" : "ready"}
        onRetry={query.refetch}
      />
      {viewing ? (
        <UserForm user={viewing} readOnly onClose={() => setViewing(null)} />
      ) : null}
      {editing ? (
        <UserForm
          user={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {deleting ? <UserDeleteDialog user={deleting} onStale={refreshStaleUser} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); if ((query.data?.items.length ?? 0) === 1 && url.page > 1) url.set({page: url.page - 1}); }} /> : null}
    </div>
  );
}
export default function UserManagementPage() {
  return (
    <RequirePermission permission="users:view">
      <Users />
    </RequirePermission>
  );
}
