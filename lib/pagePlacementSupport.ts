import type { PagePlacementMap } from "./pagePlacementTypes";

/** Audited against the current Contact, Roadmap, Legal, SignIn, Partners and FAQ consumers.
 * These descriptors never change storage paths, published content or interaction state.
 */
export const SUPPORT_PLACEMENTS: PagePlacementMap = {
  pg_contact: {
    hero: {
      title: "support.contact",
      where: "support.contactWhere",
      fields: {
        "pg_contact.hero.p": {
          label: "support.fields.eyebrow",
        },
        "st_contact.b1.s2": {
          label: "support.fields.contactHeadingMain",
          hint: "support.hints.contactHeading",
        },
        "st_contact.b1.s3": {
          label: "support.fields.contactHeadingAccent",
          hint: "support.hints.contactHeading",
        },
        "st_contact.b1.s4": {
          label: "support.fields.contactHeadingIntro",
          hint: "support.hints.contactHeading",
        },
        "pg_contact.enquiry.div": {
          label: "support.fields.formTitle",
        },
        "pg_contact.enquiry.div-2": {
          label: "support.fields.topicPrompt",
        },
        "pg_contact.enquiry.input@placeholder": {
          label: "support.fields.namePlaceholder",
        },
        "pg_contact.enquiry.input@placeholder-2": {
          label: "support.fields.emailPlaceholder",
        },
        "pg_contact.enquiry.input@placeholder-3": {
          label: "support.fields.companyPlaceholder",
        },
        "pg_contact.enquiry.input@placeholder-4": {
          label: "support.fields.phonePlaceholder",
        },
        "pg_contact.enquiry.textarea@placeholder": {
          label: "support.fields.messagePlaceholder",
        },
        "pg_contact.enquiry.button": {
          label: "support.fields.sendEnquiry",
        },
        "pg_contact.enquiry.button-2": {
          label: "support.fields.sendAnother",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.div-3": {
          label: "support.fields.nextLinks",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.a": {
          label: "support.fields.workLink",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.a-2": {
          label: "support.fields.insightsLink",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.a-3": {
          label: "support.fields.softwareLink",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.a-4": {
          label: "support.fields.homeLink",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.div@aria-label": {
          label: "support.fields.pathsAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_contact.enquiry.div-4": {
          label: "support.fields.pathsHeading",
        },
        "pg_contact.enquiry.div-5": {
          label: "support.fields.nextHeading",
        },
        "pg_contact.enquiry.div-6": {
          label: "support.fields.nextStep",
        },
        "pg_contact.enquiry.div-7": {
          label: "support.fields.nextStep",
        },
        "pg_contact.enquiry.div-8": {
          label: "support.fields.nextStep",
        },
        "pg_contact.enquiry.div-9": {
          label: "support.fields.addressHeading",
        },
        "pg_contact.enquiry.div-10": {
          label: "support.fields.address",
        },
        "pg_contact.paths": {
          label: "support.fields.pathsHeading",
        },
        "pg_contact.paths.*": {
          label: "support.fields.pathsHeading",
        },
        "pg_contact.paths.*.id": {
          label: "support.fields.pathId",
          hint: "support.hints.pathId",
        },
        "pg_contact.paths.*.icon": {
          label: "support.fields.pathIcon",
        },
        "pg_contact.paths.*.title": {
          label: "support.fields.pathTitle",
        },
        "pg_contact.paths.*.body": {
          label: "support.fields.pathBody",
        },
        "pg_contact.paths.*.audience": {
          label: "support.fields.pathAudience",
          hint: "support.hints.pathAudience",
          state: "unused",
        },
        "pg_contact.paths.*.topic": {
          label: "support.fields.pathTopic",
          hint: "support.hints.pathTopic",
        },
        "pg_contact.topics": {
          label: "support.fields.topics",
        },
      },
    },
    enquiry: {
      title: "support.form",
      where: "support.formWhere",
      fields: {
        "pg_contact.enquiry.div": {
          label: "support.fields.formTitle",
        },
        "pg_contact.enquiry.div-2": {
          label: "support.fields.topicPrompt",
        },
        "pg_contact.enquiry.input@placeholder": {
          label: "support.fields.namePlaceholder",
        },
        "pg_contact.enquiry.input@placeholder-2": {
          label: "support.fields.emailPlaceholder",
        },
        "pg_contact.enquiry.input@placeholder-3": {
          label: "support.fields.companyPlaceholder",
        },
        "pg_contact.enquiry.input@placeholder-4": {
          label: "support.fields.phonePlaceholder",
        },
        "pg_contact.enquiry.textarea@placeholder": {
          label: "support.fields.messagePlaceholder",
        },
        "pg_contact.enquiry.button": {
          label: "support.fields.sendEnquiry",
        },
        "pg_contact.enquiry.button-2": {
          label: "support.fields.sendAnother",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.div-3": {
          label: "support.fields.nextLinks",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.a": {
          label: "support.fields.workLink",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.a-2": {
          label: "support.fields.insightsLink",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.a-3": {
          label: "support.fields.softwareLink",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.a-4": {
          label: "support.fields.homeLink",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_contact.enquiry.div@aria-label": {
          label: "support.fields.pathsAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_contact.enquiry.div-4": {
          label: "support.fields.pathsHeading",
        },
        "pg_contact.enquiry.div-5": {
          label: "support.fields.nextHeading",
        },
        "pg_contact.enquiry.div-6": {
          label: "support.fields.nextStep",
        },
        "pg_contact.enquiry.div-7": {
          label: "support.fields.nextStep",
        },
        "pg_contact.enquiry.div-8": {
          label: "support.fields.nextStep",
        },
        "pg_contact.enquiry.div-9": {
          label: "support.fields.addressHeading",
        },
        "pg_contact.enquiry.div-10": {
          label: "support.fields.address",
        },
      },
    },
    paths: {
      title: "support.paths",
      where: "support.pathsWhere",
      fields: {
        "pg_contact.paths": {
          label: "support.fields.pathsHeading",
        },
        "pg_contact.paths.*": {
          label: "support.fields.pathsHeading",
        },
        "pg_contact.paths.*.id": {
          label: "support.fields.pathId",
          hint: "support.hints.pathId",
        },
        "pg_contact.paths.*.icon": {
          label: "support.fields.pathIcon",
        },
        "pg_contact.paths.*.title": {
          label: "support.fields.pathTitle",
        },
        "pg_contact.paths.*.body": {
          label: "support.fields.pathBody",
        },
        "pg_contact.paths.*.audience": {
          label: "support.fields.pathAudience",
          hint: "support.hints.pathAudience",
          state: "unused",
        },
        "pg_contact.paths.*.topic": {
          label: "support.fields.pathTopic",
          hint: "support.hints.pathTopic",
        },
      },
    },
    topics: {
      title: "support.topics",
      where: "support.topicsWhere",
      fields: {
        "pg_contact.topics": {
          label: "support.fields.topics",
        },
      },
    },
    "rotation-words": {
      title: "support.rotation",
      where: "support.rotationWhere",
      fields: {
        "st_shared.repeats.s1": {
          label: "support.fields.rotatingWord",
          hint: "support.hints.contactTicker",
          state: "unused",
        },
        "st_shared.repeats.s2": {
          label: "support.fields.rotatingWord",
          hint: "support.hints.contactTicker",
          state: "unused",
        },
        "st_contact.b1.s14": {
          label: "support.fields.rotatingWord",
          hint: "support.hints.contactTicker",
          state: "unused",
        },
      },
      preview: false,
    },
  },
  pg_roadmap: {
    intro: {
      title: "support.cursor",
      where: "support.cursorWhere",
      fields: {
        "pg_roadmap.intro.div": {
          label: "support.fields.cursorText",
        },
        "pg_roadmap.intro.button@aria-label": {
          label: "support.fields.closeDialog",
          hint: "support.hints.sampleDialog",
          state: "assistive",
        },
        "pg_roadmap.intro.div@aria-label": {
          label: "support.fields.sampleStatusAria",
          hint: "support.hints.sampleDialog",
          state: "assistive",
        },
        "pg_roadmap.intro.div-2": {
          label: "support.fields.sampleWarning",
          hint: "support.hints.sampleDialog",
          state: "conditional",
        },
        "pg_roadmap.intro.button": {
          label: "support.fields.returnRoadmap",
          hint: "support.hints.sampleDialog",
          state: "conditional",
        },
      },
      preview: false,
    },
    hero: {
      title: "support.roadmapHero",
      where: "support.roadmapHeroWhere",
      fields: {
        "pg_roadmap.hero.h1": {
          label: "support.fields.heading",
        },
        "pg_roadmap.hero.p": {
          label: "support.fields.intro",
        },
        "pg_roadmap.hero.p-2": {
          label: "support.fields.roadmapNote",
          hint: "support.hints.roadmapNote",
          state: "unused",
        },
      },
    },
    timeline: {
      title: "support.timeline",
      where: "support.timelineWhere",
      fields: {
        "pg_roadmap.timeline.div": {
          label: "support.fields.badge",
        },
        "pg_roadmap.timeline.h2": {
          label: "support.fields.heading",
        },
        "pg_roadmap.timeline.p": {
          label: "support.fields.intro",
        },
        "pg_roadmap.timeline.div@aria-label": {
          label: "support.fields.periodAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_roadmap.timeline.select@aria-label": {
          label: "support.fields.themeAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_roadmap.timeline.option": {
          label: "support.fields.themeAll",
        },
        "pg_roadmap.timeline.option-2": {
          label: "support.fields.themeBrand",
        },
        "pg_roadmap.timeline.option-3": {
          label: "support.fields.themeWebsite",
        },
        "pg_roadmap.timeline.option-4": {
          label: "support.fields.themePlatform",
        },
        "pg_roadmap.timeline.option-5": {
          label: "support.fields.themeHosting",
        },
        "pg_roadmap.timeline.option-6": {
          label: "support.fields.themeAccess",
        },
        "pg_roadmap.timeline.option-7": {
          label: "support.fields.themeSupport",
        },
        "pg_roadmap.timeline.input@aria-label": {
          label: "support.fields.milestoneSearchAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_roadmap.timeline.input@placeholder": {
          label: "support.fields.milestoneSearch",
        },
        "pg_roadmap.timeline.button@aria-label": {
          label: "support.fields.clearSearch",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_roadmap.timeline.div@aria-label-2": {
          label: "support.fields.yearsAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_roadmap.timeline.div@aria-label-3": {
          label: "support.fields.statusAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_roadmap.timeline.div-2": {
          label: "support.fields.noMilestones",
          hint: "support.hints.emptyMilestones",
          state: "conditional",
        },
        "pg_roadmap.timeline.p-2": {
          label: "support.fields.noMilestonesHelp",
          hint: "support.hints.emptyMilestones",
          state: "conditional",
        },
        "pg_roadmap.timeline.button": {
          label: "support.fields.clearFilters",
          hint: "support.hints.emptyMilestones",
          state: "conditional",
        },
      },
    },
    community: {
      title: "support.community",
      where: "support.communityWhere",
      fields: {
        "pg_roadmap.community.div": {
          label: "support.fields.badge",
        },
        "pg_roadmap.community.h2": {
          label: "support.fields.heading",
        },
        "pg_roadmap.community.p": {
          label: "support.fields.intro",
        },
        "pg_roadmap.community.input@aria-label": {
          label: "support.fields.ideaSearchAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_roadmap.community.input@placeholder": {
          label: "support.fields.ideaSearch",
        },
        "pg_roadmap.community.div-2": {
          label: "support.fields.noIdeas",
          hint: "support.hints.emptyIdeas",
          state: "conditional",
        },
        "pg_roadmap.community.div-3": {
          label: "support.fields.boardNote",
          hint: "support.hints.boardNote",
          state: "unused",
        },
      },
    },
    "submit-idea": {
      title: "support.ideaForm",
      where: "support.ideaFormWhere",
      fields: {
        "pg_roadmap.submit-idea.div": {
          label: "support.fields.badge",
        },
        "pg_roadmap.submit-idea.h2": {
          label: "support.fields.heading",
        },
        "pg_roadmap.submit-idea.p": {
          label: "support.fields.intro",
        },
        "pg_roadmap.submit-idea.div-2": {
          label: "support.fields.nextStep",
        },
        "pg_roadmap.submit-idea.div-3": {
          label: "support.fields.nextStep",
        },
        "pg_roadmap.submit-idea.div-4": {
          label: "support.fields.nextStep",
        },
        "pg_roadmap.submit-idea.div-5": {
          label: "support.fields.ideaKicker",
        },
        "pg_roadmap.submit-idea.div-6": {
          label: "support.fields.ideaTitle",
        },
        "pg_roadmap.submit-idea.div-7": {
          label: "support.fields.ideaTopic",
        },
        "pg_roadmap.submit-idea.div@aria-label": {
          label: "support.fields.ideaTopicAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_roadmap.submit-idea.input@placeholder": {
          label: "support.fields.namePlaceholder",
        },
        "pg_roadmap.submit-idea.input@placeholder-2": {
          label: "support.fields.emailPlaceholder",
        },
        "pg_roadmap.submit-idea.textarea@placeholder": {
          label: "support.fields.messagePlaceholder",
        },
        "pg_roadmap.submit-idea.button": {
          label: "support.fields.submitIdea",
        },
        "pg_roadmap.submit-idea.p-2": {
          label: "support.fields.retainedIdeaSuccess",
          hint: "support.hints.ideaSuccess",
          state: "unused",
        },
        "pg_roadmap.submit-idea.button-2": {
          label: "support.fields.anotherIdea",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_roadmap.submit-idea.div-8": {
          label: "support.fields.nextLinks",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_roadmap.submit-idea.a": {
          label: "support.fields.timelineLink",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_roadmap.submit-idea.a-2": {
          label: "support.fields.ideasLink",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
        "pg_roadmap.submit-idea.a-3": {
          label: "support.fields.contactLink",
          hint: "support.hints.confirmation",
          state: "conditional",
        },
      },
    },
    "section-1": {
      title: "support.comments",
      where: "support.commentsWhere",
      fields: {
        "pg_roadmap.section-1.h3": {
          label: "support.fields.retainedCommentsTitle",
          hint: "support.hints.comments",
          state: "unused",
        },
        "pg_roadmap.section-1.p": {
          label: "support.fields.retainedCommentsNote",
          hint: "support.hints.comments",
          state: "unused",
        },
        "pg_roadmap.section-1.p-2": {
          label: "support.fields.retainedCommentsEmpty",
          hint: "support.hints.comments",
          state: "unused",
        },
      },
      preview: false,
    },
  },
  pg_legal: {
    intro: {
      title: "support.cursor",
      where: "support.cursorWhere",
      fields: {
        "pg_legal.intro.div": {
          label: "support.fields.cursorText",
        },
        "pg_legal.intro.img@alt": {
          label: "support.fields.logoAlt",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_legal.intro.button@aria-label": {
          label: "support.fields.closeMenu",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_legal.intro.a": {
          label: "support.fields.menuContact",
        },
      },
      preview: false,
    },
    hero: {
      title: "support.legal",
      where: "support.legalWhere",
      fields: {
        "pg_legal.hero.p": {
          label: "support.fields.eyebrow",
        },
        "pg_legal.hero.h1": {
          label: "support.fields.heading",
        },
        "pg_legal.hero.p-2": {
          label: "support.fields.intro",
        },
        "pg_legal.legal.aside@aria-label": {
          label: "support.fields.legalAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_legal.legal.div": {
          label: "support.fields.legalContact",
        },
      },
    },
    legal: {
      title: "support.legalNavigation",
      where: "support.legalWhere",
      fields: {
        "pg_legal.legal.aside@aria-label": {
          label: "support.fields.legalAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_legal.legal.div": {
          label: "support.fields.legalContact",
        },
      },
    },
  },
  pg_signIn: {
    intro: {
      title: "support.cursor",
      where: "support.cursorWhere",
      fields: {
        "pg_signIn.intro.div": {
          label: "support.fields.cursorText",
        },
        "pg_signIn.intro.img@alt": {
          label: "support.fields.logoAlt",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_signIn.intro.button@aria-label": {
          label: "support.fields.closeMenu",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_signIn.intro.a": {
          label: "support.fields.menuContact",
        },
      },
      preview: false,
    },
    signin: {
      title: "support.account",
      where: "support.accountWhere",
      fields: {
        "pg_signIn.signin.div@aria-label": {
          label: "support.fields.accountAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_signIn.signin.label": {
          label: "support.fields.signupName",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "pg_signIn.signin.input@placeholder": {
          label: "support.fields.signupNameExample",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "pg_signIn.signin.input@placeholder-2": {
          label: "support.fields.emailPlaceholder",
        },
        "pg_signIn.signin.label-2": {
          label: "support.fields.confirmPassword",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "pg_signIn.signin.p": {
          label: "support.fields.accountNotice",
          hint: "support.hints.accountNotice",
        },
        "pg_signIn.signin.button": {
          label: "support.fields.accountBack",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.div": {
          label: "support.fields.nextLinks",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.a": {
          label: "support.fields.softwareLink",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.a-2": {
          label: "support.fields.supportLink",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.a-3": {
          label: "support.fields.homeLink",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "st_signIn.b1.s7": {
          label: "support.fields.signinShared",
          hint: "support.hints.signinShared",
        },
        "st_signIn.b2.s1": {
          label: "support.fields.signupTab",
          hint: "support.hints.signupTab",
        },
        "st_signIn.b2.s2": {
          label: "support.fields.recoverHeading",
          hint: "support.hints.recoverMode",
          state: "conditional",
        },
        "st_signIn.b2.s3": {
          label: "support.fields.signupHeading",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "st_signIn.b2.s4": {
          label: "support.fields.recoverIntro",
          hint: "support.hints.recoverMode",
          state: "conditional",
        },
        "st_signIn.b2.s5": {
          label: "support.fields.signupIntro",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "st_signIn.b2.s6": {
          label: "support.fields.signinIntro",
          hint: "support.hints.signinMode",
          state: "conditional",
        },
        "st_signIn.b2.s7": {
          label: "support.fields.recoverSubmit",
          hint: "support.hints.recoverMode",
          state: "conditional",
        },
        "st_signIn.b2.s8": {
          label: "support.fields.signupSubmit",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "st_signIn.b2.s21": {
          label: "support.fields.recoverBack",
          hint: "support.hints.recoverMode",
          state: "conditional",
        },
        "st_signIn.b2.s22": {
          label: "support.fields.recoverLink",
          hint: "support.hints.signinMode",
          state: "conditional",
        },
      },
    },
  },
  pg_signUp: {
    "shared-copy": {
      title: "support.account",
      where: "support.signupWhere",
      fields: {
        "pg_signIn.signin.div@aria-label": {
          label: "support.fields.accountAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_signIn.signin.label": {
          label: "support.fields.signupName",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "pg_signIn.signin.input@placeholder": {
          label: "support.fields.signupNameExample",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "pg_signIn.signin.input@placeholder-2": {
          label: "support.fields.emailPlaceholder",
        },
        "pg_signIn.signin.label-2": {
          label: "support.fields.confirmPassword",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "pg_signIn.signin.p": {
          label: "support.fields.accountNotice",
          hint: "support.hints.accountNotice",
        },
        "pg_signIn.signin.button": {
          label: "support.fields.accountBack",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.div": {
          label: "support.fields.nextLinks",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.a": {
          label: "support.fields.softwareLink",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.a-2": {
          label: "support.fields.supportLink",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.a-3": {
          label: "support.fields.homeLink",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
      },
    },
    signin: {
      title: "support.account",
      where: "support.signupWhere",
      fields: {
        "pg_signIn.signin.div@aria-label": {
          label: "support.fields.accountAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_signIn.signin.label": {
          label: "support.fields.signupName",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "pg_signIn.signin.input@placeholder": {
          label: "support.fields.signupNameExample",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "pg_signIn.signin.input@placeholder-2": {
          label: "support.fields.emailPlaceholder",
        },
        "pg_signIn.signin.label-2": {
          label: "support.fields.confirmPassword",
          hint: "support.hints.signup",
          state: "conditional",
        },
        "pg_signIn.signin.p": {
          label: "support.fields.accountNotice",
          hint: "support.hints.accountNotice",
        },
        "pg_signIn.signin.button": {
          label: "support.fields.accountBack",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.div": {
          label: "support.fields.nextLinks",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.a": {
          label: "support.fields.softwareLink",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.a-2": {
          label: "support.fields.supportLink",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
        "pg_signIn.signin.a-3": {
          label: "support.fields.homeLink",
          hint: "support.hints.accountDone",
          state: "conditional",
        },
      },
    },
  },
  pg_partners: {
    intro: {
      title: "support.partnerIntro",
      where: "support.partnerIntroWhere",
      fields: {
        "pg_partners.intro.title": {
          label: "support.fields.partnerTitle",
        },
        "pg_partners.intro.summary": {
          label: "support.fields.partnerSummary",
          hint: "support.hints.directory",
        },
        "pg_partners.intro.badge": {
          label: "support.fields.partnerBadge",
        },
        "pg_partners.intro.linkLabel": {
          label: "support.fields.directoryLink",
          hint: "support.hints.strip",
        },
        "pg_partners.intro.profileLabel": {
          label: "support.fields.profileAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_partners.intro.scrollLabel": {
          label: "support.fields.logosAria",
          hint: "support.hints.assistive",
          state: "assistive",
        },
        "pg_partners.intro.previousLabel": {
          label: "support.fields.previousLogos",
          hint: "support.hints.scrolling",
          state: "conditional",
        },
        "pg_partners.intro.nextLabel": {
          label: "support.fields.nextLogos",
          hint: "support.hints.scrolling",
          state: "conditional",
        },
        "pg_partners.intro.pauseLabel": {
          label: "support.fields.pauseLogos",
          hint: "support.hints.scrolling",
          state: "conditional",
        },
        "pg_partners.intro.playLabel": {
          label: "support.fields.resumeLogos",
          hint: "support.hints.scrolling",
          state: "conditional",
        },
        "pg_partners.intro.websiteLabel": {
          label: "support.fields.realWebsite",
          hint: "support.hints.realPartner",
          state: "conditional",
        },
        "pg_partners.intro.exampleWebsiteLabel": {
          label: "support.fields.exampleWebsite",
          hint: "support.hints.mockPartner",
          state: "conditional",
        },
        "pg_partners.intro.exampleAccountLabel": {
          label: "support.fields.exampleAccount",
          hint: "support.hints.mockPartner",
          state: "conditional",
        },
        "pg_partners.intro.externalLabel": {
          label: "support.fields.externalHint",
          hint: "support.hints.assistive",
          state: "assistive",
        },
      },
    },
    partners: {
      title: "support.partnerProfiles",
      where: "support.partnerProfilesWhere",
      fields: {
        "pg_partners.partners": {
          label: "support.fields.partnerName",
        },
        "pg_partners.partners.*": {
          label: "support.fields.partnerName",
        },
        "pg_partners.partners.*.id": {
          label: "support.fields.partnerId",
          hint: "support.hints.anchor",
        },
        "pg_partners.partners.*.name": {
          label: "support.fields.partnerName",
        },
        "pg_partners.partners.*.category": {
          label: "support.fields.partnerCategory",
          hint: "support.hints.directory",
        },
        "pg_partners.partners.*.summary": {
          label: "support.fields.partnerDescription",
          hint: "support.hints.directory",
        },
        "pg_partners.partners.*.logo": {
          label: "support.fields.partnerLogo",
          hint: "support.hints.logo",
        },
        "pg_partners.partners.*.website": {
          label: "support.fields.partnerWebsite",
          hint: "support.hints.external",
          state: "conditional",
        },
        "pg_partners.partners.*.visible": {
          label: "support.fields.partnerVisible",
        },
        "pg_partners.partners.*.mock": {
          label: "support.fields.partnerMock",
        },
        "pg_partners.partners.*.accounts": {
          label: "support.fields.partnerAccounts",
          hint: "support.hints.social",
          state: "conditional",
        },
        "pg_partners.partners.*.accounts.*": {
          label: "support.fields.partnerAccounts",
        },
        "pg_partners.partners.*.accounts.*.label": {
          label: "support.fields.accountPlatform",
          hint: "support.hints.social",
          state: "conditional",
        },
        "pg_partners.partners.*.accounts.*.url": {
          label: "support.fields.accountUrl",
          hint: "support.hints.social",
          state: "conditional",
        },
      },
    },
  },
  pg_faq: {
    hero: {
      title: "support.faqIntro",
      where: "support.faqIntroWhere",
      fields: {
        "pg_faq.hero.title": {
          label: "support.fields.faqTitle",
        },
        "pg_faq.hero.intro": {
          label: "support.fields.faqIntro",
        },
      },
    },
    "shared-copy": {
      title: "support.faqQuestions",
      where: "support.faqQuestionsWhere",
      fields: {
        "pg_home.faqs": {
          label: "support.fields.question",
        },
        "pg_home.faqs.*": {
          label: "support.fields.question",
        },
        "pg_home.faqs.*.question": {
          label: "support.fields.question",
        },
        "pg_home.faqs.*.answer": {
          label: "support.fields.answer",
          state: "conditional",
        },
      },
    },
    faqs: {
      title: "support.faqQuestions",
      where: "support.faqQuestionsWhere",
      fields: {
        "pg_home.faqs": {
          label: "support.fields.question",
        },
        "pg_home.faqs.*": {
          label: "support.fields.question",
        },
        "pg_home.faqs.*.question": {
          label: "support.fields.question",
        },
        "pg_home.faqs.*.answer": {
          label: "support.fields.answer",
          state: "conditional",
        },
      },
    },
    questions: {
      title: "support.faqQuestions",
      where: "support.faqQuestionsWhere",
      fields: {
        "pg_home.faqs": {
          label: "support.fields.question",
        },
        "pg_home.faqs.*": {
          label: "support.fields.question",
        },
        "pg_home.faqs.*.question": {
          label: "support.fields.question",
        },
        "pg_home.faqs.*.answer": {
          label: "support.fields.answer",
          state: "conditional",
        },
      },
    },
  },
};

export const SUPPORT_COPY: Record<string, string> = {
  "support.contact": "Contact — enquiry and sidebar",
  "support.contactWhere":
    "/contact · first section: introduction, enquiry form, starting-point cards, next steps and address.",
  "support.contactHeading": "Page heading and introduction",
  "support.form": "Enquiry form",
  "support.formWhere":
    "/contact · enquiry form on the left; confirmation replaces the form after a successful submission.",
  "support.paths": "Starting-point cards",
  "support.pathsWhere":
    "/contact · three selectable cards beside the enquiry form. Selecting one changes the form topic and its small heading.",
  "support.topics": "Enquiry topic choices",
  "support.topicsWhere":
    "/contact · selectable topic chips under the enquiry heading.",
  "support.rotation": "Contact — retained ticker text",
  "support.rotationWhere":
    "No current placement on /contact. The former ticker is no longer displayed. These source strings remain stored and some are shared elsewhere; editing them will not change the current contact heading.",
  "support.roadmapHero": "Roadmap — page introduction",
  "support.roadmapHeroWhere":
    "/roadmap · title and introduction above the milestone timeline.",
  "support.timeline": "Milestone timeline and filters",
  "support.timelineWhere":
    "/roadmap · first numbered section: period, year, theme and search controls above the milestone cards. Manage milestone content in Marketing → Roadmap.",
  "support.community": "Community ideas board",
  "support.communityWhere":
    "/roadmap · second numbered section: idea cards grouped by delivery status. Manage each idea and its visitor comments in Marketing → Ideas.",
  "support.ideaForm": "Suggest an idea — form and next steps",
  "support.ideaFormWhere":
    "/roadmap · third numbered section below the community board: explanation on the left, suggestion form on the right. Success links appear after submission.",
  "support.comments": "Retained comment-dialog text",
  "support.commentsWhere":
    "These saved fields belong to the former sample-comment dialog. The current idea discussion uses separate moderation and community messages, so editing these fields has no visible effect.",
  "support.legal": "Legal — introduction and document navigation",
  "support.legalWhere":
    "/legal and /legal/* · page heading above the document area, document-navigation labels and contact note below each document. Edit document titles and articles under Content → Legal.",
  "support.legalNavigation": "Legal document navigation and contact note",
  "support.account": "Account forms — shared sign-in and registration text",
  "support.accountWhere":
    "/sign-in and /sign-up · account form below the two account tabs. Name and confirmation fields appear on Create account. These screens share the Sign in content record.",
  "support.partnerIntro":
    "Partners — directory introduction and logo-strip controls",
  "support.partnerIntroWhere":
    "Home → Partners logo strip, and /legal/partners → directory heading and profile links. Hints below distinguish controls that appear only on the home strip from directory text.",
  "support.partnerProfiles": "Partner profiles — logos and directory",
  "support.partnerProfilesWhere":
    "Home → Partners shows visible partners’ logos. /legal/partners shows their names, categories, descriptions and external links. A partner needs a name and valid logo before either view displays it.",
  "support.faqIntro": "FAQ — page introduction",
  "support.faqIntroWhere":
    "/faq · title and introductory paragraph above the questions. This title also heads the shared FAQ section on Home.",
  "support.faqQuestions": "FAQ questions — shared with Home",
  "support.faqQuestionsWhere":
    "/faq → question accordion, and Home → FAQ section. These questions and answers are stored in Home and shared by both pages. Answers appear when a visitor expands a question.",
  "support.cursor": "Pointer label",
  "support.cursorWhere":
    "Custom pointer on desktop while hovering a linked card or project. This is not a page section; pointer settings store its text and destination separately from the old template copy.",
  "support.fields.eyebrow": "Small label above the section heading",
  "support.fields.heading": "Section heading",
  "support.fields.intro": "Section introduction",
  "support.fields.contactHeadingMain": "Contact page heading — main line",
  "support.fields.contactHeadingAccent": "Contact page heading — accent line",
  "support.fields.contactHeadingIntro":
    "Contact page introduction below the heading",
  "support.fields.badge": "Section number and label",
  "support.fields.formTitle": "Enquiry form heading",
  "support.fields.topicPrompt": "Topic choices heading",
  "support.fields.namePlaceholder": "Name field example",
  "support.fields.emailPlaceholder": "Email field example",
  "support.fields.companyPlaceholder": "Company field placeholder",
  "support.fields.phonePlaceholder": "Phone field placeholder",
  "support.fields.messagePlaceholder": "Message field prompt",
  "support.fields.sendEnquiry": "Send enquiry button",
  "support.fields.sendAnother": "Send another enquiry button",
  "support.fields.nextLinks": "Confirmation links heading",
  "support.fields.workLink": "Selected work link",
  "support.fields.insightsLink": "Insights link",
  "support.fields.softwareLink": "Explore software link",
  "support.fields.homeLink": "Back to Home link",
  "support.fields.pathsAria": "Starting-point choices — screen reader label",
  "support.fields.pathsHeading": "Starting-point cards heading",
  "support.fields.nextHeading": "Next steps heading",
  "support.fields.nextStep": "Next step — number, title and explanation",
  "support.fields.addressHeading": "Visit or call heading",
  "support.fields.address": "Contact address",
  "support.fields.pathId": "Starting-point key",
  "support.fields.pathIcon": "Starting-point card icon",
  "support.fields.pathTitle": "Card title and selected form heading",
  "support.fields.pathBody": "Starting-point card description",
  "support.fields.pathAudience": "Retained audience caption",
  "support.fields.pathTopic": "Topic selected by this card",
  "support.fields.topics": "Topic choices in the enquiry form",
  "support.fields.rotatingWord": "Retained ticker item",
  "support.fields.periodAria": "Period control — screen reader label",
  "support.fields.themeAria": "Theme filter — screen reader label",
  "support.fields.themeAll": "All themes option",
  "support.fields.themeBrand": "Brand theme option",
  "support.fields.themeWebsite": "Website theme option",
  "support.fields.themePlatform": "Platform theme option",
  "support.fields.themeHosting": "Hosting theme option",
  "support.fields.themeAccess": "Accessibility theme option",
  "support.fields.themeSupport": "Support theme option",
  "support.fields.milestoneSearchAria":
    "Milestone search — screen reader label",
  "support.fields.milestoneSearch": "Milestone search placeholder",
  "support.fields.clearSearch": "Clear search — accessible button label",
  "support.fields.yearsAria": "Year choices — screen reader label",
  "support.fields.statusAria": "Delivery status summary — screen reader label",
  "support.fields.noMilestones": "No matching milestones title",
  "support.fields.noMilestonesHelp": "No matching milestones explanation",
  "support.fields.clearFilters": "Clear milestone filters button",
  "support.fields.ideaSearchAria": "Ideas search — screen reader label",
  "support.fields.ideaSearch": "Ideas search placeholder",
  "support.fields.noIdeas": "No matching ideas message",
  "support.fields.boardNote": "Retained community-board note",
  "support.fields.roadmapNote": "Retained roadmap introduction note",
  "support.fields.ideaKicker": "Small label above the suggestion form",
  "support.fields.ideaTitle": "Suggestion form heading",
  "support.fields.ideaTopic": "Suggestion category choices heading",
  "support.fields.ideaTopicAria": "Suggestion categories — screen reader label",
  "support.fields.submitIdea": "Submit idea button",
  "support.fields.retainedIdeaSuccess": "Retained idea-submission confirmation",
  "support.fields.anotherIdea": "Submit another idea button",
  "support.fields.timelineLink": "Explore timeline confirmation link",
  "support.fields.ideasLink": "Vote on ideas confirmation link",
  "support.fields.contactLink": "Contact link",
  "support.fields.retainedCommentsTitle": "Retained comments heading",
  "support.fields.retainedCommentsNote": "Retained sample-discussion note",
  "support.fields.retainedCommentsEmpty": "Retained empty-comments message",
  "support.fields.legalAria": "Legal document tabs — screen reader label",
  "support.fields.legalContact": "Contact note below legal document",
  "support.fields.accountAria": "Account tabs — screen reader label",
  "support.fields.signupName": "Create account — name field label",
  "support.fields.signupNameExample": "Create account — name field example",
  "support.fields.confirmPassword": "Create account — confirm password label",
  "support.fields.accountNotice": "Account form information note",
  "support.fields.accountBack": "Account confirmation — back button",
  "support.fields.supportLink": "Get support link",
  "support.fields.partnerTitle": "Partners heading",
  "support.fields.partnerSummary": "Partner directory introduction",
  "support.fields.partnerBadge": "Mock partner badge",
  "support.fields.directoryLink": "View all partners link",
  "support.fields.profileAria": "Logo profile link — screen reader prefix",
  "support.fields.logosAria": "Logo strip — screen reader label",
  "support.fields.previousLogos": "Previous logos button label",
  "support.fields.nextLogos": "Next logos button label",
  "support.fields.pauseLogos": "Pause logo scrolling button label",
  "support.fields.resumeLogos": "Resume logo scrolling button label",
  "support.fields.realWebsite": "Real partner website link label",
  "support.fields.exampleWebsite": "Mock partner website link label",
  "support.fields.exampleAccount": "Mock social account label prefix",
  "support.fields.externalHint": "External profile links — screen reader hint",
  "support.fields.partnerId": "Partner profile anchor",
  "support.fields.partnerName": "Partner name and logo alternative text",
  "support.fields.partnerCategory": "Partner category in directory",
  "support.fields.partnerDescription": "Partner description in directory",
  "support.fields.partnerLogo": "Partner logo image path",
  "support.fields.partnerWebsite": "Partner external website address",
  "support.fields.partnerVisible":
    "Show this partner on Home and in the directory",
  "support.fields.partnerMock": "Use example labels for this partner",
  "support.fields.partnerAccounts": "Social profile links in directory",
  "support.fields.accountPlatform": "Social platform link label",
  "support.fields.accountUrl": "Social profile web address",
  "support.fields.faqTitle": "FAQ page and Home section heading",
  "support.fields.faqIntro": "FAQ page introductory paragraph",
  "support.fields.question": "Question shown on the closed accordion row",
  "support.fields.answer": "Answer shown when the question is expanded",
  "support.fields.closeDialog": "Milestone dialog close — screen reader label",
  "support.fields.sampleStatusAria":
    "Sample milestone status — screen reader label",
  "support.fields.sampleWarning": "Sample milestone disclaimer",
  "support.fields.returnRoadmap": "Return to roadmap dialog button",
  "support.fields.cursorText": "Desktop pointer label",
  "support.fields.logoAlt": "Mobile menu logo alternative text",
  "support.fields.closeMenu": "Mobile menu close — screen reader label",
  "support.fields.menuContact": "Mobile menu contact button",
  "support.hints.confirmation":
    "Appears after a successful form submission, in place of the form.",
  "support.hints.assistive":
    "Accessible name for assistive technology; it is not printed as a visible heading.",
  "support.hints.pathId":
    "Internal selection key. It is not shown to visitors; keep existing keys stable.",
  "support.hints.pathAudience":
    "Saved for compatibility. The current starting-point card shows its title and description, but does not display this caption.",
  "support.hints.pathTopic":
    "Behavior only: selects the matching topic chip when this card is chosen. Use an exact label from Enquiry topic choices.",
  "support.hints.roadmapNote":
    "Retained from the sample roadmap. The current page uses its community status notice instead; editing this saved text has no visible effect.",
  "support.hints.emptyMilestones":
    "Appears in the timeline only when the current period, theme or search has no matching milestones.",
  "support.hints.emptyIdeas":
    "Appears inside a delivery-status column when no idea in that column matches the search.",
  "support.hints.boardNote":
    "Retained from the sample board. The current board uses the community voting and moderation notice instead.",
  "support.hints.ideaSuccess":
    "Retained from the old success screen. The current confirmation uses the community submission receipt instead.",
  "support.hints.comments":
    "No current website placement: IdeaDiscussion now supplies the heading, moderation notice and empty state.",
  "support.hints.signup":
    "Only shown on /sign-up → Create account. It is hidden on the normal sign-in and password-recovery forms.",
  "support.hints.accountNotice":
    "Information note below the form submit button, shared by sign-in, registration and password recovery.",
  "support.hints.accountDone":
    "Shown in the account status panel when this browser already has a customer identity. New sign-ins and registrations normally continue to the suite.",
  "support.hints.strip":
    "Home → Partners logo strip, near the bottom of the page.",
  "support.hints.directory":
    "/legal/partners → partner directory; this text is not shown in the home logo strip.",
  "support.hints.scrolling":
    "Home logo strip only. Scroll buttons appear when the logos overflow. Pause and resume are hidden when reduced motion is enabled.",
  "support.hints.realPartner":
    "Directory website link when the partner is visible, has a valid website and Mock partner is off.",
  "support.hints.mockPartner":
    "Directory external link when Mock partner is on; example labels help visitors recognize fictional profiles.",
  "support.hints.anchor":
    "Creates the /legal/partners#… destination used when a visitor selects this logo on Home. Keep an existing ID stable.",
  "support.hints.logo":
    "Shown in the home logo strip and partner directory. Use an /assets/ path or an HTTPS image address; invalid or missing logos hide the partner.",
  "support.hints.external":
    "Only valid external web addresses are displayed. Empty or invalid addresses hide the link.",
  "support.hints.social":
    "Optional directory link. Both platform name and a valid external address are required for the link to appear.",
  "support.hints.sampleDialog":
    "Milestone detail dialog. Open a milestone card; the sample disclaimer appears only for sample items.",
  "support.hints.contactTicker":
    "No current placement on Contact. This source is retained and may also supply other website text; do not delete or merge it solely because the Contact ticker is hidden.",
  "support.hints.contactHeading":
    "/contact · large two-line heading and paragraph above the enquiry form. Saved in the existing Contact text source.",
  "support.accountModeCopy": "Account tabs, headings and actions",
  "support.signupWhere":
    "/sign-up · shared registration form. Name and confirmation fields belong here. Edit account-tab labels, mode headings, introductions and submit text in Pages → Sign in; those existing text sources serve both screens.",
  "support.fields.signinShared": "Sign-in tab, heading and submit button",
  "support.fields.signupTab": "Create account tab label",
  "support.fields.recoverHeading": "Password recovery form heading",
  "support.fields.signupHeading": "Create account form heading",
  "support.fields.recoverIntro": "Password recovery introduction",
  "support.fields.signupIntro": "Create account introduction",
  "support.fields.signinIntro": "Sign-in introduction",
  "support.fields.recoverSubmit": "Send reset link button",
  "support.fields.signupSubmit": "Create account submit button",
  "support.fields.recoverBack": "Back to sign in recovery link",
  "support.fields.recoverLink": "Reset password link",
  "support.hints.signinShared":
    "One existing shared string: labels the Sign in tab on both account screens, the normal sign-in heading and its submit button. Changing it updates all three places.",
  "support.hints.signupTab":
    "Account tab row on /sign-in and /sign-up. This selects the registration screen; it is separate from the registration form submit button.",
  "support.hints.recoverMode":
    "/sign-in → select Reset password. Appears in the password-recovery form, before the visitor continues to recovery in the suite.",
  "support.hints.signinMode":
    "/sign-in → normal Sign in form. Hidden while Create account or password recovery is selected.",
};
