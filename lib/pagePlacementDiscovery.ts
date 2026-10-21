import type {
  PageFieldPlacement,
  PagePlacementMap,
} from "./pagePlacementTypes";

/** Source-traced locations for the six discovery pages. This never changes storage paths. */
export const DISCOVERY_COPY: Record<string, string> = {
  "discovery.homeHeroTitle": "Home · Main banner",
  "discovery.homeHeroWhere":
    "Home → the first banner. The fixed main heading is followed by the changing line in Rotating words.",
  "discovery.homeWordsTitle": "Home · Changing headline",
  "discovery.homeWordsWhere":
    "Home → the final line of the main heading. These phrases rotate in order after the fixed words ‘Build the business.’",
  "discovery.homeSidesTitle": "Home · Studio and Software cards",
  "discovery.homeSidesWhere":
    "Home → Two sides, below the main banner. Studio is the first card; Software is the second.",
  "discovery.homePartnersTitle": "Home · Partner logos",
  "discovery.homePartnersWhere":
    "Home → the partner logo strip between Two sides and Our identity. Names, logos and visibility come from Pages → Partners.",
  "discovery.homeWorkTitle": "Home · Our identity showcase",
  "discovery.homeWorkWhere":
    "Home → Our identity, after the partner logos. Its four panels show brand identity, digital applications, mobile identity and signage. Project records are managed separately under Work.",
  "discovery.homeServicesTitle": "Home · Services accordion",
  "discovery.homeServicesWhere":
    "Home → Services, after Our identity. Open a service row to see its image, description, tags and caption. These Home rows are separate from the Services catalogue.",
  "discovery.homeSoftwareTitle": "Home · Software explorer",
  "discovery.homeSoftwareWhere":
    "Home → Software, after the Services accordion. These fields edit its introduction and centre logo. The selectable module names and descriptions come from Content → Software.",
  "discovery.homeApproachTitle": "Home · Approach introduction",
  "discovery.homeApproachWhere":
    "Home → Approach, after Software. These fields edit the introduction; the step names, titles and descriptions come from Global → Process.",
  "discovery.homeFaqTitle": "Home · Questions and answers",
  "discovery.homeFaqWhere":
    "Home → the question accordion after Approach. Each answer appears when its question opens. The section heading comes from Pages → FAQ.",
  "discovery.homeReviewsTitle": "Home · Client reviews",
  "discovery.homeReviewsWhere":
    "Home → the review carousel between Questions and answers and the final contact section. Manage its review records in Content → Reviews. It appears when eligible reviews are available.",
  "discovery.homeClosingTitle": "Home · Final contact section",
  "discovery.homeClosingWhere":
    "Home → the final invitation to contact the team, after the reviews and above the footer.",
  "discovery.servicesHeroTitle": "Services · Main banner",
  "discovery.servicesHeroWhere":
    "Services overview → the top banner, above Five disciplines. Service and discipline detail pages use their own headings. The banner copy is shared with Strings → Services.",
  "discovery.servicesFamiliesTitle": "Services · Five disciplines",
  "discovery.servicesFamiliesWhere":
    "Services overview → Five disciplines, below the banner. These fields edit the introduction; the discipline names and cards come from the service-family records in Content → Services.",
  "discovery.servicesListTitle": "Services · Search and catalogue",
  "discovery.servicesListWhere":
    "Services overview → All services, below Five disciplines. These fields label the search, filters and empty results. Service card content and order come from Content → Services.",
  "discovery.servicesBundlesTitle": "Services · Ready-made bundles",
  "discovery.servicesBundlesWhere":
    "Services overview → the ready-made bundle cards after All services. These heading fields are shared with Software and Global → Purchasing content; bundle contents come from the purchasing catalogue.",
  "discovery.servicesBuilderTitle": "Services · Build your plan",
  "discovery.servicesBuilderWhere":
    "Services overview → the service plan builder below the ready-made bundles. These fields edit its heading and the button that scrolls here. Shared descriptions and buttons also appear in the Software builder.",
  "discovery.servicesDepartmentTitle":
    "Services · Discipline bundle introduction",
  "discovery.servicesDepartmentWhere":
    "Services → open a discipline, then its purchasing section. These fields appear when the discipline shows bundles, not on an individual service or the Hosting branch. Shared copy also appears in Global → Purchasing content.",
  "discovery.servicesReviewsTitle": "Services · Client reviews",
  "discovery.servicesReviewsWhere":
    "Services → the review section near the end of the page. The overview uses reviews in the Services category; detail pages use linked reviews. Manage records in Content → Reviews. The section needs eligible reviews.",
  "discovery.servicesWordsTitle": "Services · Scrolling service names",
  "discovery.servicesWordsWhere":
    "Services → the moving name strip below the main banner. It uses the names of service records in Content → Services; edit a linked service to change a name.",
  "discovery.softwareHeroTitle": "Software · Main banner",
  "discovery.softwareHeroWhere":
    "Software overview → the top banner. Product detail pages use their own titles. The overview banner copy is shared with Strings → Software.",
  "discovery.softwareWorkspaceTitle": "Software · How the workspace connects",
  "discovery.softwareWorkspaceWhere":
    "Software overview → How it connects, below the banner and moving name strip. The step buttons change the active story; context chips accumulate as the story advances.",
  "discovery.softwareBundlesTitle": "Software · Ready-made bundles",
  "discovery.softwareBundlesWhere":
    "Software overview → the bundle cards after How it connects. These introduction fields are shared with Services and Global → Purchasing content. Bundle contents come from the purchasing catalogue.",
  "discovery.softwareBuilderTitle": "Software · Build your plan",
  "discovery.softwareBuilderWhere":
    "Software overview → the plan builder below the ready-made bundles. These fields edit its heading and the button that scrolls here. Shared descriptions and buttons also appear in the Services builder.",
  "discovery.softwareCapabilitiesTitle":
    "Software product · Capabilities introduction",
  "discovery.softwareCapabilitiesWhere":
    "Software → open a product, then Built for the everyday work below its banner. This label appears on product detail pages. The capability cards come from the selected product in Content → Software.",
  "discovery.softwareReviewsTitle": "Software · Client reviews",
  "discovery.softwareReviewsWhere":
    "Software → the review section near the end of the overview or product page. The overview uses the Software category; product pages use linked reviews. Manage records in Content → Reviews. Eligible reviews are required.",
  "discovery.softwareWordsTitle": "Software · Scrolling product names",
  "discovery.softwareWordsWhere":
    "Software → the moving name strip below the main banner. Product names come from Content → Software. Software bundle names in the same strip come from the purchasing catalogue.",
  "discovery.workProjectsTitle": "Work · Project catalogue",
  "discovery.workProjectsWhere":
    "Work overview → the opening project catalogue. These fields edit its heading, search, filters and empty results. Project cards and their order come from Content → Work.",
  "discovery.workStatusTitle": "Work · Retained status-card text",
  "discovery.workStatusWhere":
    "No current website placement. The former Work banner status card is no longer rendered. These saved labels are retained; editing them does not change the visible project catalogue or case studies.",
  "discovery.workReviewsTitle": "Work detail · Client reviews",
  "discovery.workReviewsWhere":
    "Work → open a project to see its review section near the end of the detail page. The Work overview does not display this section. Review records are managed in Content → Reviews.",
  "discovery.workWordsTitle": "Work · Retained name-strip source",
  "discovery.workWordsWhere":
    "No current website placement. Project names are prepared for a moving strip, but the current Work template does not render that strip. The links below open project records; their names still appear on project cards.",
  "discovery.aboutHeroTitle": "About · Main banner",
  "discovery.aboutHeroWhere":
    "About → the top banner, above Why OrgTik exists. These fields edit its introduction and contact buttons. The copy is shared with Strings → About; the second button uses the shared contact label.",
  "discovery.aboutPurposeTitle": "About · Purpose and goals",
  "discovery.aboutPurposeWhere":
    "About → Why OrgTik exists, after the banner and moving words. The mission card appears beside three goal cards.",
  "discovery.aboutJourneyTitle": "About · How we work",
  "discovery.aboutJourneyWhere":
    "About → How we work, after Purpose and goals. The introduction sits above numbered steps. Select a step to see its description and outcome.",
  "discovery.aboutReviewsTitle": "About · Client reviews",
  "discovery.aboutReviewsWhere":
    "About → the review carousel after What we can do and before the final contact section. Manage review records in Content → Reviews. The section appears when eligible reviews are available.",
  "discovery.aboutWordsTitle": "About · Scrolling discipline words",
  "discovery.aboutWordsWhere":
    "About → the moving word strip below the banner. These three editable words appear alongside the fixed words Strategy, Design and Operations.",
  "discovery.insightsArticlesTitle": "Insights · Article catalogue",
  "discovery.insightsArticlesWhere":
    "Insights overview → the opening article catalogue. These fields edit its introduction, search, filters and empty results. Article cards and their order come from Content → Insights.",
  "discovery.insightsWordsTitle": "Insights · Retained title-strip source",
  "discovery.insightsWordsWhere":
    "No current website placement. Article titles are prepared for a moving strip, but the current Insights template does not render it. The links below open article records; their titles still appear on article cards.",
  "discovery.sectionLabel": "Section number and label",
  "discovery.sectionHeading": "Section heading",
  "discovery.sectionIntro": "Section introduction",
  "discovery.bannerEyebrow": "Text above the main heading",
  "discovery.bannerHeading": "Main banner heading",
  "discovery.bannerAccent": "Highlighted part of the heading",
  "discovery.bannerIntro": "Text below the main heading",
  "discovery.primaryButton": "Primary button label",
  "discovery.primaryDestination": "Primary button destination",
  "discovery.secondaryButton": "Secondary button label",
  "discovery.secondaryDestination": "Secondary button destination",
  "discovery.bannerScroll": "Scroll link below the banner buttons",
  "discovery.fixedTemplate":
    "Set by the website template; shown here for reference.",
  "discovery.changingWords": "Phrases in the changing headline",
  "discovery.studioImage": "Studio card · Image fallback text",
  "discovery.studioLabel": "Studio card · Number and label",
  "discovery.studioKicker": "Studio card · Small introduction",
  "discovery.studioTitle": "Studio card · Heading",
  "discovery.studioBody": "Studio card · Description",
  "discovery.studioDesign": "Studio card · Design service item",
  "discovery.studioDevelopment": "Studio card · Development service item",
  "discovery.studioMarketing": "Studio card · Marketing service item",
  "discovery.studioSupport": "Studio card · Support service item",
  "discovery.studioHosting": "Studio card · Hosting service item",
  "discovery.softwareImage": "Software card · Image fallback text",
  "discovery.softwareLabel": "Software card · Number and label",
  "discovery.softwareKicker": "Software card · Small introduction",
  "discovery.softwareTitle": "Software card · Heading",
  "discovery.softwareBody": "Software card · Description",
  "discovery.moduleHr": "Software card · HR item and subtitle",
  "discovery.moduleCrm": "Software card · CRM item and subtitle",
  "discovery.moduleFiles": "Software card · Files item and subtitle",
  "discovery.moduleTasks": "Software card · Tasks item and subtitle",
  "discovery.moduleMarketing": "Software card · Marketing item and subtitle",
  "discovery.moduleWm": "Software card · Website Manager item and subtitle",
  "discovery.imageFallback":
    "Shown in the image frame when an image has not loaded or been supplied.",
  "discovery.identityLink": "Link to the Work page",
  "discovery.identityImage": "Brand identity panel · Image fallback text",
  "discovery.identityLabel": "Brand identity panel · Label and position",
  "discovery.identityCategory": "Brand identity panel · Category",
  "discovery.identityTitle": "Brand identity panel · Heading",
  "discovery.identityBody": "Brand identity panel · Caption",
  "discovery.digitalAlt": "Digital applications panel · Image description",
  "discovery.digitalLabel": "Digital applications panel · Label and position",
  "discovery.digitalCategory": "Digital applications panel · Category",
  "discovery.digitalTitle": "Digital applications panel · Heading",
  "discovery.digitalBody": "Digital applications panel · Caption",
  "discovery.mobileAlt": "Mobile identity panel · Image description",
  "discovery.mobileLabel": "Mobile identity panel · Label and position",
  "discovery.mobileCategory": "Mobile identity panel · Category",
  "discovery.mobileTitle": "Mobile identity panel · Heading",
  "discovery.mobileBody": "Mobile identity panel · Caption",
  "discovery.signageAlt": "Signage panel · Image description",
  "discovery.signageLabel": "Signage panel · Label and position",
  "discovery.signageCategory": "Signage panel · Category",
  "discovery.signageTitle": "Signage panel · Heading",
  "discovery.signageBody": "Signage panel · Caption",
  "discovery.assistiveImage":
    "Describes the image to screen readers and appears if the image cannot load; it is not a visible section heading.",
  "discovery.servicesContact": "Introduction · Contact link",
  "discovery.servicesRowIntro": "Text above the service rows",
  "discovery.servicesRowButton": "Expanded row · Contact button",
  "discovery.serviceRowTitle": "Service row · Name",
  "discovery.serviceRowCategory":
    "Expanded row · Short headline and image label",
  "discovery.serviceRowIcon": "Service row · Icon class",
  "discovery.serviceRowBody": "Expanded row · Description",
  "discovery.serviceRowTags": "Service row · Capability tags",
  "discovery.serviceRowImage": "Expanded row · Image asset",
  "discovery.serviceRowCaption": "Expanded row · Image caption",
  "discovery.expandRow":
    "Open the corresponding service row on Home to see this content.",
  "discovery.tagsResponsive":
    "Shown in the expanded row and beside its name on wide screens.",
  "discovery.softwareExplore": "Link below the module explorer",
  "discovery.softwareLogoAlt": "Centre logo · Image description",
  "discovery.faqQuestion": "Accordion question",
  "discovery.faqAnswer": "Expanded answer",
  "discovery.expandQuestion": "Visible after the visitor opens this question.",
  "discovery.finalEyebrow": "Text above the final contact heading",
  "discovery.finalHeading": "Final contact heading",
  "discovery.finalBody": "Final contact description",
  "discovery.finalButton": "Final contact button label",
  "discovery.searchLabel": "Search field · Screen-reader label",
  "discovery.searchPlaceholder": "Search field · Placeholder",
  "discovery.clearSearchTitle": "Clear-search icon · Tooltip",
  "discovery.filterDiscipline": "Discipline filter heading",
  "discovery.filterBundle": "Bundle filter heading",
  "discovery.clearFilters": "Filter panel · Clear filters button",
  "discovery.emptyHeading": "No matching results · Heading",
  "discovery.emptyBody": "No matching results · Explanation",
  "discovery.emptyReset": "No matching results · Reset button",
  "discovery.assistiveSearch":
    "Read by screen readers to identify the search field; it is not a separate visible heading.",
  "discovery.clearSearchWhen":
    "Appears when a search has been entered; the text is the clear icon’s tooltip.",
  "discovery.emptyWhen":
    "Appears only when the visitor’s search or filters return no results.",
  "discovery.sharedPurchasing":
    "Shared purchasing copy: changing this also affects other pages that use the same component.",
  "discovery.builderScrollButton": "Button that opens the custom plan builder",
  "discovery.builderEyebrow": "Builder · Label above the heading",
  "discovery.builderHeading": "Builder · Heading",
  "discovery.builderIntro": "Builder · Introduction",
  "discovery.bundleEyebrow": "Bundle cards · Label above the heading",
  "discovery.bundleHeading": "Bundle cards · Heading",
  "discovery.bundleIntro": "Bundle cards · Introduction",
  "discovery.departmentEyebrow": "Discipline bundles · Label above the heading",
  "discovery.departmentHeading": "Discipline bundles · Main heading",
  "discovery.departmentAccent": "Discipline bundles · Highlighted heading",
  "discovery.departmentIntro": "Discipline bundles · Introduction",
  "discovery.departmentButton": "Discipline bundles · Custom builder link",
  "discovery.departmentWhen":
    "Shown on a discipline page with bundles. Individual-service and Hosting pages use different purchasing copy.",
  "discovery.contextHeading": "Accumulated context panel · Heading",
  "discovery.workspaceNavigation": "Workspace benefits · Navigation item",
  "discovery.workspaceAccess": "Workspace benefits · Access item",
  "discovery.workspaceSupport": "Workspace benefits · Support item",
  "discovery.contextStep": "Context chip · Step that introduces it",
  "discovery.contextIcon": "Context chip · Icon class",
  "discovery.contextLabel": "Context chip · Text",
  "discovery.contextStepHelp":
    "Zero is the first story step. The chip appears from the chosen step onward.",
  "discovery.storyStepIcon": "Story step · Icon class",
  "discovery.storyStepName": "Story step · Module name",
  "discovery.storyStepTitle": "Story step · Heading",
  "discovery.storyStepBody": "Active story step · Description",
  "discovery.storyStepHelp":
    "Select this step in How it connects to see its description.",
  "discovery.productLabel": "Product capabilities · Section number and label",
  "discovery.productWhen":
    "Open a software product page to see this label; the Software overview uses the workspace story instead.",
  "discovery.filterStatus": "Status filter heading",
  "discovery.retainedStatusTitle": "Former status card · Heading",
  "discovery.retainedStatusBody": "Former status card · Note",
  "discovery.retainedStatusHelp":
    "Retained for compatibility. The current Work template does not render this card.",
  "discovery.aboutCaption": "Former banner card · Note",
  "discovery.retainedAboutCaption":
    "Retained for compatibility. The current About banner has no side card and does not display this note.",
  "discovery.missionImage": "Mission card · Image fallback text",
  "discovery.missionTitle": "Mission card · Heading",
  "discovery.missionBody": "Mission card · Description",
  "discovery.goalOne": "Goal 1 · Number, heading and description",
  "discovery.goalTwo": "Goal 2 · Number, heading and description",
  "discovery.goalThree": "Goal 3 · Number, heading and description",
  "discovery.journeyTitle": "Journey step · Heading",
  "discovery.journeyBody": "Selected journey step · Description",
  "discovery.journeyOutcome": "Journey step · Outcome chip",
  "discovery.journeyWhen":
    "Select this numbered step on About to see its description.",
  "discovery.aboutWordOne": "Moving strip · Word after Design",
  "discovery.aboutWordTwo": "Moving strip · Word after Operations",
  "discovery.aboutWordThree": "Moving strip · Final word",
  "discovery.servicesStoriesTitle": "Service detail · Delivery cards",
  "discovery.servicesStoriesWhere":
    "Services → open an individual service, then its delivery cards below the service list. The same three card templates are reused for every service; the selected capability replaces '{c}' in each description.",
  "discovery.servicesApproachTitle": "Services · How we work",
  "discovery.servicesApproachWhere":
    "Services → the process section near the end of the overview and detail pages, before reviews. The overview and detail use different headings. Step content is shared from Global → Process.",
  "discovery.softwareDemoTitle": "Software product · Ways to use",
  "discovery.softwareDemoWhere":
    "Software → open a product, then Ways to use after its capabilities. This field edits the shared heading; scenario names and descriptions come from that product’s use cases in Content → Software.",
  "discovery.softwareNextTitle": "Software purchase · What happens next",
  "discovery.softwareNextWhere":
    "Software → a product or configured plan, after its purchasing section. The introduction and numbered Choose / Review / Pay & access steps belong to the same section. These fields are shared by those Software purchase views.",
  "discovery.softwareRelatedTitle": "Software product · Related modules",
  "discovery.softwareRelatedWhere":
    "Software → open a product, then Works better together after the purchasing follow-up. These fields edit the introduction; related module cards come from Content → Software.",
  "discovery.workGalleryTitle": "Work detail · Project gallery",
  "discovery.workGalleryWhere":
    "Work → open a project, then Gallery below its case study. These fields edit the gallery introduction and empty-image fallback; the images come from that project’s gallery in Content → Work.",
  "discovery.workRelatedTitle": "Work detail · More projects",
  "discovery.workRelatedWhere":
    "Work → open a project, then More work after its gallery. This introduction appears when related project cards are available. The card content comes from other projects in Content → Work.",
  "discovery.aboutCapabilitiesTitle": "About · What we can do",
  "discovery.aboutCapabilitiesWhere":
    "About → What we can do after How we work. These fields edit its introduction, search, filters and empty results. Service cards come from Content → Services; the two software-group cards use Strings → About.",
  "discovery.insightsArticleTitle": "Article detail · Summary and sidebar",
  "discovery.insightsArticleWhere":
    "Insights → open an article. These shared labels appear above its cover, takeaways and service sidebar. The article’s title, body, takeaways and cover image come from its record in Content → Insights.",
  "discovery.insightsRelatedTitle": "Article detail · Keep reading",
  "discovery.insightsRelatedWhere":
    "Insights → open an article, then Keep reading below the article and sidebar. These fields edit the related-article introduction and image fallback; card titles and images come from the other article records.",
  "discovery.deliveryTitle": "Delivery card · Heading",
  "discovery.deliveryBody": "Delivery card · Description",
  "discovery.deliveryIcon": "Delivery card · Icon class",
  "discovery.deliveryPlaceholder":
    "Keep '{c}': the website replaces it with the selected service capability. These cards appear on individual service pages, not the overview.",
  "discovery.overviewLabel": "Overview · Label above the heading",
  "discovery.overviewHeading": "Overview · Main heading",
  "discovery.overviewAccent": "Overview · Highlighted heading",
  "discovery.detailLabel": "Detail pages · Label above the heading",
  "discovery.detailHeading": "Detail pages · Main heading",
  "discovery.detailAccent": "Detail pages · Highlighted heading",
  "discovery.purchaseStepTitle": "Numbered purchase step · Heading",
  "discovery.purchaseStepBody": "Numbered purchase step · Description",
  "discovery.projectImageFallback": "Project gallery · Image fallback text",
  "discovery.relatedProjectWhen":
    "Visible on a project detail page when related projects are available.",
  "discovery.filterCapabilities": "Capabilities filter heading",
  "discovery.filterWays": "Ways-to-start filter heading",
  "discovery.filterTopics": "Topics filter heading",
  "discovery.popularReads": "Popular-articles sidebar heading",
  "discovery.articleImageFallback": "Article cover · Image fallback text",
  "discovery.articleSummaryLabel": "Article summary · Number and label",
  "discovery.articleTakeaways": "Takeaways box · Heading",
  "discovery.articleService": "Service sidebar · Heading",
  "discovery.articleContact": "Service sidebar · Contact link",
  "discovery.articleDetails": "Article details box · Heading",
  "discovery.relatedArticleImageFallback":
    "Related-article card · Image fallback text",
};

const key = (name: string) => `discovery.${name}`;
const field = (
  label: string,
  hint?: string,
  state?: PageFieldPlacement["state"],
): PageFieldPlacement => ({
  label: key(label),
  ...(hint ? { hint: key(hint) } : {}),
  ...(state ? { state } : {}),
});
const intro = (record: string, section: string, heading = "h2") => ({
  [`${record}.${section}.div`]: field("sectionLabel"),
  [`${record}.${section}.${heading}`]: field("sectionHeading"),
  [`${record}.${section}.p`]: field("sectionIntro"),
});
const section = (
  name: string,
  fields: Record<string, PageFieldPlacement> = {},
  preview?: false,
) => ({
  title: key(`${name}Title`),
  where: key(`${name}Where`),
  fields,
  ...(preview === false ? { preview } : {}),
});
const purchasing = (label: string) => field(label, "sharedPurchasing");

export const DISCOVERY_PLACEMENTS: PagePlacementMap = {
  pg_home: {
    hero: section("homeHero", {
      "pg_home.hero.div": field("bannerEyebrow"),
      "pg_home.hero.h1": field("bannerHeading", "fixedTemplate"),
      "pg_home.hero.p": field("bannerIntro"),
      "pg_home.hero.a": field("primaryButton"),
      "pg_home.hero.button1Href": field("primaryDestination", "fixedTemplate"),
      "pg_home.hero.a-2": field("secondaryButton"),
      "pg_home.hero.button2Href": field(
        "secondaryDestination",
        "fixedTemplate",
      ),
      "pg_home.hero.a-3": field("bannerScroll"),
    }),
    heroWords: section("homeWords", {
      "pg_home.heroWords": field("changingWords"),
    }),
    "two-sides": section("homeSides", {
      ...intro("pg_home", "two-sides"),
      "pg_home.two-sides.image-slot@placeholder": field(
        "studioImage",
        "imageFallback",
        "conditional",
      ),
      "pg_home.two-sides.div-2": field("studioLabel"),
      "pg_home.two-sides.div-3": field("studioKicker"),
      "pg_home.two-sides.h3": field("studioTitle"),
      "pg_home.two-sides.p-2": field("studioBody"),
      "pg_home.two-sides.li": field("studioDesign"),
      "pg_home.two-sides.li-2": field("studioDevelopment"),
      "pg_home.two-sides.li-3": field("studioMarketing"),
      "pg_home.two-sides.li-4": field("studioSupport"),
      "pg_home.two-sides.li-5": field("studioHosting"),
      "pg_home.two-sides.image-slot@placeholder-2": field(
        "softwareImage",
        "imageFallback",
        "conditional",
      ),
      "pg_home.two-sides.div-4": field("softwareLabel"),
      "pg_home.two-sides.div-5": field("softwareKicker"),
      "pg_home.two-sides.h3-2": field("softwareTitle"),
      "pg_home.two-sides.p-3": field("softwareBody"),
      "pg_home.two-sides.li-6": field("moduleHr"),
      "pg_home.two-sides.li-7": field("moduleCrm"),
      "pg_home.two-sides.li-8": field("moduleFiles"),
      "pg_home.two-sides.li-9": field("moduleTasks"),
      "pg_home.two-sides.li-10": field("moduleMarketing"),
      "pg_home.two-sides.li-11": field("moduleWm"),
    }),
    partners: section("homePartners"),
    work: section("homeWork", {
      ...intro("pg_home", "work"),
      "pg_home.work.a": field("identityLink"),
      "pg_home.work.image-slot@placeholder": field(
        "identityImage",
        "imageFallback",
        "conditional",
      ),
      "pg_home.work.div-2": field("identityLabel"),
      "pg_home.work.div-3": field("identityCategory"),
      "pg_home.work.h3": field("identityTitle"),
      "pg_home.work.p-2": field("identityBody"),
      "pg_home.work.image-slot@alt": field(
        "digitalAlt",
        "assistiveImage",
        "assistive",
      ),
      "pg_home.work.div-4": field("digitalLabel"),
      "pg_home.work.div-5": field("digitalCategory"),
      "pg_home.work.h3-2": field("digitalTitle"),
      "pg_home.work.p-3": field("digitalBody"),
      "pg_home.work.image-slot@alt-2": field(
        "mobileAlt",
        "assistiveImage",
        "assistive",
      ),
      "pg_home.work.div-6": field("mobileLabel"),
      "pg_home.work.div-7": field("mobileCategory"),
      "pg_home.work.h3-3": field("mobileTitle"),
      "pg_home.work.p-4": field("mobileBody"),
      "pg_home.work.image-slot@alt-3": field(
        "signageAlt",
        "assistiveImage",
        "assistive",
      ),
      "pg_home.work.div-8": field("signageLabel"),
      "pg_home.work.div-9": field("signageCategory"),
      "pg_home.work.h3-4": field("signageTitle"),
      "pg_home.work.p-5": field("signageBody"),
    }),
    services: section("homeServices", {
      ...intro("pg_home", "services"),
      "pg_home.services.a": field("servicesContact"),
      "pg_home.services.div-2": field("servicesRowIntro"),
      "pg_home.services.a-2": field(
        "servicesRowButton",
        "expandRow",
        "conditional",
      ),
      "pg_home.homeServices.*.title": field("serviceRowTitle"),
      "pg_home.homeServices.*.category": field(
        "serviceRowCategory",
        "expandRow",
        "conditional",
      ),
      "pg_home.homeServices.*.icon": field("serviceRowIcon"),
      "pg_home.homeServices.*.text": field(
        "serviceRowBody",
        "expandRow",
        "conditional",
      ),
      "pg_home.homeServices.*.tags": field("serviceRowTags", "tagsResponsive"),
      "pg_home.homeServices.*.image": field(
        "serviceRowImage",
        "expandRow",
        "conditional",
      ),
      "pg_home.homeServices.*.caption": field(
        "serviceRowCaption",
        "expandRow",
        "conditional",
      ),
    }),
    software: section("homeSoftware", {
      ...intro("pg_home", "software"),
      "pg_home.software.a": field("softwareExplore"),
      "pg_home.software.img@alt": field(
        "softwareLogoAlt",
        "assistiveImage",
        "assistive",
      ),
    }),
    approach: section("homeApproach", intro("pg_home", "approach")),
    faqs: section("homeFaq", {
      "pg_home.faqs.*.question": field("faqQuestion"),
      "pg_home.faqs.*.answer": field(
        "faqAnswer",
        "expandQuestion",
        "conditional",
      ),
    }),
    reviews: section("homeReviews"),
    closing: section("homeClosing", {
      "pg_home.closing.div": field("finalEyebrow"),
      "pg_home.closing.h2": field("finalHeading"),
      "pg_home.closing.p": field("finalBody"),
      "pg_home.closing.a": field("finalButton"),
    }),
  },
  pg_services: {
    hero: section("servicesHero", {
      "st_services.b1.s10": field("bannerEyebrow"),
      "st_services.b1.s11": field("bannerHeading"),
      "st_services.b1.s12": field("bannerAccent"),
      "st_services.b1.s13": field("bannerIntro"),
      "st_services.b1.s14": field("primaryButton"),
      "pg_services.hero.button1Href": field(
        "primaryDestination",
        "fixedTemplate",
      ),
      "st_services.b1.s15": field("secondaryButton"),
      "pg_services.hero.button2Href": field(
        "secondaryDestination",
        "fixedTemplate",
      ),
    }),
    families: section("servicesFamilies", intro("pg_services", "families")),
    "all-services": section("servicesList", {
      ...intro("pg_services", "all-services"),
      "pg_services.all-services.input@aria-label": field(
        "searchLabel",
        "assistiveSearch",
        "assistive",
      ),
      "pg_services.all-services.input@placeholder": field("searchPlaceholder"),
      "pg_services.all-services.button@title": field(
        "clearSearchTitle",
        "clearSearchWhen",
        "conditional",
      ),
      "pg_services.all-services.div-2": field("filterDiscipline"),
      "pg_services.all-services.div-3": field("filterBundle"),
      "pg_services.all-services.button": field("clearFilters"),
      "pg_services.all-services.div-4": field(
        "emptyHeading",
        "emptyWhen",
        "conditional",
      ),
      "pg_services.all-services.p-2": field(
        "emptyBody",
        "emptyWhen",
        "conditional",
      ),
      "pg_services.all-services.button-2": field(
        "emptyReset",
        "emptyWhen",
        "conditional",
      ),
    }),
    "ready-made-bundles": section("servicesBundles", {
      "st_commerce.b3.s5": purchasing("bundleEyebrow"),
      "gl_commerce.purchaseUI-hero.PurchaseHeading@title":
        purchasing("bundleHeading"),
      "gl_commerce.purchaseUI-hero.PurchaseHeading": purchasing("bundleIntro"),
    }),
    bundle: section("servicesBuilder", {
      "st_commerce.b3.s6": purchasing("builderEyebrow"),
      "st_commerce.b3.s8": field("builderHeading"),
      "gl_commerce.purchaseUI-section-1.PurchaseHeading":
        purchasing("builderIntro"),
      "gl_commerce.purchaseUI-hero.PurchaseAction": purchasing(
        "builderScrollButton",
      ),
    }),
    "department-bundles": section(
      "servicesDepartment",
      {
        "st_commerce.b4.s2": field(
          "departmentEyebrow",
          "departmentWhen",
          "conditional",
        ),
        "gl_commerce.purchaseUI-plans-section.PurchaseHeading@title-2": field(
          "departmentHeading",
          "departmentWhen",
          "conditional",
        ),
        "st_commerce.b4.s3": field(
          "departmentAccent",
          "departmentWhen",
          "conditional",
        ),
        "gl_commerce.purchaseUI-plans-section.PurchaseHeading-2": field(
          "departmentIntro",
          "departmentWhen",
          "conditional",
        ),
        "gl_commerce.purchaseUI-plans-section.PurchaseAction-2": field(
          "departmentButton",
          "departmentWhen",
          "conditional",
        ),
      },
      false,
    ),
    stories: section(
      "servicesStories",
      {
        "pg_services.stories.*.title": field("deliveryTitle"),
        "pg_services.stories.*.body": field(
          "deliveryBody",
          "deliveryPlaceholder",
          "conditional",
        ),
        "pg_services.stories.*.icon": field("deliveryIcon"),
      },
      false,
    ),
    approach: section("servicesApproach", {
      "pg_services.approach.p": field("sectionIntro"),
      "st_services.b5.s2": field("overviewLabel"),
      "st_services.b5.s4": field("overviewHeading"),
      "st_services.b5.s6": field("overviewAccent"),
      "st_services.b5.s3": field("detailLabel"),
      "st_services.b5.s5": field("detailHeading"),
      "st_services.b5.s7": field("detailAccent"),
    }),
    reviews: section("servicesReviews"),
    "rotation-words": section("servicesWords"),
  },
  pg_software: {
    hero: section("softwareHero", {
      "st_software.b1.s17": field("bannerEyebrow"),
      "st_software.b1.s13": field("bannerHeading"),
      "st_software.b1.s18": field("bannerAccent"),
      "st_software.b1.s19": field("bannerIntro"),
      "st_software.b1.s20": field("primaryButton"),
      "pg_software.hero.button1Href": field(
        "primaryDestination",
        "fixedTemplate",
      ),
      "st_software.b1.s21": field("secondaryButton"),
      "pg_software.hero.button2Href": field(
        "secondaryDestination",
        "fixedTemplate",
      ),
    }),
    workspace: section("softwareWorkspace", {
      ...intro("pg_software", "workspace"),
      "pg_software.workspace.div-2": field("contextHeading"),
      "pg_software.workspace.div-3": field("workspaceNavigation"),
      "pg_software.workspace.div-4": field("workspaceAccess"),
      "pg_software.workspace.div-5": field("workspaceSupport"),
      "pg_software.context.*.step": field("contextStep", "contextStepHelp"),
      "pg_software.context.*.icon": field("contextIcon"),
      "pg_software.context.*.label": field(
        "contextLabel",
        "contextStepHelp",
        "conditional",
      ),
      "pg_software.flow.*.icon": field("storyStepIcon"),
      "pg_software.flow.*.name": field("storyStepName"),
      "pg_software.flow.*.title": field("storyStepTitle"),
      "pg_software.flow.*.body": field(
        "storyStepBody",
        "storyStepHelp",
        "conditional",
      ),
    }),
    "ready-made-bundles": section("softwareBundles", {
      "st_commerce.b3.s5": purchasing("bundleEyebrow"),
      "gl_commerce.purchaseUI-hero.PurchaseHeading@title":
        purchasing("bundleHeading"),
      "gl_commerce.purchaseUI-hero.PurchaseHeading": purchasing("bundleIntro"),
    }),
    bundle: section("softwareBuilder", {
      "st_commerce.b3.s6": purchasing("builderEyebrow"),
      "st_commerce.b3.s7": field("builderHeading"),
      "gl_commerce.purchaseUI-section-1.PurchaseHeading":
        purchasing("builderIntro"),
      "gl_commerce.purchaseUI-hero.PurchaseAction": purchasing(
        "builderScrollButton",
      ),
    }),
    capabilities: section("softwareCapabilities", {
      "pg_software.capabilities.div": field(
        "productLabel",
        "productWhen",
        "conditional",
      ),
    }),
    demo: section("softwareDemo", {
      "pg_software.demo.h2": field("sectionHeading", undefined, "conditional"),
    }),
    "section-1": section("softwareNext", {
      "pg_software.section-1.h2": field("sectionHeading"),
      "pg_software.section-1.p": field("sectionIntro"),
      "pg_software.planSteps.*.title": field("purchaseStepTitle"),
      "pg_software.planSteps.*.body": field("purchaseStepBody"),
    }),
    "section-2": section("softwareRelated", intro("pg_software", "section-2")),
    reviews: section("softwareReviews"),
    "rotation-words": section("softwareWords"),
  },
  pg_work: {
    projects: section("workProjects", {
      ...intro("pg_work", "projects", "h1"),
      "pg_work.projects.input@aria-label": field(
        "searchLabel",
        "assistiveSearch",
        "assistive",
      ),
      "pg_work.projects.input@placeholder": field("searchPlaceholder"),
      "pg_work.projects.button@title": field(
        "clearSearchTitle",
        "clearSearchWhen",
        "conditional",
      ),
      "pg_work.projects.div-2": field("filterDiscipline"),
      "pg_work.projects.div-3": field("filterStatus"),
      "pg_work.projects.button": field("clearFilters"),
      "pg_work.projects.div-4": field(
        "emptyHeading",
        "emptyWhen",
        "conditional",
      ),
      "pg_work.projects.p-2": field("emptyBody", "emptyWhen", "conditional"),
      "pg_work.projects.button-2": field(
        "emptyReset",
        "emptyWhen",
        "conditional",
      ),
    }),
    gallery: section("workGallery", {
      ...intro("pg_work", "gallery"),
      "pg_work.gallery.image-slot@placeholder": field(
        "projectImageFallback",
        "imageFallback",
        "conditional",
      ),
    }),
    hero: section("workRelated", {
      "pg_work.hero.div": field(
        "sectionLabel",
        "relatedProjectWhen",
        "conditional",
      ),
      "pg_work.hero.h2": field(
        "sectionHeading",
        "relatedProjectWhen",
        "conditional",
      ),
      "pg_work.hero.p": field(
        "sectionIntro",
        "relatedProjectWhen",
        "conditional",
      ),
    }),
    "status-card": section(
      "workStatus",
      {
        "st_work.b2.s5": field(
          "retainedStatusTitle",
          "retainedStatusHelp",
          "unused",
        ),
        "st_work.b2.s6": field(
          "retainedStatusBody",
          "retainedStatusHelp",
          "unused",
        ),
      },
      false,
    ),
    reviews: section("workReviews", {}, false),
    "rotation-words": section("workWords", {}, false),
  },
  pg_about: {
    hero: section("aboutHero", {
      "st_about.b3.s1": field("bannerEyebrow"),
      "st_about.b3.s2": field("bannerHeading"),
      "st_about.b3.s3": field("bannerAccent"),
      "st_about.b3.s4": field("bannerIntro"),
      "st_about.b3.s5": field("primaryButton"),
      "pg_about.hero.button1Href": field("primaryDestination", "fixedTemplate"),
      "st_shared.repeats.s2": field("secondaryButton"),
      "pg_about.hero.button2Href": field(
        "secondaryDestination",
        "fixedTemplate",
      ),
      "st_about.b3.s13": field(
        "aboutCaption",
        "retainedAboutCaption",
        "unused",
      ),
    }),
    purpose: section("aboutPurpose", {
      ...intro("pg_about", "purpose"),
      "pg_about.purpose.image-slot@placeholder": field(
        "missionImage",
        "imageFallback",
        "conditional",
      ),
      "pg_about.purpose.h3": field("missionTitle"),
      "pg_about.purpose.p-2": field("missionBody"),
      "pg_about.purpose.div-2": field("goalOne"),
      "pg_about.purpose.div-3": field("goalTwo"),
      "pg_about.purpose.div-4": field("goalThree"),
    }),
    journey: section("aboutJourney", {
      ...intro("pg_about", "journey"),
      "pg_about.journeySteps.*.title": field("journeyTitle"),
      "pg_about.journeySteps.*.body": field(
        "journeyBody",
        "journeyWhen",
        "conditional",
      ),
      "pg_about.journeySteps.*.outcome": field("journeyOutcome"),
    }),
    capabilities: section("aboutCapabilities", {
      ...intro("pg_about", "capabilities"),
      "pg_about.capabilities.input@aria-label": field(
        "searchLabel",
        "assistiveSearch",
        "assistive",
      ),
      "pg_about.capabilities.input@placeholder": field("searchPlaceholder"),
      "pg_about.capabilities.button@title": field(
        "clearSearchTitle",
        "clearSearchWhen",
        "conditional",
      ),
      "pg_about.capabilities.div-2": field("filterCapabilities"),
      "pg_about.capabilities.div-3": field("filterWays"),
      "pg_about.capabilities.button": field("clearFilters"),
      "pg_about.capabilities.div-4": field(
        "emptyHeading",
        "emptyWhen",
        "conditional",
      ),
      "pg_about.capabilities.p-2": field(
        "emptyBody",
        "emptyWhen",
        "conditional",
      ),
      "pg_about.capabilities.button-2": field(
        "emptyReset",
        "emptyWhen",
        "conditional",
      ),
    }),
    reviews: section("aboutReviews"),
    "rotation-words": section("aboutWords", {
      "st_about.b3.s18": field("aboutWordOne"),
      "st_about.b3.s19": field("aboutWordTwo"),
      "st_about.b3.s20": field("aboutWordThree"),
    }),
  },
  pg_insights: {
    articles: section("insightsArticles", {
      ...intro("pg_insights", "articles", "h1"),
      "pg_insights.articles.input@placeholder": field("searchPlaceholder"),
      "pg_insights.articles.button@title": field(
        "clearSearchTitle",
        "clearSearchWhen",
        "conditional",
      ),
      "pg_insights.articles.div-2": field("filterTopics"),
      "pg_insights.articles.div-3": field("popularReads"),
      "pg_insights.articles.button": field("clearFilters"),
      "pg_insights.articles.image-slot@placeholder": field(
        "relatedArticleImageFallback",
        "imageFallback",
        "conditional",
      ),
      "pg_insights.articles.div-4": field(
        "emptyHeading",
        "emptyWhen",
        "conditional",
      ),
      "pg_insights.articles.p-2": field(
        "emptyBody",
        "emptyWhen",
        "conditional",
      ),
      "pg_insights.articles.button-2": field(
        "emptyReset",
        "emptyWhen",
        "conditional",
      ),
    }),
    article: section("insightsArticle", {
      "pg_insights.article.div": field("articleSummaryLabel"),
      "pg_insights.article.image-slot@placeholder": field(
        "articleImageFallback",
        "imageFallback",
        "conditional",
      ),
      "pg_insights.article.div-2": field("articleTakeaways"),
      "pg_insights.article.div-3": field("articleService"),
      "pg_insights.article.a": field("articleContact"),
      "pg_insights.article.div-4": field("articleDetails"),
    }),
    hero: section("insightsRelated", {
      ...intro("pg_insights", "hero"),
      "pg_insights.hero.image-slot@placeholder": field(
        "relatedArticleImageFallback",
        "imageFallback",
        "conditional",
      ),
    }),
    "rotation-words": section("insightsWords", {}, false),
  },
};
