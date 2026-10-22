"use client";
import { useAuthSuccess, useHandoffSession, SessionRequestError } from "@orgtik/ui/auth";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button, ErrorState, NoPermissionState, Spinner } from "@orgtik/ui";
import { CenteredState } from "@/components/frame/CenteredState";
import { useRouter } from "@/i18n/routing";
import { WM_API, SOS_API } from "@/lib/env";
import { clearToken, getToken, safeLanding, setStaffSession } from "@/lib/session";
type Result = "checking" | "expired" | "forbidden" | "offline";
function Handoff() {
  const t = useTranslations("Auth"), tn = useTranslations("NoAccess"), router = useRouter(), locale = useLocale();
  // Back to the sign-in page (a full load, so nothing of this attempt is kept).
  const toSignIn = () => { clearToken(); window.location.assign(`/${locale}/signed-out`); };
  const { confirm, success } = useAuthSuccess();
  const params = useSearchParams();
  const code = useRef(params.get("code"));
  const rejectedTokenUrl = useRef(params.has("token"));
  const landing = useRef(safeLanding(params.get("redirect")) || "/");
  const { session, error, retry } = useHandoffSession(SOS_API, "staff:wm", code.current);
  const [result, setResult] = useState<Result>("checking"), [attempt, setAttempt] = useState(0);
  const retryAttempt = () => { setResult("checking"); retry(); setAttempt(value => value + 1); };
  // A brief outage (a busy shared store answers 503) gets one quiet retry before the error shows.
  const autoRetried = useRef(false);
  const offline = () => {
    if (autoRetried.current) return setResult("offline");
    autoRetried.current = true;
    setTimeout(retryAttempt, 1000);
  };
  useEffect(() => {
    if (!code.current) { if (!rejectedTokenUrl.current && getToken()) router.replace("/"); else if (!rejectedTokenUrl.current) router.replace("/signed-out"); else setResult("expired"); return; }
    if (error) { if (error.status >= 500) offline(); else setResult(error.status === 403 ? "forbidden" : "expired"); return; }
    if (!session) return;
    if (session.workspaceContext || !session.staffAccess?.apps.includes("wm")) { setResult("forbidden"); return; }
    // The code is single-use and already gone from the address: keep the session now, so leaving or
    // reloading this page doesn't sign you out. A failed check below takes it back.
    setStaffSession(session);
    let live = true;
    fetch(WM_API + "/admin/me", { headers: { Authorization: "Bearer " + session.tokens.accessToken } })
      .then(response => { if (!live) return; if (response.ok) confirm(() => router.replace(landing.current)); else if (response.status >= 500) offline(); else { clearToken(); setResult(response.status === 403 ? "forbidden" : "expired"); } })
      .catch(reason => { if (!live) return; if (reason instanceof SessionRequestError && reason.status === 403) setResult("forbidden"); else offline(); });
    return () => { live = false; };
    // offline() reads refs and stable setters only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, error, attempt, router, confirm]);
  if (success) return success;
  if (result === "checking") {
    return (
      <div className="flex justify-center py-6">
        <Spinner label={t("checking")} />
      </div>
    );
  }
  if (result === "forbidden") return <NoPermissionState size="compact" title={tn("title")} description={tn("body")} action={<Button variant="secondary" onClick={toSignIn}>{tn("switchAccount")}</Button>} />;
  if (result === "offline") return <ErrorState size="compact" title={t("offlineTitle")} description={t("offlineBody")} onRetry={retryAttempt} />;
  return (
    <ErrorState
      size="compact"
      title={t("expiredTitle")}
      description={t("expiredBody")}
      action={<Button onClick={toSignIn}>{t("toOrgtik")}</Button>}
    />
  );
}

export default function AuthPage() {
  return (
    <CenteredState>
      <Suspense>
        <Handoff />
      </Suspense>
    </CenteredState>
  );
}
