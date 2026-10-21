"use client";

import { useTranslations } from "next-intl";
import { Badge, Switch, toast } from "@orgtik/ui";
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
  const t = useTranslations("Improvements"), access = useUserAccess(user);
  return <div className="flex items-center gap-2">
    <Switch aria-label={`${t("activeAccount")}: ${user.name}`} checked={user.active} disabled={!access.allowed || !access.accounts || access.self || access.busy} aria-busy={access.busy || undefined} onCheckedChange={active => void access.change({active})} />
    <Badge tone={user.active ? "success" : "neutral"}>{t(user.active ? "active" : "inactive")}</Badge>
  </div>;
}
