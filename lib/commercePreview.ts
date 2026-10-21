import { localizedPreviewPath } from "./pagePreview";

export type CommercePreviewContext = "service" | "software";
export type CommercePreviewState =
  | "always"
  | "selection"
  | "cart"
  | "dialog"
  | "completed"
  | "signed-in"
  | "mobile"
  | "card-payment"
  | "detail";

type Destination = {
  path: string;
  target: string;
  state?: CommercePreviewState;
  detail?: string;
  unavailable?: boolean;
};

// These are existing public routes and containers, not sample orders or fabricated records.
const DESTINATIONS: Record<string, Destination> = {
  "purchaseUI-intro": { path: "/services", target: "id:svc-builder" },
  "purchaseUI-hero": { path: "/services", target: "id:service-bundles" },
  "purchaseUI-section-1": { path: "/services", target: "id:svc-builder" },
  "purchaseUI-plans-section": {
    path: "/services",
    target: "id:plans-section",
    detail: "/services",
    state: "detail",
    // Its hosting, department and individual-item branches need different record kinds.
    // The generic permitted-address picker cannot guarantee which branch it will render.
    unavailable: true,
  },
  "purchaseControls-intro": { path: "/services", target: "id:svc-builder" },
  "purchaseControls-hero": {
    path: "/services",
    target: "class:purchase-overlap__version--current",
    state: "dialog",
  },
  "purchaseControls-section-1": {
    path: "/services",
    target: "class:purchase-overlap__version--new",
    state: "dialog",
  },
  "commerceLayout-intro": { path: "/cart", target: "class:commerce-steps" },
  "commerceLayout-footer": { path: "/plans", target: "class:commerce-footer" },
  "purchasePlans-intro": {
    path: "/plans",
    target: "class:purchase-directory-intro",
  },
  "purchaseCart-intro": { path: "/cart", target: "class:commerce-intro" },
  "purchaseCart-header": {
    path: "/cart",
    target: "class:purchase-cart-group",
    state: "cart",
  },
  "purchaseCart-hero": {
    path: "/cart",
    target: "class:purchase-cart-group",
    state: "cart",
  },
  "purchaseCheckout-intro": {
    path: "/checkout",
    target: "class:purchase-checkout-layout",
    state: "cart",
  },
  "purchaseCheckout-section-2": {
    path: "/checkout",
    target: "class:purchase-checkout-panel",
    state: "cart",
  },
  "purchaseCheckout-hero": {
    path: "/checkout",
    target: "class:purchase-confirmation",
    state: "completed",
  },
  "purchaseCheckout-section-1": {
    path: "/checkout",
    target: "class:purchase-receipt",
    state: "completed",
  },
  "paymentDetails-intro": {
    path: "/checkout",
    target: "class:purchase-payment-details",
    state: "card-payment",
  },
  "siteHeader-intro": { path: "/plans", target: "class:commerce-header" },
  "siteHeader-header": { path: "/plans", target: "class:commerce-header" },
  "accountControl-intro": { path: "/plans", target: "class:commerce-header" },
};

const CARD_DESTINATIONS: Record<
  string,
  Record<string, Partial<Destination>>
> = {
  "purchaseUI-intro": {
    selection: { target: "class:purchase-editor__selection-copy" },
    duration: { target: "class:purchase-editor__duration-copy" },
    durationDialog: { state: "dialog", unavailable: true },
    itemDetails: { target: "class:purchase-lines", state: "selection" },
    renewal: { target: "class:purchase-check", state: "selection" },
    bundleCards: { target: "class:purchase-bundle" },
    summary: { target: "class:purchase-summary" },
    summaryA11y: { target: "class:purchase-summary" },
    mobileBar: { target: "class:purchase-mobile-bar", state: "mobile" },
  },
  "purchaseUI-section-1": {
    selected: { target: "class:purchase-summary-selection" },
  },
  "purchaseUI-plans-section": {
    hosting: { unavailable: true },
  },
  "purchaseControls-intro": {
    durationLabels: { target: "class:purchase-duration" },
    remove: { target: "class:purchase-cart-remove", state: "cart" },
    toast: { target: "class:purchase-toast", state: "dialog" },
    overlap: { target: "class:purchase-dialog--overlap", state: "dialog" },
  },
  "purchasePlans-intro": {
    filters: { target: "class:purchase-browse-toolbar" },
    bundleList: { target: "class:purchase-collection-heading" },
    individual: { target: "class:purchase-individual-heading" },
    bottomActions: { target: "class:purchase-directory-footer" },
  },
  "purchaseCart-intro": {
    empty: { target: "class:purchase-empty" },
    cartTools: { target: "class:purchase-cart-toolbar", state: "cart" },
    checkoutAction: { target: "class:purchase-summary", state: "cart" },
    cartWarnings: { target: "class:purchase-alert", state: "cart" },
    clearDialog: { state: "dialog", unavailable: true },
  },
  "purchaseCart-hero": {
    savedTotal: { target: "class:purchase-draft-actions", state: "selection" },
    migration: { target: "class:purchase-cart-group", state: "cart" },
  },
  "purchaseCheckout-intro": {
    checkoutSummary: { target: "class:purchase-summary" },
    mobileSummary: { target: "class:purchase-mobile-order", state: "mobile" },
    storage: { target: "class:purchase-alert" },
  },
  "purchaseCheckout-section-2": {
    billing: { target: "class:purchase-billing-fields" },
    payment: { target: "class:purchase-payment-methods" },
    invalidCart: { target: "class:purchase-checkout-panel" },
    simulation: { target: "class:purchase-demo-controls" },
  },
  "siteHeader-intro": {
    menu: { target: "class:commerce-mobile-menu", state: "mobile" },
  },
  "accountControl-intro": {
    accountMenu: { target: "class:commerce-header" },
    accountDialog: { state: "signed-in", unavailable: true },
  },
};

function destination(
  section: string,
  cardId?: string,
  context: CommercePreviewContext = "service",
): Destination | undefined {
  const key = section.split(".")[0];
  const source = DESTINATIONS[key];
  if (!source) return undefined;
  const value = { ...source, ...CARD_DESTINATIONS[key]?.[cardId ?? ""] };
  if (cardId === "unused") value.unavailable = true;
  if (context === "software" && value.path === "/services") {
    value.path = "/software";
    if (value.detail === "/services") value.detail = "/software";
    if (value.target === "id:svc-builder") value.target = "id:plan-builder";
    if (value.target === "id:service-bundles")
      value.target = "id:software-bundles";
  }
  return value;
}

/** State-dependent containers remain unavailable until the visitor opens that real state. */
export function commercePreviewState(section: string, cardId?: string) {
  return destination(section, cardId)?.state ?? "always";
}

export function commercePreviewTarget(
  section: string,
  cardId?: string,
  context: CommercePreviewContext = "service",
) {
  return destination(section, cardId, context)?.target;
}

/** Use the normal permitted-address preview and its existing token handoff. Never create cart state. */
export function commercePreviewHref(
  section: string,
  locale: string,
  cardId?: string,
  context: CommercePreviewContext = "service",
) {
  const value = destination(section, cardId, context);
  if (!value || value.unavailable) return undefined;
  const params = new URLSearchParams({
    path: localizedPreviewPath(value.path, locale),
    lang: ["en", "ar", "de", "fr", "it"].includes(locale) ? locale : "en",
    section: value.target,
  });
  if (value.detail) params.set("detail", value.detail);
  return `/preview?${params}`;
}
