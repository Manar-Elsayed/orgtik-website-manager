import {
  appUrl,
  handoffCode,
  readClientSession,
  SessionRequestError,
  staffTargetToken,
  type AuthEnvelope,
} from "@orgtik/ui/auth";

export function canOpenCentralUsers(session: AuthEnvelope | null): boolean {
  return Boolean(
    session &&
      !session.workspaceContext &&
      String(session.staffAccess?.actorUserId) === String(session.user.id) &&
      session.staffAccess?.apps.includes("wm") &&
      session.staffAccess.apps.includes("admin") &&
      session.staffAccess.permissions.admin?.includes("staff:view"),
  );
}

/** Transfer administration through a one-use code without replacing the WM tab's session. */
export async function centralUsersDestination(apiUrl: string, suiteUrl: string): Promise<string> {
  const current = readClientSession();
  if (!current || !canOpenCentralUsers(current))
    throw new SessionRequestError(403, "staff_access_required");
  const unchanged = () => {
    if (readClientSession() !== current)
      throw new SessionRequestError(409, "session_changed");
  };
  const token = await staffTargetToken(apiUrl, current.tokens.accessToken, "admin");
  unchanged();
  const code = await handoffCode(apiUrl, token, "staff:admin");
  unchanged();
  const destination = appUrl(suiteUrl, "/auth/staff");
  destination.searchParams.set("code", code);
  destination.searchParams.set("redirect", "/people");
  return destination.toString();
}
