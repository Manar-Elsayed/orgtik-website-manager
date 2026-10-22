"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button, Input, PasswordInput } from "@orgtik/ui";
import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useRouter } from "@/i18n/routing";
import { getToken, registerAccount, requestResetCode, resetPassword, safeLanding, signInStaff, SignInError } from "@/lib/session";

// The Website Manager's account page, built like the website's: Sign in and Sign up tabs, a reset
// that runs here (email, then code and new password), and one clear message at a time. Signing in
// still goes through the identity API's one-use code and the /auth page, so the session never
// travels in the address.
type Mode = "signin" | "signup" | "recover" | "reset" | "created";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
// The last email that signed in on this browser, to save typing it again.
const LAST_EMAIL = "wm.last-email";
const remembered = () => { try { return localStorage.getItem(LAST_EMAIL) ?? ""; } catch { return ""; } };
const remember = (email: string) => { try { localStorage.setItem(LAST_EMAIL, email); } catch { /* private mode */ } };

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="text-[13px] font-semibold text-(--ot-color-plum-800)">{children}</label>;
}
// The website's fields: tall, rounded, white.
const FIELD = "h-[54px]! rounded-[14px] bg-white text-[15px]";

function Account() {
  const t = useTranslations("Auth"), locale = useLocale(), router = useRouter();
  const params = useSearchParams();
  const landing = safeLanding(params.get("redirect"));
  const reason = params.get("reason");
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [confirm, setConfirm] = useState(""), [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(reason === "expired" ? t("expiredNotice") : reason === "signed-out" ? t("signedOutNotice") : null);
  const [pending, setPending] = useState(false), [capsLock, setCapsLock] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<"signin" | "signup", HTMLButtonElement | null>>({ signin: null, signup: null });

  // Already signed in: go straight on. Otherwise offer the email used last time.
  useEffect(() => {
    if (getToken()) router.replace(landing || "/");
    else setEmail((value) => value || remembered());
  }, [router, landing]);
  // A new message is announced and brought into view.
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const go = (next: Mode) => { setMode(next); setError(null); setPassword(""); setConfirm(""); setCode(""); if (next !== "signin") setNotice(null); };
  const typing = <T,>(set: (value: T) => void) => (value: T) => { set(value); if (error) setError(null); };
  const caps = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const order = ["signin", "signup"] as const, at = order.indexOf(mode === "signup" ? "signup" : "signin");
    const next = event.key === "ArrowRight" || event.key === "ArrowLeft" ? order[(at + 1) % 2] : event.key === "Home" ? "signin" : event.key === "End" ? "signup" : null;
    if (!next) return;
    event.preventDefault();
    go(next);
    tabRefs.current[next]?.focus();
  };

  // The first problem, in the order the fields appear.
  function check(): string | null {
    if (mode === "signup" && !name.trim()) return t("nameRequired");
    if (!email.trim()) return t("emailRequired");
    if (!EMAIL.test(email.trim())) return t("emailInvalid");
    if (mode === "reset" && !/^\d{6}$/.test(code.trim())) return t("codeRequired");
    if (mode === "signin" && !password) return t("passwordRequired");
    if ((mode === "signup" || mode === "reset") && password.length < MIN_PASSWORD) return t("passwordShort", { count: MIN_PASSWORD });
    if ((mode === "signup" || mode === "reset") && password !== confirm) return t("passwordMismatch");
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = check();
    if (problem) return setError(problem);
    setError(null); setPending(true);
    const address = email.trim().toLowerCase();
    try {
      if (mode === "signin") {
        const href = await signInStaff(address, password, locale, landing);
        remember(address);
        window.location.assign(href);
        return; // the page changes; keep the button busy
      }
      if (mode === "signup") {
        await registerAccount(name.trim(), address, password);
        remember(address);
        go("created");
      } else if (mode === "recover") {
        await requestResetCode(address);
        go("reset");
      } else if (mode === "reset") {
        await resetPassword(address, code.trim(), password);
        go("signin");
        setNotice(t("resetDoneNotice"));
      }
    } catch (reason) {
      const kind = reason instanceof SignInError ? reason.reason : (reason as Error).message;
      setError(
        kind === "credentials" ? t("invalidCredentials")
        : kind === "deactivated" ? t("deactivated")
        : kind === "no_access" ? t("noStaffAccess")
        : kind === "exists" ? t("accountExists")
        : kind === "code" ? t("codeInvalid")
        : t("offlineBody"),
      );
    }
    setPending(false);
  }

  if (mode === "created") {
    return (
      <div role="status" className="flex flex-col items-start gap-4">
        <span aria-hidden="true" className="grid size-12 place-items-center rounded-pill bg-(--ot-color-plum-100) text-(--ot-color-plum-600) [&_svg]:size-6"><CheckCircle weight="fill" /></span>
        <h1 className="font-display text-[clamp(26px,2.21vw,33px)] font-medium tracking-[-0.04em]">{t("createdTitle")}</h1>
        <p className="text-[15px] leading-relaxed text-(--ot-color-mauve-700)">{t("createdBody", { email: email.trim().toLowerCase() })}</p>
        <Button variant="brand" size="lg" className="h-[52px]! w-full justify-between text-[15px]" onClick={() => go("signin")}>{t("backToSignIn")}</Button>
      </div>
    );
  }

  const tabbed = mode === "signin" || mode === "signup";
  const title = { signin: t("signInTitle"), signup: t("signUpTitle"), recover: t("recoverTitle"), reset: t("resetTitle") }[mode];
  const body = { signin: t("signInBody"), signup: t("signUpBody"), recover: t("recoverBody"), reset: t("resetBody", { email: email.trim().toLowerCase() }) }[mode];
  const cta = { signin: t("signIn"), signup: t("createAccount"), recover: t("sendCode"), reset: t("changePassword") }[mode];
  const needsPassword = mode !== "recover";
  const newPassword = mode === "signup" || mode === "reset";

  return (
    <div className="flex flex-col">
      {tabbed ? (
        <div role="tablist" aria-label={t("tabsLabel")} className="mb-[26px] flex gap-1.5 rounded-pill bg-[#190B250d] p-[5px]">
          {(["signin", "signup"] as const).map((tab) => (
            <button
              key={tab}
              ref={(el) => { tabRefs.current[tab] = el; }}
              id={`tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              aria-controls="account-panel"
              tabIndex={mode === tab ? 0 : -1}
              onClick={() => go(tab)}
              onKeyDown={onTabKey}
              className={`min-h-11 flex-1 rounded-pill px-3.5 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ot-color-plum-600) ${mode === tab ? "bg-(--ot-color-plum-950) text-(--ot-color-plum-50)" : "text-(--ot-color-plum-950) hover:bg-[#190B250a]"}`}
            >
              {tab === "signin" ? t("tabSignIn") : t("tabSignUp")}
            </button>
          ))}
        </div>
      ) : null}

      <form id="account-panel" role={tabbed ? "tabpanel" : undefined} aria-labelledby={tabbed ? `tab-${mode}` : undefined} onSubmit={submit} noValidate aria-busy={pending || undefined} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[clamp(26px,2.21vw,33px)] font-medium tracking-[-0.04em]">{title}</h1>
          <p className="text-[15px] leading-relaxed text-(--ot-color-mauve-700)">{body}</p>
        </div>

        {notice ? (
          <p role="status" className="flex items-start gap-2 rounded-[12px] bg-(--ot-color-plum-50) px-3 py-2.5 text-[14px] text-(--ot-color-plum-800)">
            <CheckCircle aria-hidden="true" weight="fill" className="mt-0.5 size-4 shrink-0 text-(--ot-color-plum-600)" />
            {notice}
          </p>
        ) : null}

        <fieldset disabled={pending} className="flex flex-col gap-4">
          {mode === "signup" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-name">{t("name")}</Label>
              <Input id="account-name" className={FIELD} autoComplete="name" placeholder={t("namePlaceholder")} value={name} onChange={(e) => typing(setName)(e.target.value)} />
            </div>
          ) : null}
          {mode !== "reset" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-email">{t("email")}</Label>
              <Input id="account-email" className={FIELD} type="email" inputMode="email" autoComplete={mode === "signup" ? "email" : "username"} placeholder={t("emailPlaceholder")} value={email} onChange={(e) => typing(setEmail)(e.target.value)} />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-code">{t("code")}</Label>
              <Input id="account-code" className={`${FIELD} tracking-[0.3em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(e) => typing(setCode)(e.target.value.replace(/\D/g, ""))} />
            </div>
          )}
          {needsPassword ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-password">{mode === "reset" ? t("newPassword") : t("password")}</Label>
              <PasswordInput id="account-password" className={FIELD} autoComplete={newPassword ? "new-password" : "current-password"} value={password} onKeyDown={caps} onKeyUp={caps} onBlur={() => setCapsLock(false)} onChange={(e) => typing(setPassword)(e.target.value)} />
              {newPassword ? <p className="text-[13px] text-(--ot-color-mauve-700)">{t("passwordHint", { count: MIN_PASSWORD })}</p> : null}
            </div>
          ) : null}
          {newPassword ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-confirm">{t("confirmPassword")}</Label>
              <PasswordInput id="account-confirm" className={FIELD} autoComplete="new-password" value={confirm} onKeyDown={caps} onKeyUp={caps} onBlur={() => setCapsLock(false)} onChange={(e) => typing(setConfirm)(e.target.value)} />
            </div>
          ) : null}
          {capsLock && needsPassword ? (
            <p role="status" className="flex items-center gap-1.5 text-[13px] font-semibold text-(--ot-color-plum-800)">
              <Info aria-hidden="true" className="size-4" />
              {t("capsLock")}
            </p>
          ) : null}
        </fieldset>

        {error ? (
          <div ref={errorRef} tabIndex={-1} role="alert" className="flex items-start gap-2 rounded-[12px] bg-[#A0254414] px-3 py-2.5 text-[14px] font-semibold text-[#8A1F3A] outline-none">
            <WarningCircle aria-hidden="true" weight="fill" className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" variant="brand" size="lg" loading={pending} className="h-[52px]! w-full justify-between text-[15px]">{cta}</Button>

        {mode === "signin" ? (
          <button type="button" onClick={() => go("recover")} className="mx-auto min-h-11 text-[14px] font-semibold text-(--ot-color-plum-600) underline underline-offset-4 hover:text-(--ot-color-plum-800)">{t("resetPassword")}</button>
        ) : !tabbed ? (
          <div className="flex flex-wrap items-center justify-center gap-x-4">
            {mode === "reset" ? <button type="button" disabled={pending} onClick={() => go("recover")} className="min-h-11 text-[14px] font-semibold text-(--ot-color-plum-600) underline underline-offset-4 hover:text-(--ot-color-plum-800)">{t("resendCode")}</button> : null}
            <button type="button" disabled={pending} onClick={() => go("signin")} className="min-h-11 text-[14px] font-semibold text-(--ot-color-plum-600) underline underline-offset-4 hover:text-(--ot-color-plum-800)">{t("backToSignIn")}</button>
          </div>
        ) : null}

        <p className="flex items-start gap-2 text-[13px] leading-normal text-(--ot-color-mauve-700)">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-(--ot-color-plum-600)" />
          {mode === "reset" ? t("demoCode") : mode === "signup" ? t("signUpNote") : t("demoAccount")}
        </p>
      </form>
    </div>
  );
}

export default function SignedOutPage() {
  return (
    <AuthShell>
      <Suspense>
        <Account />
      </Suspense>
    </AuthShell>
  );
}
