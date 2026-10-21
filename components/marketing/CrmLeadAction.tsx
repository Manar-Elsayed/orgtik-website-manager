"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@orgtik/ui";
import { appUrl, handoffCode, switchWorkspace } from "@orgtik/ui/auth";
import { SOS_API, SOS_URL } from "@/lib/env";
import { getToken } from "@/lib/session";
import { studioAuthority, useStudio } from "@/lib/studio";

type LeadTarget = {
  canOpen: boolean;
  workspaceId: string | null;
  path: string;
  destination: "record" | "list";
  reason: string | null;
};

export function CrmLeadAction({ id }: { id: string }) {
  const t = useTranslations("Leads.crm");
  const target = useStudio<LeadTarget>(
    "/studio/lead-target/" + encodeURIComponent(id),
  );
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const data = target.error ? undefined : target.data;
  const checking = target.loading && !target.data;
  const canOpen = Boolean(data?.canOpen && data.workspaceId);
  const list = data?.destination === "list";
  const unavailable = data && !data.canOpen;
  const message = failed
    ? "openFailed"
    : target.error
      ? "checkFailed"
      : unavailable
        ? data.reason === "orgtik_crm_unavailable"
          ? "unavailable"
          : "accessRequired"
        : list
          ? data?.reason === "crm_record_unavailable"
            ? "recordUnavailable"
            : "notLinked"
          : null;

  async function open() {
    if (!canOpen || !data?.workspaceId || opening) return;
    const token = getToken(),
      authority = studioAuthority();
    setOpening(true);
    setFailed(false);
    try {
      if (!token || !/^\/customers(?:\/[\w-]{1,160})?$/.test(data.path))
        throw new Error("crm_target_unavailable");
      const workspace = await switchWorkspace(SOS_API, token, data.workspaceId);
      const code = await handoffCode(
        SOS_API,
        workspace.tokens.accessToken,
        "suite",
      );
      if (studioAuthority() !== authority || getToken() !== token)
        throw new Error("session_changed");
      const destination = appUrl(SOS_URL, "/auth/handoff");
      destination.searchParams.set("code", code);
      destination.searchParams.set(
        "redirect",
        "/go/sales?" +
          new URLSearchParams({
            workspaceId: data.workspaceId,
            redirect: data.path,
          }),
      );
      window.location.assign(destination.toString());
    } catch {
      setFailed(true);
      setOpening(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:max-w-sm sm:items-end">
      <Button
        variant="secondary"
        startIcon={<ArrowSquareOut />}
        loading={opening || checking}
        disabled={!canOpen || opening}
        onClick={() => void open()}
      >
        {t(list ? "openContacts" : "openRecord")}
      </Button>
      {message ? (
        <p
          role={failed || target.error ? "alert" : "status"}
          className="text-body-sm text-fg-muted sm:text-end"
        >
          {t(message)}
        </p>
      ) : null}
      {target.error ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setFailed(false);
            void target.reload();
          }}
        >
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}
