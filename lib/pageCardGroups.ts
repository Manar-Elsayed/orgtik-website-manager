/** Visual groups only: every input keeps its original source key and save path. */
export type PageCardGroup = {
  keys: string[];
  intro?: boolean;
  label?: string;
  titleKey?: string;
  titleTag?: string;
};

const intro = (...keys: string[]): PageCardGroup => ({ intro: true, keys });
const named = (titleKey: string, ...keys: string[]): PageCardGroup => ({
  titleKey,
  keys,
});
const labelled = (label: string, ...keys: string[]): PageCardGroup => ({
  label,
  keys,
});
const groupPlans: Record<string, PageCardGroup[]> = {
  "pg_home:two-sides": [
    intro("div", "h2", "p"),
    {
      label: "buildGrow",
      titleKey: "h3",
      keys: [
        "image-slot@placeholder",
        "div-2",
        "div-3",
        "h3",
        "p-2",
        "li",
        "li-2",
        "li-3",
        "li-4",
        "li-5",
      ],
    },
    {
      label: "runBetter",
      titleKey: "h3-2",
      keys: [
        "image-slot@placeholder-2",
        "div-4",
        "div-5",
        "h3-2",
        "p-3",
        "li-6",
        "li-7",
        "li-8",
        "li-9",
        "li-10",
        "li-11",
      ],
    },
  ],
  "pg_home:work": [
    intro("div", "h2", "p", "a"),
    ...[0, 1, 2, 3].map((i) => ({
      titleKey: `div-${i * 2 + 2}`,
      titleTag: "m1",
      keys: [
        i === 0
          ? "image-slot@placeholder"
          : `image-slot@alt${i === 1 ? "" : `-${i}`}`,
        `div-${i * 2 + 2}`,
        `div-${i * 2 + 3}`,
        `h3${i === 0 ? "" : `-${i + 1}`}`,
        `p-${i + 2}`,
      ],
    })),
  ],
  "pg_about:purpose": [
    intro("div", "h2", "p"),
    { label: "purpose", ...named("h3", "image-slot@placeholder", "h3", "p-2") },
    ...[2, 3, 4].map((n, i) => ({
      label: `goal${i + 1}`,
      titleKey: `div-${n}`,
      titleTag: "m2",
      keys: [`div-${n}`],
    })),
  ],
  "pg_contact:enquiry": [
    intro(
      "div",
      "div-2",
      "input@placeholder",
      "input@placeholder-2",
      "input@placeholder-3",
      "input@placeholder-4",
      "textarea@placeholder",
      "button",
      "button-2",
    ),
    named("div-4", "div@aria-label", "div-4"),
    named("div-5", "div-5", "div-6", "div-7", "div-8"),
    named("div-9", "div-9", "div-10"),
    named("div-3", "div-3", "a", "a-2", "a-3", "a-4"),
  ],
  "pg_roadmap:timeline": [
    intro("div", "h2", "p"),
    named("div@aria-label", "div@aria-label"),
    named(
      "select@aria-label",
      "select@aria-label",
      "option",
      "option-2",
      "option-3",
      "option-4",
      "option-5",
      "option-6",
      "option-7",
    ),
    named(
      "input@aria-label",
      "input@aria-label",
      "input@placeholder",
      "button@aria-label",
    ),
    named("div@aria-label-2", "div@aria-label-2"),
    named("div@aria-label-3", "div@aria-label-3"),
    named("div-2", "div-2", "p-2", "button"),
  ],
  "pg_roadmap:community": [
    intro("div", "h2", "p"),
    named("input@aria-label", "input@aria-label", "input@placeholder"),
    named("div-2", "div-2"),
    labelled("note", "div-3"),
  ],
  "pg_roadmap:submit-idea": [
    intro("div", "h2", "p"),
    ...[2, 3, 4].map((n) => ({
      titleKey: `div-${n}`,
      titleTag: "m3",
      keys: [`div-${n}`],
    })),
    named(
      "div-6",
      "div-5",
      "div-6",
      "div-7",
      "div@aria-label",
      "input@placeholder",
      "input@placeholder-2",
      "textarea@placeholder",
      "button",
    ),
    labelled("after", "p-2", "button-2"),
    named("div-8", "div-8", "a", "a-2", "a-3"),
  ],
  "*:signin": [
    intro(
      "div@aria-label",
      "label",
      "input@placeholder",
      "input@placeholder-2",
      "label-2",
      "p",
      "button",
    ),
    named("div", "div", "a", "a-2", "a-3"),
  ],
  "pg_partners:intro": [
    intro("title", "summary", "badge", "linkLabel"),
    labelled(
      "scrollLabel",
      "scrollLabel",
      "previousLabel",
      "nextLabel",
      "pauseLabel",
      "playLabel",
    ),
    labelled(
      "partnerProfiles",
      "profileLabel",
      "websiteLabel",
      "exampleWebsiteLabel",
      "exampleAccountLabel",
      "externalLabel",
    ),
  ],
  "*:purchaseUI-intro": [
    intro(
      "h3",
      "button-2",
      "p-8",
      "div@aria-label",
      "button-3",
      "p-9",
      "label-4",
    ),
    named(
      "div",
      "p",
      "aside@aria-label",
      "div",
      "div-2",
      "p-2",
      "p-3",
      "dt",
      "dt-2",
      "dt-3",
      "dd",
      "p-4",
      "p-5",
      "a",
    ),
    labelled(
      "items",
      "div-3",
      "summary",
      "p-7",
      "div-4",
      "button",
      "label",
      "label-2",
      "label-3",
      "div-5",
      "div-6",
      "div-7",
      "div-8",
      "button-4",
      "a-2",
    ),
    named(
      "h3-2",
      "h3-2",
      "input@aria-label",
      "PurchaseDialog@title",
      "p-10",
      "p-11",
      "PurchaseAction",
      "PurchaseAction-2",
    ),
    labelled("note", "p-6"),
  ],
  "*:purchaseUI-plans-section": [
    named(
      "PurchaseHeading@title",
      "PurchaseHeading@title",
      "PurchaseHeading",
      "PurchaseAction",
    ),
    named(
      "PurchaseHeading@title-2",
      "PurchaseHeading@title-2",
      "PurchaseHeading-2",
      "PurchaseAction-2",
    ),
    labelled("features", "PurchaseHeading-3", "a"),
  ],
  "*:purchasePlans-intro": [
    intro("div", "h1", "p", "PurchaseAction"),
    named(
      "div@aria-label",
      "div@aria-label",
      "button",
      "button-2",
      "div@aria-label-2",
      "button-3",
    ),
    named("h2", "h2", "p-2", "div-2"),
    named("h2-2", "h2-2", "div-3", "div-4", "a", "PurchaseAction-2", "a-2"),
  ],
  "*:purchaseCart-intro": [
    intro(
      "a",
      "PurchaseAction@aria-label",
      "div-2",
      "h1",
      "p-2",
      "p-3",
      "a-2",
      "button",
      "div-3",
      "div-4",
      "button-2",
    ),
    named("h2", "div", "h2", "p", "PurchaseAction", "PurchaseAction-2"),
    named(
      "nav@aria-label",
      "nav@aria-label",
      "PurchaseAction-3",
      "PurchaseAction-4",
    ),
    named("QuoteSummary@title", "QuoteSummary@title", "p-4", "p-5"),
    named(
      "PurchaseDialog@title",
      "PurchaseDialog@title",
      "p-6",
      "PurchaseAction-5",
      "PurchaseAction-6",
    ),
  ],
  "*:purchaseCart-hero": [
    intro("p", "p-2", "PurchaseAction", "button"),
    labelled("packages", "p-3", "PurchaseAction-2", "button-2"),
  ],
  "*:purchaseCheckout-intro": [
    intro(
      "summary",
      "summary-2",
      "summary-3",
      "p-2",
      "p-3",
      "a",
      "QuoteSummary@title",
      "a-2",
    ),
    named(
      "PurchaseDialog@title",
      "PurchaseDialog@title",
      "PurchaseAction",
      "PurchaseAction-2",
      "div",
    ),
    labelled("note", "p"),
  ],
  "*:purchaseCheckout-section-2": [
    intro("button", "h2", "summary"),
    named("legend", "legend", "div", "p", "button-2"),
    labelled("note", "p-2", "a"),
    named(
      "summary-2",
      "summary-2",
      "label",
      "option",
      "option-2",
      "option-3",
      "label-2",
      "option-4",
      "option-5",
      "option-6",
    ),
  ],
  "*:purchaseControls-intro": [
    intro("button@aria-label", "label", "label-2", "button"),
    named(
      "div",
      "aside@aria-label",
      "div",
      "button-2",
      "a",
      "button@aria-label-2",
    ),
    named(
      "PurchaseDialog@title",
      "PurchaseDialog@title",
      "p",
      "p-2",
      "div-2",
      "p-3",
      "button-3",
    ),
  ],
};

/** Assign only real fields, exactly once. Newly added fields remain visible in the first card. */
export function pageCardGroups(
  pageId: string,
  section: string,
  keys: string[],
): PageCardGroup[] {
  const plan = groupPlans[`${pageId}:${section}`] ??
    groupPlans[`*:${section}`] ?? [intro(...keys)];
  const available = new Set(keys);
  const assigned = new Set<string>();
  const groups = plan.map((group) => ({
    ...group,
    keys: group.keys.filter((key) => {
      if (!available.has(key) || assigned.has(key)) return false;
      assigned.add(key);
      return true;
    }),
  }));
  const remaining = keys.filter((key) => !assigned.has(key));
  if (groups.length) groups[0].keys.push(...remaining);
  return groups.filter((group) => group.keys.length);
}
