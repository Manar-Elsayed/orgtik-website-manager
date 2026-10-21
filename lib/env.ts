// Where things live. The backend runs inside this app (app/api/backend), so the APIs default to
// this origin; next.config.ts sets the public addresses at build time (see README.md).
export const WM_API = `${process.env.NEXT_PUBLIC_WM_API_URL ?? "/api/backend/wm"}/v2`;
export const SOS_API = `${process.env.NEXT_PUBLIC_SOS_API_URL ?? "/api/backend/sos"}/api`;
// The standalone app is its own sign-in and "home" (the suite used the SOS hub for both).
export const SOS_URL = process.env.NEXT_PUBLIC_SOS_URL ?? "http://localhost:3007";
export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:4173";

/** A website image by the file name the content stores ("brand-cards.webp"); the site serves them from /assets. */
export const mediaUrl = (src: string) => (/^https?:\/\//.test(src) ? src : `${WEBSITE_URL}/assets/${src.replace(/^\/+/, "")}`);

/** Where a library file is served: an upload from the API, a website file from the website. */
export const libraryUrl = (m: { file: string; url: string | null }) => (m.url ? WM_API.replace(/\/v2$/, "") + m.url : mediaUrl(m.file));
