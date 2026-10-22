"use client";
import { appUrl, clearClientSession, handoffCode, readClientSession, sessionRequest, setClientSession, signOutSession, staffTargetToken, SessionRequestError, type AuthEnvelope } from "@orgtik/ui/auth";
import { SOS_API, SOS_URL } from "./env";
export const STAFF_TARGET = "wm" as const;
export function getToken(): string | null {
  const session = readClientSession();
  return session && !session.workspaceContext && session.staffAccess?.apps.includes(STAFF_TARGET) ? session.tokens.accessToken : null;
}
export function setStaffSession(session: AuthEnvelope) {
  if (session.workspaceContext || !session.staffAccess?.apps.includes(STAFF_TARGET)) throw new SessionRequestError(403, "staff_access_required");
  setClientSession(session);
}
export function clearToken() {
  clearClientSession();
  if (typeof document !== "undefined") document.cookie = "wm.token=; path=/; max-age=0; SameSite=Lax";
}
export async function signOutStaff() {
  const token = getToken();
  if (token) await signOutSession(SOS_API, token);
  clearToken();
}

/** Why a sign-in failed, so the form can say what to do about it. */
export type SignInFailure = "credentials" | "deactivated" | "no_access" | "unavailable";
export class SignInError extends Error {
  constructor(readonly reason: SignInFailure) {
    super(reason);
  }
}
const statusOf = (reason: unknown) => (reason as { status?: number }).status ?? 503;

/** A path inside the Website Manager to return to after signing in, or nothing if it isn't one. */
export function safeLanding(value: string | null | undefined) {
  const path = (value ?? "").replace(/\s/g, "");
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : "";
}

/** Signs a staff member in and returns the /auth address that exchanges their one-use code. */
export async function signInStaff(email: string, password: string, locale: string, landing?: string) {
  let login: { tokens: { accessToken: string } };
  try {
    login = await sessionRequest<{ tokens: { accessToken: string } }>(SOS_API, "/auth/login", undefined, { email, password });
  } catch (reason) {
    // The identity service answers 401 for a wrong email or password and 403 for a turned-off account.
    const status = statusOf(reason);
    throw new SignInError(status === 401 ? "credentials" : status === 403 ? "deactivated" : "unavailable");
  }
  let staff: string;
  try {
    staff = await staffTargetToken(SOS_API, login.tokens.accessToken, STAFF_TARGET);
  } catch (reason) {
    // The account is fine, but it has no Website Manager role.
    throw new SignInError(statusOf(reason) === 403 ? "no_access" : "unavailable");
  }
  const code = await handoffCode(SOS_API, staff, "staff:wm").catch(() => {
    throw new SignInError("unavailable");
  });
  const url = appUrl(SOS_URL, `/${locale}/auth`);
  url.searchParams.set("code", code);
  if (safeLanding(landing)) url.searchParams.set("redirect", safeLanding(landing));
  return url.toString();
}

/** Creates an OrgTik account. Website Manager access is then given by an admin (User Management). */
export async function registerAccount(name: string, email: string, password: string) {
  try {
    await sessionRequest(SOS_API, "/auth/register", undefined, { name, email, password });
  } catch (reason) {
    const status = statusOf(reason);
    throw new Error(status === 409 ? "exists" : status === 400 ? "invalid" : "unavailable");
  }
}

/** Asks for a password reset code. The answer is the same whether or not the email has an account. */
export async function requestResetCode(email: string) {
  try {
    await sessionRequest(SOS_API, "/auth/forgot-password", undefined, { email });
  } catch {
    throw new Error("unavailable");
  }
}

/** Sets a new password with the code from the reset email. */
export async function resetPassword(email: string, otp: string, newPassword: string) {
  try {
    await sessionRequest(SOS_API, "/auth/reset-password", undefined, { email, otp, newPassword });
  } catch (reason) {
    throw new Error(statusOf(reason) === 400 ? "code" : "unavailable");
  }
}
