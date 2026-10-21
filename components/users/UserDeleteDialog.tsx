"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog, toast } from "@orgtik/ui";
import { useDeleteUserMutation, type ApiError, type SuiteUser } from "@/store/api";

export function UserDeleteDialog({ user, onClose, onDeleted, onStale }: {
  user: SuiteUser;
  onClose: () => void;
  onDeleted: () => void;
  onStale: () => Promise<unknown>;
}) {
  const t = useTranslations("Improvements");
  const [target] = useState(user);
  const [problem, setProblem] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [remove, removing] = useDeleteUserMutation();
  const busy = removing.isLoading || refreshing;

  async function confirm() {
    if (busy) return;
    setProblem("");
    try {
      await remove({ id: target.id, version: target.version }).unwrap();
      toast.success(t("userDeleted"));
      onDeleted();
    } catch (error) {
      const problem = error as ApiError;
      if (problem.status === 404) {
        toast.success(t("userAlreadyDeleted"));
        onDeleted();
        return;
      }
      setProblem(problem.status === 412 ? t("deleteUserStale") : problem.code === "self_lockout" ? t("deleteOwnUserBlocked") : problem.code === "ownership_transfer_required" ? t("deleteUserOwnership") : problem.code === "unpaid_invoices" ? t("deleteUserUnpaid") : problem.code === "active_super_admin_required" ? t("deleteUserLastAdmin") : problem.status === 403 ? t("deleteUserForbidden") : problem.status === 409 ? t("deleteUserProtected") : t("deleteUserFailed"));
      if (problem.status === 412) {
        setRefreshing(true);
        try { await onStale(); }
        catch { /* The directory displays its reload error and prevents stale deletion. */ }
        finally { setRefreshing(false); }
      }
      throw error;
    }
  }

  return <ConfirmDialog
    open
    onOpenChange={open => !open && !busy && onClose()}
    title={t("deleteUserTitle", {name: target.name})}
    impact={<span className="flex flex-col gap-3"><span>{t("deleteUserImpact", {email: target.email})}</span>{problem ? <span role="alert" className="text-danger">{problem}</span> : null}</span>}
    confirmLabel={t("deleteUser")}
    onConfirm={confirm}
  />;
}
