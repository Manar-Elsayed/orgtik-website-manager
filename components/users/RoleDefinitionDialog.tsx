"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MagnifyingGlass, Trash } from "@phosphor-icons/react";
import { Button, Checkbox, ConfirmDialog, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, toast } from "@orgtik/ui";
import { CAPABILITY_GROUPS, ROLE_ACTIONS } from "@/lib/roleCapabilities";
import { useCreateRoleMutation, useDeleteRoleMutation, useUpdateRoleMutation, type ApiError, type Role } from "@/store/api";

export function RoleDefinitionDialog({ role: initialRole, initialPermissions, initialVersion, lockedPermissions = [], assignedToMe = false, onClose, onSaved, onDeleted }: {
  role?: Role;
  initialPermissions?: string[];
  initialVersion?: string;
  lockedPermissions?: string[];
  assignedToMe?: boolean;
  onClose: () => void;
  onSaved: (role: Role) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("RoleAccess"), ti = useTranslations("Improvements");
  const [role] = useState(initialRole);
  const [version] = useState(initialVersion ?? initialRole?.version ?? "");
  const [name, setName] = useState(role?.label ?? "");
  const [permissions, setPermissions] = useState(initialPermissions ?? role?.permissions ?? []);
  const [search, setSearch] = useState("");
  const [problem, setProblem] = useState("");
  const [create, creating] = useCreateRoleMutation();
  const [update, updating] = useUpdateRoleMutation();
  const [remove, removing] = useDeleteRoleMutation();
  const busy = creating.isLoading || updating.isLoading || removing.isLoading;
  // Owner and Super admin keep someone in charge: the server marks them protected.
  const deleteProtected = Boolean(role?.protected);
  const assignedCount = role?.deleteImpact?.assignedCount ?? role?.assignedCount ?? 0;
  const usersLosingAccess = role?.deleteImpact?.usersLosingAccess ?? 0;
  const includesCurrentUser = role?.deleteImpact?.includesCurrentUser ?? assignedToMe;
  const groupLabel = (key: string) => key === "roles" ? t("title") : key === "structuredData" ? ti("structuredData") : ti(`capabilityGroups.${key}`);
  const groups = CAPABILITY_GROUPS.filter(group => groupLabel(group.key).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const changed = !role || name.trim() !== role.label || [...permissions].sort().join() !== [...role.permissions].sort().join();
  const report = (error: unknown) => {
    const e = error as ApiError;
    setProblem(e.status === 412 ? t("definitionStale") : e.code === "self_lockout" ? ti("selfLockout") : e.code === "invalid_label" ? t("invalidRoleName") : e.code === "protected_role" ? t("deleteProtected", { role: role?.label ?? "" }) : e.code === "role_limit" ? t("roleLimit") : t("roleFailed"));
  };
  const save = async () => {
    setProblem("");
    try {
      const body = {label: name.trim(), permissions};
      const saved = role ? await update({key: role.key, version, ...body}).unwrap() : await create(body).unwrap();
      toast.success(t("roleSaved"));
      onSaved(saved);
    } catch (error) { report(error); }
  };
  const deleteRole = async () => {
    if (!role || deleteProtected || busy) return;
    setProblem("");
    try {
      await remove({key: role.key, version: role.version}).unwrap();
      toast.success(t("roleDeleted"));
      onDeleted();
    } catch (error) { report(error); throw error; }
  };
  return <Dialog open onOpenChange={open => !open && !busy && onClose()}>
    <DialogContent>
      <DialogHeader><DialogTitle>{t(role ? "editRole" : "addRole")}</DialogTitle></DialogHeader>
      <DialogBody className="flex flex-col gap-4 [&>*]:shrink-0">
        <DialogDescription className="text-body-sm">{t("definitionHelp")}</DialogDescription>
        {problem ? <p role="alert" className="text-body-sm text-danger">{problem}</p> : null}
        <Field label={t("roleName")} required>
          <Input required maxLength={100} value={name} disabled={busy} onChange={event => {setName(event.target.value);setProblem("");}} />
        </Field>
        <Input size="sm" type="search" aria-label={t("search")} placeholder={t("search")} startIcon={<MagnifyingGlass className="size-4" />} value={search} onChange={event => setSearch(event.target.value)} />
        <div className="flex flex-col gap-4">
          {groups.map(group => <fieldset key={group.key} disabled={busy} className="min-w-0 border-t border-line pt-3">
            <legend className="pe-2 text-label text-fg">{groupLabel(group.key)}</legend>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {ROLE_ACTIONS.map(action => {
                const permission = group.actions[action];
                return permission ? <Checkbox key={action} label={t(action)} checked={permissions.includes(permission)} disabled={busy || lockedPermissions.includes(permission)} onCheckedChange={checked => {setPermissions(previous => checked ? [...new Set([...previous, permission])] : previous.filter(value => value !== permission));setProblem("");}} /> : null;
              })}
            </div>
          </fieldset>)}
          {!groups.length ? <p role="status" className="text-body-sm text-fg-muted">{ti("noResults")}</p> : null}
        </div>
        {deleteProtected ? <p className="text-body-sm text-fg-muted">{t("deleteProtected", { role: role?.label ?? "" })}</p> : assignedCount > 0 ? <p className="text-body-sm text-fg-muted">{t("assignedRoleHelp", {count: assignedCount})}</p> : null}
      </DialogBody>
      <DialogFooter>
        {role ? <ConfirmDialog title={t("deleteRoleTitle", {role: role.label})} impact={<span className="flex flex-col gap-3"><span>{t("deleteRoleImpact")}</span>{assignedCount > 0 ? <span>{t("assignedRoleHelp", {count: assignedCount})}</span> : null}{usersLosingAccess > 0 ? <span>{t("deleteRoleAccessImpact", {count: usersLosingAccess})}</span> : null}{includesCurrentUser ? <span>{t("deleteOwnRoleImpact")}</span> : null}</span>} confirmLabel={t("deleteRole")} onConfirm={deleteRole} trigger={<Button className="me-auto" variant="danger" startIcon={<Trash />} disabled={busy || deleteProtected}>{t("deleteRole")}</Button>} /> : null}
        <Button variant="secondary" disabled={busy} onClick={onClose}>{t("cancel")}</Button>
        <Button disabled={busy || !name.trim() || !changed} loading={creating.isLoading || updating.isLoading} onClick={save}>{t(role ? "saveChanges" : "addRole")}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
