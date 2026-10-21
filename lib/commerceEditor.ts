import type { Node } from "./caseStudySchema";
import type { EditorSection } from "./contentTypes";

/** These names describe the rendered purchase journey, never the current editable copy. */
export const ENGLISH_UI = {
  navigation: "Purchasing sections",
  guideTitle: "Find the text on the website",
  guideBody:
    "Choose the screen first, then the section. Some messages appear only after an action, with items in the cart, or after a payment.",
  websiteLocation: "Where this appears",
  preview: "Preview section",
  previewUnavailable: "This state has no direct preview",
  groups: {
    plans: "Plans page",
    selections: "Bundles and plan builder",
    cart: "Cart",
    checkout: "Checkout",
    confirmation: "After payment",
    shared: "Shared purchase controls",
    header: "Website header and account",
    other: "Other purchasing copy",
  },
  screens: {
    plans: "Plans page",
    selections: "Services and Software pages",
    cart: "Cart",
    checkout: "Checkout",
    confirmation: "Payment confirmation",
    shared: "Across the purchase journey",
    header: "Website header",
  },
  sections: {
    directory: "Plans: introduction, filters and packages",
    bundles: "Ready-made bundles",
    builder: "Build your own plan",
    selectionPanels: "Department bundles and hosting",
    cartPage: "Cart page and empty state",
    cartPlan: "Plan in the cart",
    cartEdit: "Edit a plan in the cart",
    billing: "Billing and payment",
    checkoutSummary: "Order review",
    paymentDetails: "Payment details",
    success: "Payment confirmation",
    receipt: "Receipt and purchased items",
    totalsBuilder: "Plan builder, item details and totals",
    controls: "Cart updates and shared dialogs",
    overlapCurrent: "Duplicate items: keep the cart version",
    overlapNew: "Duplicate items: use the new version",
    steps: "Cart and checkout progress",
    footer: "Purchase page footer",
    mobileMenu: "Mobile navigation menu",
    desktopHeader: "Header navigation",
    account: "Sign-in and account menu",
    other: "Additional copy",
  },
  where: {
    directory:
      "Open Plans. These fields appear from the page introduction through the package directory.",
    bundles:
      "Open Services or Software and scroll to Ready-made bundles. The Plans page also uses the bundle cards.",
    builder:
      "Open Services or Software and choose Build your own plan. This is the introduction and the selected-packages panel.",
    selectionPanels:
      "Open a service department page for Department bundle introduction. Individual service and software package pages use Guidance below the packages. Hosting departments show the Hosting handoff instead.",
    cartPage:
      "Open Cart. The introduction is always shown; the remaining cards describe an empty cart, configured plans, warnings and the clear-cart dialog.",
    cartPlan:
      "Add a plan, then open Cart. These labels sit in the heading of each configured plan.",
    cartEdit:
      "In a populated Cart, choose Customize contents on a plan. Updated-package messages appear only for saved plans that need review.",
    billing:
      "Add a plan with a valid duration, then continue from Cart to Checkout. Billing, payment and preview-state controls are in the payment panel.",
    checkoutSummary:
      "At Checkout, the order summary appears beside the payment form. On narrow screens, open Review your order.",
    paymentDetails:
      "At Checkout, choose a card payment method. These fields label the test payment details panel.",
    success:
      "This screen appears after a successful test payment. Its fields describe the result, account access and activation guidance.",
    receipt:
      "After a successful test payment, find Your purchase below the confirmation. Renewal text appears only on items with automatic renewal.",
    totalsBuilder:
      "These reusable components appear in Services and Software plan builders, Cart and Checkout. Each card below names its exact component.",
    controls:
      "These controls appear when selecting durations, removing items, updating the cart or adding a package that overlaps an existing plan.",
    overlapCurrent:
      "Add a package containing an item already in Cart. In the Choose a version dialog, this is the left comparison panel.",
    overlapNew:
      "Add a package containing an item already in Cart. In the Choose a version dialog, this is the right comparison panel.",
    steps:
      "Open Cart or Checkout. The progress indicator is above the page introduction.",
    footer: "Open Plans, Cart or Checkout and scroll to the footer.",
    mobileMenu:
      "On a narrow screen, open Menu in the website header. The project action is also used in the desktop header.",
    desktopHeader:
      "The website header appears on Plans, Cart and Checkout, as well as the rest of the website.",
    account:
      "Use Sign in or My account in the website header. Signed-in text, account actions and the account dialog depend on the visitor’s session.",
    other:
      "Additional fields from the website template are retained here until a specific screen mapping is available.",
  },
  states: {
    cart: "Requires at least one configured plan in Cart. An empty cart shows a different screen.",
    checkout:
      "Requires a valid Cart. Opening Checkout with an empty cart shows the empty-cart screen.",
    confirmation:
      "Shown after a successful test payment. A preview link does not submit a payment or create an order.",
    dialog:
      "Shown only after the action described above. Opening the page does not trigger the dialog.",
    durationDialog:
      "In the plan builder, set individual item durations that differ from the shared duration. Turn shared duration back on and choose a period to open this confirmation.",
    clearDialog:
      "Add at least one plan to Cart, then choose Clear cart. This confirmation appears before any plans are removed.",
    toast:
      "Appears after adding, saving, removing or clearing plans in Cart. It closes automatically after 10 seconds; Undo appears when available.",
    overlap:
      "Add a package containing an item already in Cart. The Choose a version dialog appears before the duplicate item is kept or moved.",
    accountDialog:
      "While signed in, open the account menu and choose My account. This dialog appears only when a customer portal destination is unavailable.",
    assistive: "Announced by screen readers; not visible page text.",
    itemDetails:
      "In a Services or Software plan builder, select an item and turn off shared duration to show its details. These details also appear in populated Cart plans and on individual package pages.",
    renewal:
      "In a plan builder, select an item and turn off shared duration to show its automatic renewal checkbox. The same controls also appear in Cart and on individual package pages.",
    mobile:
      "Only shown on narrow screens or to assistive technology, as indicated by the field labels.",
    conditional:
      "Shown only when the described selection, warning or account state occurs.",
    unused:
      "Retained older copy. The current website template does not display these fields; changing them has no visible effect.",
  },
  cards: {
    introduction: "Page introduction",
    filters: "Package and department filters",
    bundleList: "Ready-made bundle list",
    individual: "Individual package list",
    bottomActions: "Actions below the package list",
    bundleIntro: "Bundle introduction and filters",
    builderIntro: "Plan builder introduction",
    selected: "Selected-packages panel",
    hosting: "Hosting handoff",
    department: "Department bundle introduction",
    packageGuidance: "Guidance below the packages",
    summary: "Order summary and totals",
    summaryA11y: "Total announcement for screen readers",
    mobileBar: "Mobile purchase bar",
    itemDetails: "Package details and pricing",
    renewal: "Automatic renewal sentence",
    selection: "Choose services or software",
    duration: "Shared duration controls",
    durationDialog: "Replace individual durations dialog",
    bundleCards: "Bundle card labels and actions",
    empty: "Empty cart",
    cartIntro: "Cart introduction and back link",
    cartTools: "Cart toolbar and additional items",
    cartWarnings: "Cart storage and migration warnings",
    checkoutAction: "Order summary and checkout guidance",
    clearDialog: "Clear cart dialog",
    planHeading: "Configured plan heading",
    planActions: "Plan editing actions",
    savedTotal: "Total after saving edits",
    migration: "Updated-package review",
    billing: "Billing details",
    payment: "Payment method and actions",
    invalidCart: "Selection needs review",
    simulation: "Test payment and account state controls",
    checkoutSummary: "Desktop order summary",
    mobileSummary: "Mobile order review",
    storage: "Receipt storage warning",
    success: "Successful payment and order reference",
    activation: "Account access and activation",
    receipt: "Receipt table",
    receiptRenewal: "Renewal and savings in the receipt",
    paymentDetails: "Test card payment details",
    durationLabels: "Duration and discount labels",
    remove: "Remove item and close dialog controls",
    toast: "Cart updated notification",
    overlap: "Choose a version dialog",
    comparison: "Version comparison panel",
    progress: "Purchase progress steps",
    footer: "Purchase footer links",
    menu: "Mobile navigation menu",
    header: "Website header",
    accountMenu: "Account menu",
    accountDialog: "Account dialog",
    unused: "Older copy no longer shown",
    additional: "Additional template fields",
  },
} as const;

/** Reusable field vocabulary; the surrounding card supplies the exact website context. */
export const ENGLISH_FIELDS = {
  heading: "Heading",
  introduction: "Introduction",
  shortLabel: "Short label above the heading",
  supportingText: "Supporting text",
  button: "Button label",
  secondaryButton: "Secondary button label",
  link: "Link label",
  screenReader: "Section label for screen readers",
  screenReaderButton: "Button label for screen readers",
  screenReaderImage: "Image description for screen readers",
  screenReaderNavigation: "Navigation label for screen readers",
  screenReaderDialog: "Dialog label for screen readers",
  screenReaderSwitch: "Switch label for screen readers",
  dialogHeading: "Dialog heading",
  action: "Confirm action label",
  cancel: "Cancel action label",
  title: "Panel heading",
  notice: "Notice text",
  services: "Services filter label",
  software: "Software filter label",
  allDepartments: "All departments filter label",
  packageType: "Package type label for screen readers",
  departmentFilter: "Department filter label for screen readers",
  all: "All filter label",
  customPlan: "Build custom plan action",
  hosting: "Continue to hosting action",
  customize: "Customize action",
  total: "Total amount label",
  paymentTerms: "Upfront payment explanation",
  subtotal: "Before savings label",
  savings: "Savings label",
  tax: "Tax label",
  unavailableTax: "Uncalculated tax label",
  monthlyEquivalent: "Text after the monthly equivalent amount",
  accountIncluded: "Included customer account explanation",
  pricingLink: "Explore plans link",
  beforeTotal: "Text before the announced total",
  beforeSavings: "Text before the announced savings",
  missingDuration: "Missing duration warning",
  upfront: "Text after the upfront amount",
  capabilities: "Included capabilities label",
  advertising: "Advertising spend explanation",
  remove: "Remove action label",
  renewal: "Automatic renewal label",
  beforeDuration: "Text before the renewal duration",
  beforePrice: "Text before the renewal amount",
  selectionPrefix: "Heading before services or products",
  clearSelection: "Clear selection action",
  packageExplanation: "Package features explanation",
  afterCount: "Text after the selected item count",
  basePrice: "Text after the monthly base price",
  sharedDuration: "Shared duration heading",
  beforeAppliedDuration: "Dialog text before the selected duration",
  afterAppliedDuration: "Dialog text after the selected duration",
  applyAll: "Apply duration to all action",
  keepDurations: "Keep individual durations action",
  recommended: "Recommended badge",
  save: "Savings prefix",
  chooseIndividually: "Choose items prompt",
  selectedPackages: "Selected packages disclosure",
  noSelection: "No selected packages message",
  combine: "Combine packages link",
  month: "Month abbreviation",
  discount: "Discount prefix",
  dismiss: "Dismiss action label",
  undo: "Undo action label",
  viewCart: "View cart action",
  afterDuplicateCount: "Text after the duplicate item count",
  sameSettings: "Matching duration and renewal explanation",
  included: "Items included with either choice label",
  duplicateExplanation: "Duplicate handling explanation",
  consequence: "Effect of choosing this version",
  keepCurrent: "Keep current cart version action",
  useNew: "Use new version action",
  cartStep: "Cart step label",
  paymentStep: "Payment step label",
  accountStep: "Account step label",
  tagline: "Footer tagline",
  plansLink: "Plans link label",
  contactLink: "Contact link label",
  privacyLink: "Privacy link label",
  back: "Back link label",
  exploreServices: "Explore services action",
  exploreSoftware: "Explore software action",
  storageWarning: "Browser storage warning",
  configuredCount: "Text after the configured plan count",
  autosave: "Automatic save explanation",
  clearCart: "Clear cart action",
  addServices: "Add services action",
  addSoftware: "Add software action",
  unsavedEdits: "Unsaved edits warning",
  invalidSelection: "Incomplete selection warning",
  clearExplanation: "Clear cart explanation",
  keepPlans: "Keep plans action",
  itemsCount: "Text after the item count",
  removePlan: "Remove plan action",
  beforeSavedTotal: "Text before the saved total",
  afterSavedTotal: "Text after the saved total",
  saveChanges: "Save changes action",
  cancelEdits: "Cancel edits action",
  updatedPackage: "Updated package notice",
  confirmPackage: "Confirm updated package action",
  success: "Successful payment status",
  testPayment: "Test payment explanation",
  beforeOrder: "Text before the order reference",
  afterPaidAmount: "Text after the paid amount",
  paymentMethod: "Payment method label",
  continueBrowsing: "Continue browsing action",
  activation: "Software and service activation explanation",
  packageColumn: "Package and duration column",
  paidColumn: "Paid upfront column",
  savingSuffix: "Text after the discount",
  totalPaid: "Total paid label",
  invoices: "Invoice and payment history guidance",
  reviewPrefix: "Text before the order item count",
  reviewCount: "Text after the order item count",
  reviewTotal: "Text after the amount due",
  beforeOrderSaving: "Text before the savings amount",
  afterOrderSaving: "Text after the savings amount",
  editSelection: "Edit selection link",
  signOut: "Sign out action",
  company: "Company details disclosure label",
  paymentLegend: "Payment method group label",
  noCharge: "Test environment notice",
  cancelPayment: "Cancel payment action",
  returnCart: "Return to cart link",
  paymentState: "Payment result selector label",
  paid: "Successful payment option",
  declined: "Declined payment option",
  cancelled: "Cancelled payment option",
  accountState: "Account setup selector label",
  accountReady: "Account ready option",
  accountPending: "Setup pending option",
  accountFailed: "Setup failed option",
  testCard: "Test card instructions",
  exampleCard: "Fill example Visa action",
  project: "Start project action",
  closeMenu: "Close menu label for screen readers",
  openMenu: "Open menu label for screen readers",
  menu: "Menu button label",
  signIn: "Sign in link",
  signedIn: "Signed-in status",
  myAccountLink: "My account link",
  myAccountButton: "My account button",
  language: "Language menu label",
  accountExplanation: "Customer account explanation",
  accountPendingNotice: "Account connection pending notice",
  verifyEmail: "Verify email action",
  continueCRM: "Continue to CRM action",
} as const;

type FieldName = keyof typeof ENGLISH_FIELDS;
type CardName = keyof typeof ENGLISH_UI.cards;
type ScreenName = keyof typeof ENGLISH_UI.screens;
type SectionName = keyof typeof ENGLISH_UI.sections;
type StateName = keyof typeof ENGLISH_UI.states;
type GroupName = keyof typeof ENGLISH_UI.groups;
export type CommerceCardDescriptor = {
  id: string;
  titleKey: string;
  keys: string[];
  labels: Record<string, FieldName>;
  stateKey?: string;
};
export type CommercePresentation = {
  id: string;
  titleKey: string;
  screenKey: string;
  whereKey: string;
  stateKey?: string;
  groups: CommerceCardDescriptor[];
};
export type CommerceCard = {
  id: string;
  titleKey: string;
  node: Node;
  keys: string[];
  stateKey?: string;
};

const card = (
  id: CardName,
  fields: Record<string, FieldName>,
  state?: StateName,
): CommerceCardDescriptor => ({
  id,
  titleKey: `cards.${id}`,
  keys: Object.keys(fields),
  labels: fields,
  ...(state ? { stateKey: `states.${state}` } : {}),
});
const presentation = (
  id: SectionName,
  screen: ScreenName,
  groups: CommerceCardDescriptor[],
  state?: StateName,
): CommercePresentation => ({
  id,
  titleKey: `sections.${id}`,
  screenKey: `screens.${screen}`,
  whereKey: `where.${id}`,
  groups,
  ...(state ? { stateKey: `states.${state}` } : {}),
});

export const COMMERCE_PRESENTATIONS: Record<string, CommercePresentation> = {
  "purchasePlans-intro": presentation("directory", "plans", [
    card("introduction", {
      div: "shortLabel",
      h1: "heading",
      p: "introduction",
      PurchaseAction: "customPlan",
    }),
    card("filters", {
      "div@aria-label": "packageType",
      button: "services",
      "button-2": "software",
      "div@aria-label-2": "departmentFilter",
      "button-3": "allDepartments",
    }),
    card("bundleList", { h2: "heading", "p-2": "supportingText" }),
    card("individual", {
      "div-2": "shortLabel",
      "h2-2": "heading",
      "div-3": "upfront",
      "div-4": "monthlyEquivalent",
      a: "customize",
    }),
    card("bottomActions", {
      "PurchaseAction-2": "customPlan",
      "a-2": "hosting",
    }),
  ]),
  "purchaseUI-hero": presentation("bundles", "selections", [
    card("bundleIntro", {
      "PurchaseHeading@title": "heading",
      PurchaseHeading: "introduction",
      div: "chooseIndividually",
      PurchaseAction: "customPlan",
      "div@aria-label": "departmentFilter",
      button: "all",
    }),
  ]),
  "purchaseUI-section-1": presentation("builder", "selections", [
    card("builderIntro", { PurchaseHeading: "introduction" }),
    card("selected", { summary: "selectedPackages", p: "noSelection" }),
  ]),
  "purchaseUI-plans-section": presentation("selectionPanels", "selections", [
    card("hosting", {
      "PurchaseHeading@title": "heading",
      PurchaseHeading: "introduction",
      PurchaseAction: "hosting",
    }),
    card("department", {
      "PurchaseHeading@title-2": "heading",
      "PurchaseHeading-2": "introduction",
      "PurchaseAction-2": "customPlan",
    }),
    card("packageGuidance", {
      "PurchaseHeading-3": "supportingText",
      a: "combine",
    }),
  ]),
  "purchaseUI-intro": presentation("totalsBuilder", "shared", [
    card("selection", {
      h3: "selectionPrefix",
      "button-2": "clearSelection",
      "p-8": "packageExplanation",
      "div@aria-label": "departmentFilter",
      "button-3": "all",
      "p-9": "afterCount",
      "label-4": "basePrice",
    }),
    card("duration", {
      "h3-2": "sharedDuration",
      "input@aria-label": "screenReaderSwitch",
    }),
    card(
      "durationDialog",
      {
        "PurchaseDialog@title": "dialogHeading",
        "p-10": "beforeAppliedDuration",
        "p-11": "afterAppliedDuration",
        PurchaseAction: "applyAll",
        "PurchaseAction-2": "keepDurations",
      },
      "durationDialog",
    ),
    card(
      "itemDetails",
      {
        "p-6": "missingDuration",
        "div-3": "upfront",
        summary: "capabilities",
        "p-7": "advertising",
        "div-4": "monthlyEquivalent",
        button: "remove",
      },
      "itemDetails",
    ),
    card(
      "renewal",
      {
        label: "renewal",
        "label-2": "beforeDuration",
        "label-3": "beforePrice",
      },
      "renewal",
    ),
    card("bundleCards", {
      "div-5": "recommended",
      "div-6": "upfront",
      "div-7": "monthlyEquivalent",
      "div-8": "save",
      "button-4": "customize",
      "a-2": "customize",
    }),
    card("summary", {
      div: "total",
      "div-2": "paymentTerms",
      dt: "subtotal",
      "dt-2": "savings",
      "dt-3": "tax",
      "p-4": "monthlyEquivalent",
      "p-5": "accountIncluded",
      a: "pricingLink",
    }),
    card("mobileBar", { "aside@aria-label": "screenReader" }, "mobile"),
    card(
      "summaryA11y",
      { "p-2": "beforeTotal", "p-3": "beforeSavings" },
      "assistive",
    ),
    card("unused", { p: "notice", dd: "unavailableTax" }, "unused"),
  ]),
  "purchaseCart-intro": presentation("cartPage", "cart", [
    card("cartIntro", {
      a: "back",
      "div-2": "shortLabel",
      h1: "heading",
      "p-2": "introduction",
    }),
    card("empty", {
      div: "shortLabel",
      h2: "heading",
      p: "introduction",
      PurchaseAction: "exploreServices",
      "PurchaseAction-2": "exploreSoftware",
    }),
    card(
      "cartTools",
      {
        "div-3": "configuredCount",
        "div-4": "autosave",
        "button-2": "clearCart",
        "nav@aria-label": "screenReaderNavigation",
        "PurchaseAction-3": "addServices",
        "PurchaseAction-4": "addSoftware",
      },
      "cart",
    ),
    card(
      "checkoutAction",
      {
        "QuoteSummary@title": "title",
        "PurchaseAction@aria-label": "screenReaderButton",
        "p-4": "unsavedEdits",
        "p-5": "invalidSelection",
      },
      "cart",
    ),
    card(
      "cartWarnings",
      { "p-3": "storageWarning", "a-2": "hosting", button: "dismiss" },
      "conditional",
    ),
    card(
      "clearDialog",
      {
        "PurchaseDialog@title": "dialogHeading",
        "p-6": "clearExplanation",
        "PurchaseAction-5": "clearCart",
        "PurchaseAction-6": "keepPlans",
      },
      "clearDialog",
    ),
  ]),
  "purchaseCart-header": presentation(
    "cartPlan",
    "cart",
    [
      card("planHeading", {
        p: "itemsCount",
        "p-2": "upfront",
        button: "removePlan",
      }),
    ],
    "cart",
  ),
  "purchaseCart-hero": presentation(
    "cartEdit",
    "cart",
    [
      card("planActions", {
        "button-2": "customize",
        PurchaseAction: "saveChanges",
        button: "cancelEdits",
      }),
      card("savedTotal", { p: "beforeSavedTotal", "p-2": "afterSavedTotal" }),
      card(
        "migration",
        { "p-3": "updatedPackage", "PurchaseAction-2": "confirmPackage" },
        "conditional",
      ),
    ],
    "cart",
  ),
  "purchaseCheckout-section-2": presentation(
    "billing",
    "checkout",
    [
      card("billing", { button: "signOut", h2: "heading", summary: "company" }),
      card("payment", {
        legend: "paymentLegend",
        div: "total",
        p: "noCharge",
        "button-2": "cancelPayment",
      }),
      card(
        "invalidCart",
        { "p-2": "invalidSelection", a: "returnCart" },
        "conditional",
      ),
      card("simulation", {
        "summary-2": "title",
        label: "paymentState",
        option: "paid",
        "option-2": "declined",
        "option-3": "cancelled",
        "label-2": "accountState",
        "option-4": "accountReady",
        "option-5": "accountPending",
        "option-6": "accountFailed",
      }),
    ],
    "checkout",
  ),
  "purchaseCheckout-intro": presentation(
    "checkoutSummary",
    "checkout",
    [
      card("checkoutSummary", {
        "QuoteSummary@title": "title",
        "a-2": "editSelection",
      }),
      card(
        "mobileSummary",
        {
          summary: "reviewPrefix",
          "summary-2": "reviewCount",
          "summary-3": "reviewTotal",
          "p-2": "beforeOrderSaving",
          "p-3": "afterOrderSaving",
          a: "editSelection",
        },
        "mobile",
      ),
      card("storage", { p: "storageWarning" }, "conditional"),
      card(
        "unused",
        {
          "PurchaseDialog@title": "dialogHeading",
          PurchaseAction: "verifyEmail",
          "PurchaseAction-2": "continueCRM",
          div: "accountPendingNotice",
        },
        "unused",
      ),
    ],
    "checkout",
  ),
  "paymentDetails-intro": presentation(
    "paymentDetails",
    "checkout",
    [
      card("paymentDetails", {
        legend: "title",
        p: "testCard",
        button: "exampleCard",
      }),
    ],
    "checkout",
  ),
  "purchaseCheckout-hero": presentation(
    "success",
    "confirmation",
    [
      card("success", {
        section: "success",
        p: "testPayment",
        "p-2": "beforeOrder",
        "p-3": "afterPaidAmount",
        "p-4": "paymentMethod",
      }),
      card("activation", {
        h2: "heading",
        button: "continueBrowsing",
        "p-5": "activation",
      }),
    ],
    "confirmation",
  ),
  "purchaseCheckout-section-1": presentation(
    "receipt",
    "confirmation",
    [
      card("receipt", {
        h2: "heading",
        th: "packageColumn",
        "th-2": "paidColumn",
        "th-3": "totalPaid",
        p: "invoices",
      }),
      card("receiptRenewal", {
        td: "beforeDuration",
        "td-2": "beforePrice",
        "td-3": "savingSuffix",
      }),
    ],
    "confirmation",
  ),
  "purchaseControls-intro": presentation("controls", "shared", [
    card("durationLabels", { label: "month", "label-2": "discount" }),
    card("remove", {
      "button@aria-label": "screenReaderButton",
      button: "remove",
    }),
    card(
      "toast",
      {
        "aside@aria-label": "screenReader",
        div: "heading",
        "button-2": "undo",
        a: "viewCart",
        "button@aria-label-2": "screenReaderButton",
      },
      "toast",
    ),
    card(
      "overlap",
      {
        "PurchaseDialog@title": "dialogHeading",
        p: "afterDuplicateCount",
        "p-2": "sameSettings",
        "div-2": "included",
        "p-3": "duplicateExplanation",
        "button-3": "cancel",
      },
      "overlap",
    ),
  ]),
  "purchaseControls-hero": presentation(
    "overlapCurrent",
    "shared",
    [
      card("comparison", {
        "section@aria-label": "screenReader",
        h3: "heading",
        p: "consequence",
        PurchaseAction: "keepCurrent",
      }),
    ],
    "dialog",
  ),
  "purchaseControls-section-1": presentation(
    "overlapNew",
    "shared",
    [
      card("comparison", {
        "section@aria-label": "screenReader",
        h3: "heading",
        p: "consequence",
        PurchaseAction: "useNew",
      }),
    ],
    "dialog",
  ),
  "commerceLayout-intro": presentation("steps", "shared", [
    card("progress", {
      "nav@aria-label": "screenReaderNavigation",
      a: "cartStep",
      nav: "paymentStep",
      "nav-2": "accountStep",
    }),
  ]),
  "commerceLayout-footer": presentation("footer", "shared", [
    card("footer", {
      "img@alt": "screenReaderImage",
      p: "tagline",
      a: "plansLink",
      "a-2": "contactLink",
      "a-3": "privacyLink",
    }),
  ]),
  "siteHeader-intro": presentation(
    "mobileMenu",
    "header",
    [
      card("menu", {
        a: "project",
        "dialog@aria-label": "screenReaderDialog",
        "img@alt": "screenReaderImage",
        "button@aria-label": "closeMenu",
        "nav@aria-label": "screenReaderNavigation",
      }),
    ],
    "mobile",
  ),
  "siteHeader-header": presentation("desktopHeader", "header", [
    card("header", {
      "a@aria-label": "screenReaderButton",
      "img@alt": "screenReaderImage",
      "nav@aria-label": "screenReaderNavigation",
      "button@aria-label": "openMenu",
      button: "menu",
    }),
  ]),
  "accountControl-intro": presentation(
    "account",
    "header",
    [
      card("accountMenu", {
        a: "signIn",
        div: "signedIn",
        "a-2": "myAccountLink",
        button: "myAccountButton",
        "button-2": "signOut",
        "div-2": "language",
        "div@aria-label": "screenReader",
      }),
      card(
        "accountDialog",
        {
          "PurchaseDialog@title": "dialogHeading",
          p: "accountExplanation",
          "p-2": "accountPendingNotice",
          PurchaseAction: "continueBrowsing",
        },
        "accountDialog",
      ),
    ],
    "conditional",
  ),
};

const NAVIGATION: { id: GroupName; keys: string[] }[] = [
  { id: "plans", keys: ["purchasePlans-intro"] },
  {
    id: "selections",
    keys: [
      "purchaseUI-hero",
      "purchaseUI-section-1",
      "purchaseUI-plans-section",
    ],
  },
  {
    id: "cart",
    keys: ["purchaseCart-intro", "purchaseCart-header", "purchaseCart-hero"],
  },
  {
    id: "checkout",
    keys: [
      "purchaseCheckout-section-2",
      "paymentDetails-intro",
      "purchaseCheckout-intro",
    ],
  },
  {
    id: "confirmation",
    keys: ["purchaseCheckout-hero", "purchaseCheckout-section-1"],
  },
  {
    id: "shared",
    keys: [
      "purchaseUI-intro",
      "purchaseControls-intro",
      "purchaseControls-hero",
      "purchaseControls-section-1",
      "commerceLayout-intro",
      "commerceLayout-footer",
    ],
  },
  {
    id: "header",
    keys: ["siteHeader-header", "siteHeader-intro", "accountControl-intro"],
  },
];

export function commercePresentation(section: string): CommercePresentation {
  return COMMERCE_PRESENTATIONS[section] ?? presentation("other", "shared", []);
}

/** Keep runtime sections and their original schema paths, including newly introduced sections. */
export function commerceNavigation(sections: EditorSection[]) {
  const seen = new Set<string>();
  const groups = NAVIGATION.map((group) => ({
    id: group.id,
    titleKey: `groups.${group.id}`,
    sections: group.keys.flatMap((key) => {
      const found = sections.find((section) => section.value === key);
      if (!found || seen.has(key)) return [];
      seen.add(key);
      return [found];
    }),
  })).filter((group) => group.sections.length);
  const remaining = sections.filter((section) => !seen.has(section.value));
  if (remaining.length)
    groups.push({ id: "other", titleKey: "groups.other", sections: remaining });
  return groups;
}

/** Decorate schema copies only: values, storage paths, rich marks and future fields remain intact. */
export function commerceCards(section: EditorSection): CommerceCard[] {
  if (section.node.kind !== "group")
    return [
      {
        id: "additional",
        titleKey: "cards.additional",
        node: section.node,
        keys: [],
      },
    ];
  const fields = section.node.fields;
  const seen = new Set<string>();
  const result: CommerceCard[] = commercePresentation(
    section.value,
  ).groups.flatMap((group) => {
    const keys = group.keys.filter(
      (key) =>
        Object.prototype.hasOwnProperty.call(fields, key) && !seen.has(key),
    );
    if (!keys.length) return [];
    keys.forEach((key) => seen.add(key));
    const selected = Object.fromEntries(
      keys.map((key) => [
        key,
        { ...fields[key], label: `purchasing.${group.labels[key]}` } as Node,
      ]),
    );
    return [
      {
        id: group.id,
        titleKey: group.titleKey,
        keys,
        node: { kind: "group" as const, fields: selected },
        ...(group.stateKey ? { stateKey: group.stateKey } : {}),
      },
    ];
  });
  const remaining = Object.keys(fields).filter((key) => !seen.has(key));
  if (remaining.length)
    result.push({
      id: "additional",
      titleKey: "cards.additional",
      keys: remaining,
      node: {
        kind: "group",
        fields: Object.fromEntries(remaining.map((key) => [key, fields[key]])),
      },
    });
  return result;
}
