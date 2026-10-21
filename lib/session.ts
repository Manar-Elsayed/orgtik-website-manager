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
/** Signs a staff member in and returns the /auth address that exchanges their one-use code. */
export async function signInStaff(email: string, password: string, locale: string) {
  const login = await sessionRequest<{ tokens: { accessToken: string } }>(SOS_API, "/auth/login", undefined, { email, password });
  const staff = await staffTargetToken(SOS_API, login.tokens.accessToken, STAFF_TARGET);
  const code = await handoffCode(SOS_API, staff, "staff:wm");
  const url = appUrl(SOS_URL, `/${locale}/auth`);
  url.searchParams.set("code", code);
  return url.toString();
}
