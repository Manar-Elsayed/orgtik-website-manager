// Persisted Strings records use generated section/slot IDs. These labels describe
// their purpose without taking navigation names from the editable website copy.
const tabs: Record<string, Record<string, string>> = {
  st_shared: { b1: "interfaceLabels", repeats: "sharedActions" },
  st_home: { b1: "websiteControls", repeats: "footerNavigation" },
  st_services: { b1: "serviceOverview", b2: "serviceFamilyOverview", b3: "serviceOutputs", b4: "relatedServices", b5: "serviceProcess", repeats: "sharedLabels" },
  st_software: { b1: "softwareOverview", b2: "softwareActions", b3: "softwareWorkflow", b4: "softwarePreviews", repeats: "sharedLabels" },
  st_work: { b1: "projectDetails", b2: "selectedWork", repeats: "sharedLabels" },
  st_about: { b1: "serviceChoices", b2: "contactActions", b3: "studioProfile", repeats: "sharedLabels" },
  st_insights: { b1: "articleNavigation", repeats: "articleLabels" },
  st_contact: { b1: "contactIntroduction", b2: "formFeedback", repeats: "sharedLabels" },
  st_roadmap: { b1: "roadmapStages", b2: "roadmapProgress", b3: "roadmapVoting", b4: "roadmapSharing", repeats: "filterLabels" },
  st_legal: { b1: "legalNavigation" },
  st_signIn: { b1: "workspaceIntroduction", b2: "accountForms", repeats: "sharedActions" },
  st_components: { b1: "storySections", b2: "projectFacts", b3: "auditLabels", b4: "accessibilityLabels" },
  st_commerce: { b1: "cartSummary", b2: "durationChoices", b3: "bundleChoices", b4: "hostingOffers", b5: "packageChoices", b6: "pricingControls", b7: "renewalControls", b8: "checkoutReview", b9: "purchaseStatus", b10: "accountVerification", b11: "checkoutFeedback", b12: "customerDetails", b13: "paymentProgress", b14: "websiteNavigation", b15: "accountMenu", b16: "paymentReadiness", b17: "paymentMethods", b18: "paymentInstructions", b19: "formValidation", b20: "checkoutWarnings", b21: "accountSetup", repeats: "sharedLabels" },
  st_platformPricing: { lines: "offerPaymentStates" },
};

const software: Record<string, string[]> = {
  b1: ["overviewLabel", "requestPrice", "formattedPrice", "productCardSummary", "cardRequestPrice", "cardMonthlyPrice", "productContext", "productPlansButton", "bundleButton", "includedLabel", "configurationBreadcrumb", "configurationIntro", "configurationHeading", "configurationAccent", "configurationDescription", "configurationButton", "softwareIntro", "softwareHeading", "softwareDescription", "planButton", "workflowButton", "planRequestPrice", "planMonthlyPrice"],
  b2: ["savingsNote", "productActionIntro", "productActionHeading", "productActionAccent", "productActionDescription", "productActionButton", "planActionIntro", "planActionHeading", "planActionAccent", "planActionDescription", "planActionButton", "contactActionIntro", "contactActionHeading", "contactActionAccent", "contactActionDescription"],
  b3: ["contextCount", "crmWorkflow", "tasksWorkflow", "filesWorkflow", "hrWorkflow", "marketingWorkflow", "websiteWorkflow"],
  b4: ["highlightHeading", "demoButton", "highlightImageText", "useCasesLabel", "useCasesDescription", "screenshotText"],
  repeats: ["softwareTicker"],
};

const contextLabels: Record<string, string> = {
  eyebrow: "legacyStrings.fields.sectionLabel", apEyebrow: "legacyStrings.fields.sectionLabel", l1: "header", apL1: "header", acc: "headerAccent", apAcc: "headerAccent", accent: "headerAccent",
  body: "description", sub: "subheading", primary: "button1", secondary: "button2", second: "button2", cta: "button", label: "label",
  panelTitle: "title", panelNote: "note", title: "title", root: "websiteLabel", tickerLabel: "websiteLabel", crumb: "menuLink",
  placeholder: "slotPlaceholder", "aria-label": "slotAriaLabel", alt: "slotImageAlt", "submit.error": "legacyStrings.fields.formError",
  doneTitle: "legacyStrings.fields.confirmationHeading", doneBody: "legacyStrings.fields.confirmationDescription", footCompany: "footerLink",
  topics: "topic", theme: "category", countLabel: "legacyStrings.fields.counter", ctxCount: "legacyStrings.fields.counter",
};

export const isLegacyStrings = (id?: string) => Boolean(id?.startsWith("st_") || id === "demo_published_strings");

export function legacyStringSectionLabel(entryId: string, sectionKey: string): string {
  return "legacyStrings.tabs." + (tabs[entryId]?.[sectionKey] ?? "interfaceLabels");
}

export function legacyStringSlotLabel(entryId: string, sectionKey: string, slotKey: string, context = "") {
  const index = /^s([1-9]\d*)$/.exec(slotKey);
  const shared: Record<string, string[]> = { b1: ["websiteManagerLabel", "allFilterLabel", "resultsCount", "searchContext", "showMoreButton", "servicesButton", "manualRenewalLabel"], repeats: ["startProjectButton", "contactButton", "exploreButton"] };
  const fields = entryId === "st_software" ? software : entryId === "st_shared" ? shared : {};
  const field = index ? fields[sectionKey]?.[Number(index[1]) - 1] : undefined;
  if (field) {
    const placement = entryId === "st_shared" ? "sharedLabel" : sectionKey === "b2" ? Number(index![1]) === 1 ? "pricingNote" : Number(index![1]) <= 6 ? "productAction" : Number(index![1]) <= 11 ? "planAction" : "contactAction" : sectionKey === "b3" ? "workflow" : sectionKey === "b4" ? "productPreview" : sectionKey === "repeats" ? "sharedLabel" : "softwareOverview";
    return { label: "legacyStrings.fields." + field, hint: { key: "legacyStrings." + placement } };
  }
  const location = context.split(" · ").at(-1)?.trim() ?? "";
  const leaf = location.split(".").at(-1) ?? "";
  const label = contextLabels[location] ?? contextLabels[leaf] ?? "legacyStrings.fields.interfaceText";
  return { label, hint: { key: "legacyStrings." + (sectionKey === "repeats" || entryId === "st_shared" ? "sharedLabel" : "interfaceText") } };
}
