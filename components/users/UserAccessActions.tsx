"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, ConfirmDialog, Switch, toast } from "@orgtik/ui";
import { useCan } from "@/lib/permissions";
import { useMeQuery, useUpdateUserMutation, type ApiError, type SuiteUser } from "@/store/api";

function useUserAccess(user: SuiteUser) {
  const t = useTranslations("Improvements"), te = useTranslations("Editor");
  const {data: me} = useMeQuery(), can = useCan();
  const [update, updating] = useUpdateUserMutation();
  const self = me?.user.id === user.id;
  const change = async (patch: {active?: boolean; rolePaused?: boolean}) => {
    try {
      await update({id: user.id, version: user.version, patch}).unwrap();
      toast.success(patch.rolePaused !== undefined ? t(patch.rolePaused ? "roleAccessPaused" : "roleAccessResumed") : te("saved"));
    } catch (error) {
      const e = error as ApiError;
      toast.error(e.status === 412 ? t("accountStatusStale") : e.code === "self_lockout" ? t("selfLockout") : te("saveFailed"));
    }
  };
  return {change, busy: updating.isLoading, self, accounts: Boolean(me?.identity.accounts), allowed: can("users:manage")};
}

export function UserStatusSwitch({user}: {user: SuiteUser}) {
  const t = useTranslations("Improvements"), tc = useTranslations("Confirm"), access = useUserAccess(user);
  // Turning an account off asks first; turning it back on doesn't.
  const [confirming, setConfirming] = useState(false);
  return <div className="flex items-center gap-2">
    <Switch aria-label={`${t("activeAccount")}: ${user.name}`} checked={user.active} disabled={!access.allowed || !access.accounts || access.self || access.busy} aria-busy={access.busy || undefined} onCheckedChange={active => (active ? void access.change({active}) : setConfirming(true))} />
    <ConfirmDialog open={confirming} onOpenChange={setConfirming} tone="danger" title={tc("deactivateTitle", {name: user.name})} impact={tc("deactivateImpact", {name: user.name})} confirmLabel={tc("deactivate")} onConfirm={() => access.change({active: false})} />
    <Badge tone={user.active ? "success" : "neutral"}>{t(user.active ? "active" : "inactive")}</Badge>
  </div>;
}
