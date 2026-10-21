"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@orgtik/ui";
import { SessionRequestError, useClientSession } from "@orgtik/ui/auth";
import { canOpenCentralUsers, centralUsersDestination } from "@/lib/centralUsers";
import { SOS_API, SOS_URL } from "@/lib/env";

export function CentralUsersAction({ allowed }: { allowed: boolean }) {
  const t = useTranslations("Improvements");
  const session = useClientSession();
  const pending = useRef(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<"centralUsersFailed" | "centralUsersDenied" | null>(null);

  if (!allowed || !canOpenCentralUsers(session)) return null;

  async function open() {
    if (pending.current) return;
    pending.current = true;
    setOpening(true);
    setError(null);
    try {
      const destination = await centralUsersDestination(SOS_API, SOS_URL);
      window.location.assign(destination);
    } catch (reason) {
      setError(reason instanceof SessionRequestError && reason.status === 403 ? "centralUsersDenied" : "centralUsersFailed");
      setOpening(false);
      pending.current = false;
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:max-w-sm sm:items-end">
      <Button variant="secondary" loading={opening} disabled={opening} onClick={() => void open()}>
        {t("centralUsers")}
      </Button>
      {error ? <p role="alert" className="text-body-sm text-danger sm:text-end">{t(error)}</p> : null}
    </div>
  );
}
