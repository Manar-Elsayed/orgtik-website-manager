import sectionMap from "./cms-sections.json";

const PAGE_PATHS: Record<string, string> = {
  pg_home: "/",
  pg_services: "/services",
  pg_software: "/software",
  pg_work: "/work",
  pg_about: "/about",
  pg_insights: "/insights",
  pg_contact: "/contact",
  pg_roadmap: "/roadmap",
  pg_legal: "/legal",
  pg_signIn: "/sign-in",
  pg_faq: "/faq",
  pg_partners: "/legal/partners",
  pg_plans: "/plans",
  pg_cart: "/cart",
  pg_checkout: "/checkout",
  pg_signUp: "/sign-up",
};
const LANGUAGES = new Set(["en", "ar", "de", "fr", "it"]);
const LOCALE_PREFIX = /^\/(ar|de|fr|it)(?=\/|$)/;
const ALIASES: Record<string, Record<string, string>> = {
  pg_home: {
    intro: "hero",
    heroWords: "hero",
    homeServices: "services",
    partners: "class:partner-strip",
  },
  pg_services: {
    intro: "hero",
    stories: "families",
    "rotation-words": "hero",
    bundle: "id:svc-builder",
    "ready-made-bundles": "id:service-bundles",
    "department-bundles": "id:plans-section",
  },
  pg_software: {
    intro: "hero",
    context: "workspace",
    flow: "workspace",
    planSteps: "section-1",
    "rotation-words": "hero",
    bundle: "id:plan-builder",
    "ready-made-bundles": "id:software-bundles",
  },
  pg_work: {
    intro: "projects",
    "status-card": "projects",
    "rotation-words": "projects",
  },
  pg_about: {
    intro: "hero",
    journeySteps: "journey",
    capabilityRoutes: "capabilities",
    "rotation-words": "hero",
  },
  pg_insights: { intro: "articles", "rotation-words": "articles" },
  pg_contact: {
    intro: "hero",
    enquiry: "hero",
    paths: "hero",
    topics: "hero",
    "rotation-words": "hero",
  },
  pg_roadmap: { intro: "hero", "section-1": "community" },
  pg_legal: { intro: "hero", legal: "hero" },
  pg_signIn: { intro: "signin" },
  pg_signUp: { intro: "signin", shared: "signin", "shared-copy": "signin" },
  pg_faq: {
    faqs: "questions",
    shared: "questions",
    "shared-copy": "questions",
  },
  pg_partners: { partners: "class:partner-directory" },
};
const DETAILS: Record<string, Record<string, string>> = {
  pg_services: {
    "services-list": "/services",
    "department-bundles": "/services",
  },
  pg_software: {
    capabilities: "/software",
    demo: "/software",
    "section-1": "/software",
    "section-2": "/software",
    planSteps: "/software",
  },
  pg_work: { hero: "/work", gallery: "/work" },
  pg_insights: { article: "/insights", hero: "/insights" },
};

/** Preserve a website-relative address and its query/hash while changing its content language. */
export function localizedPreviewPath(path: string, locale: string) {
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  const url = new URL(safe, "https://preview.invalid");
  const bare = url.pathname.replace(LOCALE_PREFIX, "") || "/";
  url.pathname =
    LANGUAGES.has(locale) && locale !== "en"
      ? `/${locale}${bare === "/" ? "" : bare}`
      : bare;
  return url.pathname + url.search + url.hash;
}

/** Resolve editor child groups to existing website section markers, native anchors or containers. */
export function pagePreviewTarget(pageId: string, key?: string) {
  if (!key || ["seo", "cursor", "section-order"].includes(key))
    return undefined;
  const source = key.split(".")[0];
  if (
    ["pg_plans", "pg_cart"].includes(pageId) &&
    source.startsWith("purchaseControls-")
  ) {
    return source === "purchaseControls-hero"
      ? "class:purchase-overlap__version--current"
      : source === "purchaseControls-section-1"
        ? "class:purchase-overlap__version--new"
        : "class:purchase-dialog--overlap";
  }
  if (pageId === "pg_plans") {
    if (["shared", "shared-copy", "purchasePlans-intro"].includes(source))
      return "class:purchase-directory-intro";
    if (source === "purchaseUI-hero") return "id:service-bundles";
    if (source === "purchaseUI-section-1") return "id:svc-builder";
    if (source === "purchaseUI-plans-section") return "id:plans-section";
    return "id:svc-builder";
  }
  if (pageId === "pg_cart") {
    if (["shared", "shared-copy", "purchaseCart-intro"].includes(source))
      return "class:commerce-intro";
    return "class:purchase-cart-group";
  }
  if (pageId === "pg_checkout") {
    if (["shared", "shared-copy", "purchaseCheckout-intro"].includes(source))
      return "class:commerce-intro";
    if (source === "purchaseCheckout-hero")
      return "class:purchase-confirmation";
    if (source === "purchaseCheckout-section-1")
      return "class:purchase-receipt";
    if (source.startsWith("paymentDetails-"))
      return "class:purchase-payment-details";
    return "class:purchase-checkout-panel";
  }
  let target = ALIASES[pageId]?.[source] ?? source;
  const mapping = (
    sectionMap as Record<string, { groups?: Record<string, string[]> }>
  )[pageId];
  for (const [parent, children] of Object.entries(mapping?.groups ?? {})) {
    if (children.includes(target)) {
      target = parent;
      break;
    }
  }
  return /^(?:id|class):/.test(target) ? target : `cms:${target}`;
}

export function pagePreviewHref({
  pageId,
  section,
  locale,
  path,
}: {
  pageId: string;
  section?: string;
  locale: string;
  path?: string;
}) {
  const source = section?.split(".")[0];
  // These canonical controls are reused by Plans, but their form lives in the Services builder.
  const sharedBuilder =
    pageId === "pg_plans" && source?.startsWith("purchaseUI-");
  const params = new URLSearchParams({
    path: localizedPreviewPath(
      sharedBuilder ? "/services" : path || PAGE_PATHS[pageId] || "/",
      locale,
    ),
    lang: LANGUAGES.has(locale) ? locale : "en",
  });
  const target = pagePreviewTarget(pageId, section);
  if (target) params.set("section", target);
  const detail =
    sharedBuilder && source === "purchaseUI-plans-section"
      ? "/services"
      : DETAILS[pageId]?.[source ?? ""];
  if (detail) params.set("detail", detail);
  return `/preview?${params}`;
}

/** Template-only copy opens a real permitted detail address, never a fabricated slug. */
export function previewDetailPath(
  path: string,
  parent: string | null,
  addresses: { path: string; onSite: boolean }[],
  locale: string,
) {
  if (!parent) return localizedPreviewPath(path, locale);
  const bare =
    new URL(path, "https://preview.invalid").pathname.replace(
      LOCALE_PREFIX,
      "",
    ) || "/";
  if (bare.startsWith(`${parent}/`)) return localizedPreviewPath(path, locale);
  const detail = addresses.find(
    (entry) =>
      entry.onSite &&
      entry.path.startsWith(`${parent}/`) &&
      !entry.path.startsWith(`${parent}/plans/`),
  );
  return localizedPreviewPath(detail?.path ?? path, locale);
}

/** Query parameters belong before the fragment; the token is handed to the frame separately. */
export function websitePreviewUrl(
  base: string,
  path: string,
  {
    locale,
    section,
    preview = true,
  }: { locale: string; section?: string | null; preview?: boolean },
) {
  const url = new URL(localizedPreviewPath(path, locale), base);
  if (preview) url.searchParams.set("preview", "");
  if (section) url.searchParams.set("previewSection", section);
  return url.href;
}
