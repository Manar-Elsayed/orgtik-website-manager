import type {
  PageFieldPlacement,
  PagePlacementMap,
} from "./pagePlacementTypes";

const field = (
  label: string,
  hint?: string,
  state?: PageFieldPlacement["state"],
): PageFieldPlacement => ({
  label: `shared.${label}`,
  ...(hint ? { hint: `shared.${hint}` } : {}),
  ...(state ? { state } : {}),
});
const copyFields = (
  record: string,
  section: string,
  definitions: Record<string, PageFieldPlacement>,
) =>
  Object.fromEntries(
    Object.entries(definitions).map(([slot, placement]) => [
      `${record}.${section}.${slot}`,
      placement,
    ]),
  );
const caseField = (label: string, assistive = false) =>
  field(label, "caseState", assistive ? "assistive" : "conditional");

/** Verified against makeStore's current layout and the live reference components, not the snapshot alone. */
export const SHARED_PLACEMENTS: PagePlacementMap = {
  gl_header: {
    header: {
      title: "shared.headerTitle",
      where: "shared.headerWhere",
      fields: copyFields("gl_header", "header", {
        "img@alt": field("headerLogo", "legacyHeaderAlt", "assistive"),
        a: field("homeLink", "headerNavigation"),
        "a-2": field("servicesLink", "headerNavigation"),
        "a-3": field("softwareLink", "headerNavigation"),
        "a-4": field("workLink", "headerNavigation"),
        "a-5": field("aboutLink", "headerNavigation"),
        "a-6": field("insightsLink", "headerNavigation"),
        "a-7": field("projectLink", "legacyHeaderAction"),
        "button@aria-label": field("menuAria", "legacyMenu", "assistive"),
        button: field("menuButton", "legacyMenu", "conditional"),
      }),
    },
    menu: {
      title: "shared.menuTitle",
      where: "shared.menuWhere",
      preview: false,
      fields: copyFields("gl_header", "menu.*", {
        label: field("menuItem", "menuList", "conditional"),
        href: field("menuDestination", "menuList", "conditional"),
      }),
    },
  },
  gl_footer: {
    footer: {
      title: "shared.footerTitle",
      where: "shared.footerWhere",
      preview: false,
      fields: copyFields("gl_footer", "footer", {
        "img@alt": field("footerLogo", "footerAlt", "assistive"),
        a: field("backTop"),
        h2: field("footerHeading"),
        p: field("footerDescription"),
        button: field("footerContact"),
        h3: field("exploreHeading", "footerColumnHeading"),
        "h3-2": field("startHeading", "footerColumnHeading"),
        div: field("copyright", "footerCopyright"),
        "a@aria-label": field("footerHomeAria", "footerHomeAlt", "assistive"),
      }),
    },
    explore: {
      title: "shared.exploreTitle",
      where: "shared.footerListsWhere",
      preview: false,
      fields: copyFields("gl_footer", "explore.*", {
        label: field("footerLinkLabel", "footerLists"),
        href: field("footerLinkDestination", "footerLists"),
      }),
    },
    start: {
      title: "shared.startTitle",
      where: "shared.footerListsWhere",
      preview: false,
      fields: copyFields("gl_footer", "start.*", {
        label: field("footerLinkLabel", "footerLists"),
        href: field("footerLinkDestination", "footerLists"),
      }),
    },
  },
  gl_components: {
    "caseStudy-header": {
      title: "shared.caseTitle",
      where: "shared.caseWhere",
      preview: false,
      fields: copyFields("gl_components", "caseStudy-header", {
        p: field("caseEyebrow"),
        "ul@aria-label": field("caseTagsAria", undefined, "assistive"),
      }),
    },
    "caseStudy-intro": {
      title: "shared.caseTemplateTitle",
      where: "shared.caseTemplateWhere",
      preview: false,
      fields: copyFields("gl_components", "caseStudy-intro", {
        p: field("sampleNote", "sampleState", "conditional"),
        figcaption: caseField("designPalette"),
        "figcaption-2": caseField("designTypography"),
        figure: caseField("designSpecimen"),
        li: caseField("designWeightSuffix"),
        "figcaption-3": caseField("designLogoSuite"),
        "img@alt": caseField("designWideAlt", true),
        "img@alt-2": caseField("designStackedAlt", true),
        "img@alt-3": caseField("designMarkAlt", true),
        div: caseField("designCompare"),
        "li-2": caseField("designBeforeAria", true),
        "li-3": caseField("designAfterAria", true),
        "figcaption-4": caseField("devArchitecture", true),
        "figcaption-5": caseField("devConnect", true),
        "figcaption-6": caseField("devProvide", true),
        code: caseField("devCore"),
        "code-2": caseField("devStack"),
        "div-2": caseField("marketingWeekPrefix"),
        "div-3": caseField("marketingWeekRange"),
        "li-4": caseField("marketingBefore"),
        "figcaption-7": caseField("marketingBaseline"),
        "figcaption-8": caseField("marketingCampaign"),
        "figcaption-9": caseField("marketingFunnel"),
        "li-5": caseField("marketingPercent"),
        "figcaption-10": caseField("marketingChannels"),
        "div-4": caseField("supportLog"),
        "div-5": caseField("supportTicketSuffix"),
        "li-6": caseField("supportResponse"),
        "div-6": caseField("supportBefore"),
        "div-7": caseField("supportAfter"),
        "code-3": caseField("hostingRunbook"),
        "div-8": caseField("hostingStatus"),
        "figcaption-11": caseField("hostingBefore"),
        "figcaption-12": caseField("hostingAfter"),
        text: caseField("hostingSeconds"),
        "text-2": caseField("hostingCutover"),
      }),
    },
    "caseStudy-story": {
      title: "shared.caseHighlightTitle",
      where: "shared.caseHighlightWhere",
      preview: false,
      fields: copyFields("gl_components", "caseStudy-story", {
        div: caseField("highlightLabel"),
        "div-2": field("highlightSample", "sampleState", "conditional"),
      }),
    },
    "serviceWork-service-work": {
      title: "shared.relatedWorkTitle",
      where: "shared.relatedWorkWhere",
      preview: false,
      fields: copyFields("gl_components", "serviceWork-service-work", {
        p: field("relatedEyebrow", "relatedState", "conditional"),
        h2: field("relatedHeading", "relatedState", "conditional"),
        "p-2": field("relatedPrefix", "relatedSentence", "conditional"),
        "p-3": field("relatedConnector", "relatedSentence", "conditional"),
        "p-4": field("relatedSuffix", "relatedSentence", "conditional"),
        div: field("relatedProjectLink", "relatedState", "conditional"),
        a: field("relatedAllLink", "relatedState", "conditional"),
      }),
    },
  },
  gl_socials: {
    networks: {
      title: "shared.socialTitle",
      where: "shared.socialWhere",
      preview: false,
      fields: copyFields("gl_socials", "networks.*", {
        name: field("socialName", "socialTooltip"),
        icon: field("socialIcon", "socialClass"),
      }),
    },
  },
  gl_process: {
    steps: {
      title: "shared.processTitle",
      where: "shared.processWhere",
      preview: false,
      fields: copyFields("gl_process", "steps.*", {
        name: field("stepName"),
        title: field("stepHeading"),
        body: field("stepBody"),
      }),
    },
  },
};

export const SHARED_COPY: Record<string, string> = {
  "shared.headerTitle": "Website header · Navigation labels",
  "shared.headerWhere":
    "At the top of Home, Services, Software, Work, About, Insights, Contact, Legal and Sign-in. The six navigation labels also appear in the shared header on FAQ, Roadmap, Plans, Cart and Checkout. Logo, Menu and project-button text in that shared header is edited in Global → Purchasing content.",
  "shared.menuTitle": "Mobile menu · Home and Sign-in links",
  "shared.menuWhere":
    "On a narrow Home or Sign-in screen, open Menu. This list sets those menu links and their order. Other page menus currently use separate template links; changing this list does not change them.",
  "shared.footerTitle": "Website footer · Contact and navigation",
  "shared.footerWhere":
    "Scroll to the bottom of a main website page or FAQ. These fields edit the footer invitation, column headings and copyright. Plans, Cart and Checkout use the separate footer in Global → Purchasing content. The Explore and Start here lists below affect Home, Sign-in and FAQ; other templates currently keep their own lists.",
  "shared.exploreTitle": "Footer · Explore links",
  "shared.startTitle": "Footer · Start here links",
  "shared.footerListsWhere":
    "At the bottom of Home, Sign-in and FAQ, find the matching footer column. These ordered links are shared by those three pages. Other page templates currently keep separate link lists.",
  "shared.caseTitle": "Case studies · Shared story labels",
  "shared.caseWhere":
    "Work → open a project. The header label appears beside its category. The remaining labels belong to full stories: common labels plus separate Design, Development, Marketing, IT support and Hosting layouts. A project must show a full story for its department-specific labels to appear. Project text and results are edited in Content → Work; the format badge is in Global → Case-study labels.",
  "shared.caseTemplateTitle": "Case studies · Department labels and diagrams",
  "shared.caseTemplateWhere":
    "Work → open a project with a full story. Each field names its department and Approach, Delivered or Results section. Only that department’s layout is shown. The sample disclaimer appears only on sample stories.",
  "shared.caseHighlightTitle": "Case studies · Headline result card",
  "shared.caseHighlightWhere":
    "Work → open a full story. The Headline result card is beside the project brief when the story has a highlight. Its value and description come from that Work record; these fields edit the shared card label and sample notice.",
  "shared.relatedWorkTitle": "Service details · Related work",
  "shared.relatedWorkWhere":
    "Services → open an individual service, then find Related work near the bottom. This section appears only when matching or related projects exist. The selected project records supply their names, images, statuses and summaries.",
  "shared.socialTitle": "Website footer · Social network icons",
  "shared.socialWhere":
    "At the bottom of the main website footers and FAQ, beside the Made in Switzerland label. This list sets the icon order and hover names. The current template displays icons without clickable social profile links; no profile URL is edited here.",
  "shared.processTitle": "Home and Services · Approach steps",
  "shared.processWhere":
    "Home and the Services overview → Approach. These ordered steps supply each step’s short name, heading and description. The section introduction is edited on each Page. Software and About use separate step lists.",
  "shared.legacyHeaderAlt":
    "Alternative text for the wordmark in the main page headers. The shared header on FAQ, Roadmap and purchasing pages uses Global → Purchasing content instead.",
  "shared.headerNavigation":
    "The navigation link at the top of the page. Its destination is fixed by the template; changing the text does not change the address.",
  "shared.legacyHeaderAction":
    "Project button in the main page headers, linking to Contact. FAQ, Roadmap and purchasing pages use the separate project button in Purchasing content.",
  "shared.legacyMenu":
    "Main page headers on narrow screens. Menu opens the navigation overlay; the aria label is announced by screen readers. The shared header uses Purchasing content instead.",
  "shared.menuList":
    "Home or Sign-in → narrow screen → open Menu. Addresses and order are shared across languages and edited in English.",
  "shared.footerAlt":
    "Alternative text for the wordmark at the top of the main website footer.",
  "shared.footerColumnHeading":
    "Heading above its footer link column. This text is shared even where a page template keeps a separate link list.",
  "shared.footerCopyright":
    "The final footer line combines copyright, the partner description and the studio disciplines. Keep its existing text formatting.",
  "shared.footerHomeAlt":
    "Accessible label for the footer logo link in the main reference pages. FAQ’s shared footer does not currently use this label.",
  "shared.footerLists":
    "Link text or destination in the matching footer column on Home, Sign-in and FAQ. Other page templates currently keep separate lists.",
  "shared.caseState":
    "Work → open a full project story for the department named in this field. The label appears only in that department’s matching story section; assistive labels are announced by screen readers.",
  "shared.sampleState":
    "Visible only on a full story marked as a sample. Approved-result stories omit this notice.",
  "shared.relatedState":
    "Shown on an individual service detail page only when related project cards are available.",
  "shared.relatedSentence":
    "Related work description: this fragment is combined with the discipline name, another fragment, the service name and the final sentence. Keep the fragments in their existing order.",
  "shared.socialTooltip":
    "Network name shown when hovering its footer icon; it is not a profile address.",
  "shared.socialClass":
    "Icon font class used by the footer symbol, for example ph-fill ph-linkedin-logo. This technical value is shared across languages and edited in English.",
  "shared.headerLogo": "Main header · Wordmark alternative text",
  "shared.homeLink": "Navigation · Home link text",
  "shared.servicesLink": "Navigation · Services link text",
  "shared.softwareLink": "Navigation · Software link text",
  "shared.workLink": "Navigation · Work link text",
  "shared.aboutLink": "Navigation · About link text",
  "shared.insightsLink": "Navigation · Insights link text",
  "shared.projectLink": "Main header · Contact button text",
  "shared.menuAria": "Main header · Menu label for screen readers",
  "shared.menuButton": "Main header · Mobile Menu button text",
  "shared.menuItem": "Mobile menu · Link text",
  "shared.menuDestination": "Mobile menu · Link destination",
  "shared.footerLogo": "Footer · Wordmark alternative text",
  "shared.backTop": "Footer · Back to top link text",
  "shared.footerHeading": "Footer · Contact invitation heading",
  "shared.footerDescription": "Footer · Contact invitation description",
  "shared.footerContact": "Footer · Contact button text",
  "shared.exploreHeading": "Footer · Explore column heading",
  "shared.startHeading": "Footer · Start here column heading",
  "shared.copyright": "Footer · Copyright and studio description",
  "shared.footerHomeAria": "Footer · Logo link label for screen readers",
  "shared.footerLinkLabel": "Footer column · Link text",
  "shared.footerLinkDestination": "Footer column · Link destination",
  "shared.caseEyebrow": "Project header · Category prefix",
  "shared.caseTagsAria": "Project header · Tag list label for screen readers",
  "shared.sampleNote": "Sample story · Results disclaimer",
  "shared.designPalette": "Design · Delivered · Colour palette caption",
  "shared.designTypography": "Design · Delivered · Typography caption",
  "shared.designSpecimen": "Design · Delivered · Type specimen letters",
  "shared.designWeightSuffix":
    "Design · Delivered · Text after each font weight",
  "shared.designLogoSuite": "Design · Delivered · Logo suite caption",
  "shared.designWideAlt":
    "Design · Delivered · Horizontal logo alternative text",
  "shared.designStackedAlt":
    "Design · Delivered · Stacked logo alternative text",
  "shared.designMarkAlt": "Design · Delivered · Logo mark alternative text",
  "shared.designCompare": "Design · Results · Before and After column headings",
  "shared.designBeforeAria":
    "Design · Results · Before prefix for screen readers",
  "shared.designAfterAria":
    "Design · Results · After prefix for screen readers",
  "shared.devArchitecture":
    "Development · Delivered · Architecture description prefix",
  "shared.devConnect": "Development · Delivered · Architecture connector text",
  "shared.devProvide": "Development · Delivered · Architecture layers prefix",
  "shared.devCore": "Development · Delivered · Core diagram label",
  "shared.devStack": "Development · Delivered · Technology stack label",
  "shared.marketingWeekPrefix": "Marketing · Approach · Week number prefix",
  "shared.marketingWeekRange": "Marketing · Approach · Week range label",
  "shared.marketingBefore": "Marketing · Results · Previous value prefix",
  "shared.marketingBaseline": "Marketing · Results · Baseline chart legend",
  "shared.marketingCampaign": "Marketing · Results · Campaign chart legend",
  "shared.marketingFunnel": "Marketing · Results · Funnel chart caption",
  "shared.marketingPercent":
    "Marketing · Results · Funnel percentage connector",
  "shared.marketingChannels":
    "Marketing · Results · Lead sources chart caption",
  "shared.supportLog": "IT support · Approach · Service desk log label",
  "shared.supportTicketSuffix":
    "IT support · Approach · Text after ticket count",
  "shared.supportResponse": "IT support · Delivered · Response target label",
  "shared.supportBefore": "IT support · Results · Before comparison label",
  "shared.supportAfter": "IT support · Results · After comparison label",
  "shared.hostingRunbook": "Hosting · Approach · Runbook item prefix",
  "shared.hostingStatus":
    "Hosting · Delivered · Status heading and preview label",
  "shared.hostingBefore": "Hosting · Results · Before chart legend",
  "shared.hostingAfter": "Hosting · Results · After cutover chart legend",
  "shared.hostingSeconds": "Hosting · Results · Seconds axis suffix",
  "shared.hostingCutover": "Hosting · Results · Cutover marker label",
  "shared.highlightLabel": "Project brief · Headline result label",
  "shared.highlightSample": "Project brief · Sample figure notice",
  "shared.relatedEyebrow": "Related work · Prefix before discipline name",
  "shared.relatedHeading": "Related work · Section heading",
  "shared.relatedPrefix": "Related work · Description before discipline name",
  "shared.relatedConnector":
    "Related work · Description between discipline and service",
  "shared.relatedSuffix": "Related work · Description after service name",
  "shared.relatedProjectLink": "Related work · Project card link text",
  "shared.relatedAllLink": "Related work · View all work link text",
  "shared.socialName": "Footer icon · Network hover name",
  "shared.socialIcon": "Footer icon · Icon font class",
  "shared.stepName": "Approach step · Short name",
  "shared.stepHeading": "Approach step · Heading",
  "shared.stepBody": "Approach step · Description",
};
