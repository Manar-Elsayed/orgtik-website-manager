import { appPath, appUrl, handoffCode } from "@orgtik/ui/auth";
import { SOS_API } from "./env";
import { getToken } from "./session";

type PreviewPopup = {
  opener: unknown;
  closed: boolean;
  location: { replace: (url: string) => void };
  close: () => void;
};

function previewRedirect(href: string) {
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/\\"))
    throw new Error("invalid_preview_target");
  const url = new URL(href, "https://wm.invalid");
  if (url.origin !== "https://wm.invalid" || url.pathname !== "/preview")
    throw new Error("invalid_preview_target");
  return url.pathname + url.search + url.hash;
}

/** The new tab exchanges its own one-use code through the existing WM sign-in route. */
export function sectionPreviewAuthUrl(
  origin: string,
  locale: string,
  href: string,
  code: string,
) {
  if (!["en", "ar", "de", "fr", "it"].includes(locale) || !code)
    throw new Error("invalid_preview_handoff");
  const destination = appUrl(origin + appPath("/"), `/${locale}/auth`);
  destination.searchParams.set("code", code);
  destination.searchParams.set("redirect", previewRedirect(href));
  return destination.toString();
}

/** Called directly by a click, before awaiting network work, so popup permissions are retained. */
export async function openSectionPreview({
  href,
  locale,
  origin,
  openWindow,
  token = getToken,
  requestCode = (bearer: string) => handoffCode(SOS_API, bearer, "staff:wm"),
}: {
  href: string;
  locale: string;
  origin: string;
  openWindow: () => PreviewPopup | null;
  token?: () => string | null;
  requestCode?: (bearer: string) => Promise<string>;
}) {
  let popup: PreviewPopup | null = null;
  try {
    popup = openWindow();
    if (!popup) throw new Error("preview_popup_blocked");
    // Do this synchronously while the blank window is still ours, before any navigation or await.
    popup.opener = null;
    previewRedirect(href);
    const before = token();
    if (!before) throw new Error("staff_access_required");
    const code = await requestCode(before);
    if (token() !== before || popup.closed) throw new Error("session_changed");
    popup.location.replace(sectionPreviewAuthUrl(origin, locale, href, code));
  } catch (error) {
    popup?.close();
    throw error;
  }
}
