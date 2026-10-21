"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Field,
  Input,
  Switch,
  toast,
} from "@orgtik/ui";
import {
  useMeQuery,
  useRolesQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  type SuiteUser,
  type ApiError,
} from "@/store/api";

export function UserForm({
  user,
  readOnly = false,
  onClose,
}: {
  user?: SuiteUser;
  readOnly?: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("Improvements");
  const tr = useTranslations("Roles");
  const te = useTranslations("Editor");
  const { data: me } = useMeQuery();
  const roleQuery = useRolesQuery();
  const roles = roleQuery.data ?? [];
  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    password: "",
    active: user?.active ?? true,
    roles: user?.roles ?? [],
  });
  const [problem, setProblem] = useState("");
  const [roleProblem, setRoleProblem] = useState(false);
  const [create, creating] = useCreateUserMutation();
  const [update, updating] = useUpdateUserMutation();
  const accounts = Boolean(me?.identity.accounts);
  const busy = creating.isLoading || updating.isLoading;
  const self = Boolean(user && user.id === me?.user.id);
  const rolesUnavailable = roleQuery.isFetching || roleQuery.isError || !roleQuery.data;
  const rolesChanged = !user || form.roles.length !== user.roles.length || form.roles.some(key => !user.roles.includes(key));
  const unavailableRoleSelected = !rolesUnavailable && rolesChanged && form.roles.some(key => !roles.some(role => role.key === key));
  const roleSelectionBlocked = unavailableRoleSelected || (form.roles.length > 0 && rolesChanged && rolesUnavailable);
  const hasLockedRole = form.roles.some(key => roles.some(role => role.key === key && role.protected && !accounts));
  const save = async () => {
    if (readOnly || busy || roleSelectionBlocked) return;
    setProblem("");
    setRoleProblem(false);
    try {
      if (user)
        await update({
          id: user.id,
          version: user.version,
          patch: {
            ...(accounts
              ? {
                  firstName: form.firstName,
                  lastName: form.lastName,
                  email: form.email,
                  active: form.active,
                }
              : {}),
            roles: form.roles,
          },
        }).unwrap();
      else
        await create({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          roles: form.roles,
        }).unwrap();
      toast.success(te("saved"));
      onClose();
    } catch (error) {
      const e = error as ApiError;
      const invalidRoles = e.code === "invalid_roles" || Boolean(e.fieldErrors?.roles);
      if (invalidRoles) setRoleProblem(true);
      setProblem(
        e.status === 412
          ? t("accountStale")
          : e.code === "self_lockout"
            ? t("selfLockout")
            : e.code === "internal_member_required"
              ? t("internalMemberRequired")
              : invalidRoles
                ? ""
                : e.status === 422
                  ? t("accountInvalid")
                  : te("saveFailed"),
      );
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {readOnly ? user?.name : t(user ? "editAccount" : "newAccount")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {problem ? (
            <p role="alert" className="text-danger">
              {problem}
            </p>
          ) : null}
          {!accounts ? (
            <p className="text-body-sm text-fg-muted">
              {t("centralAccountsHelp")}
            </p>
          ) : null}
          {(["firstName", "lastName", "email"] as const).map((key) => (
            <Field key={key} label={t(key)}>
              <Input
                type={key === "email" ? "email" : "text"}
                disabled={readOnly || !accounts || busy}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </Field>
          ))}
          {!user ? (
            <Field label={t("initialPassword")}>
              <Input
                type="password"
                autoComplete="new-password"
                disabled={busy}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
          ) : (
            <label className="flex items-center gap-3">
              <Switch
                checked={form.active}
                disabled={readOnly || !accounts || self || busy}
                onCheckedChange={(active) => setForm({ ...form, active })}
              />
              {t("activeAccount")}
            </label>
          )}
          <Field
            label={t("rolesFilter")}
            description={t("websiteRolesHelp")}
            error={roleProblem || unavailableRoleSelected ? t("userRolesInvalid") : undefined}
            group
          >
            {roleQuery.isFetching ? <p role="status" className="text-body-sm text-fg-muted">{t("userRolesLoading")}</p> : null}
            {roleQuery.isError ? <p role="alert" className="text-body-sm text-danger">{t("userRolesLoadFailed")}</p> : null}
            {roleQuery.isError || roleProblem || unavailableRoleSelected ? <Button className="self-start" variant="link" size="sm" disabled={busy} loading={roleQuery.isFetching} onClick={() => void roleQuery.refetch()}>{t("userRolesRetry")}</Button> : null}
            <div className="grid gap-3 pt-1 sm:grid-cols-2" aria-busy={roleQuery.isFetching || undefined}>
              <Checkbox
                className="sm:col-span-2"
                label={t("noAccess")}
                description={t("noAccessHelp")}
                checked={form.roles.length === 0}
                disabled={readOnly || busy || self || hasLockedRole || Boolean(user && rolesUnavailable)}
                onCheckedChange={checked => {
                  if (checked) {
                    setForm(previous => ({ ...previous, roles: [] }));
                    setRoleProblem(false);
                  }
                }}
              />
              {roles.map((role) => (
                <Checkbox
                  key={role.key}
                  checked={form.roles.includes(role.key)}
                  disabled={readOnly || busy || rolesUnavailable || (role.protected && !accounts) || (self && ["wm_admin", "wm_owner", "wm_super_admin"].includes(role.key) && form.roles.includes(role.key))}
                  onCheckedChange={(checked) => {
                    setRoleProblem(false);
                    setForm(previous => ({
                      ...previous,
                      roles: checked
                        ? [...new Set([...previous.roles, role.key])]
                        : previous.roles.filter((key) => key !== role.key),
                    }));
                  }}
                  label={!role.labelOverridden && tr.has(role.key) ? tr(role.key) : role.label}
                />
              ))}
            </div>
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {te("cancel")}
          </Button>
          {!readOnly ? (
            <Button
              loading={creating.isLoading || updating.isLoading}
              disabled={
                !form.firstName.trim() ||
                !form.lastName.trim() ||
                !form.email.trim() ||
                (!user && form.password.length < 8) ||
                roleSelectionBlocked
              }
              onClick={save}
            >
              {t(user ? "saveChanges" : "newAccount")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
