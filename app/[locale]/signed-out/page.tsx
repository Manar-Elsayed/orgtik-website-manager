"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, Field, Input, PasswordInput } from "@orgtik/ui";
import { SignIn } from "@phosphor-icons/react";
import { CenteredState } from "@/components/frame/CenteredState";
import { signInStaff } from "@/lib/session";

// The standalone Website Manager signs staff in itself (the suite used the SOS sign-in page). It
// takes the same route as before: the identity API issues a one-use code for "staff:wm" and the
// /auth page exchanges it, so the session never travels in the address.
export default function SignedOutPage() {
  const t = useTranslations("Auth"), locale = useLocale();
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null); setPending(true);
    try { window.location.assign(await signInStaff(email, password, locale)); }
    catch (reason) {
      const status = (reason as { status?: number }).status ?? 503;
      setError(status === 401 ? t("invalidCredentials") : status === 403 ? t("noStaffAccess") : t("offlineBody"));
      setPending(false);
    }
  }
  return (
    <CenteredState>
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 py-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-pill bg-brand-subtle text-fg-brand [&_svg]:size-6">
            <SignIn />
          </span>
          <h1 className="font-display text-title text-fg">{t("signInTitle")}</h1>
          <p className="text-body text-fg-muted">{t("signInBody")}</p>
        </div>
        <Field label={t("email")} required>
          <Input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
        </Field>
        <Field label={t("password")} required error={error ?? undefined}>
          <PasswordInput autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
        </Field>
        <Button type="submit" disabled={pending}>{t("signIn")}</Button>
        <p className="text-body-sm text-fg-muted">{t("demoAccount")}</p>
      </form>
    </CenteredState>
  );
}
