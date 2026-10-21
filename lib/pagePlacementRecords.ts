import type { PagePlacementMap } from "./pagePlacementTypes";

/** Current website placement for reusable content records. Wildcards preserve record and list identity. */
export const RECORD_PLACEMENTS: PagePlacementMap = {
  "type:serviceFamily": {
    details: {
      title: "records.sections.family",
      where: "records.where.family",
      fields: {
        "*.name": {
          label: "records.fields.familyName",
          hint: "records.hints.familyName",
        },
        "*.short": {
          label: "records.fields.familyShort",
          hint: "records.hints.familyShort",
        },
        "*.kicker": {
          label: "records.fields.familyKicker",
          hint: "records.hints.familyKicker",
        },
        "*.title": {
          label: "records.fields.familyTitle",
          hint: "records.hints.familyTitle",
        },
        "*.intro": {
          label: "records.fields.familyIntro",
          hint: "records.hints.familyIntro",
        },
        "*.icon": {
          label: "records.fields.familyIcon",
          hint: "records.hints.familyIcon",
        },
        "*.image.src": {
          label: "records.fields.familyImage",
          hint: "records.hints.familyImage",
        },
        "*.image.alt": {
          label: "records.fields.imageAlt",
          hint: "records.hints.imageAlt",
          state: "assistive",
        },
      },
      previewTarget: "class:content-heading",
    },
  },
  "type:service": {
    overview: {
      title: "records.sections.service",
      where: "records.where.service",
      fields: {
        "*.name": {
          label: "records.fields.serviceName",
        },
        "*.outcome": {
          label: "records.fields.outcome",
          hint: "records.hints.serviceOutcome",
        },
        "*.summary": {
          label: "records.fields.summary",
          hint: "records.hints.serviceSummary",
        },
        "*.capabilities": {
          label: "records.fields.capabilities",
          hint: "records.hints.serviceCapabilities",
        },
      },
      previewTarget: "class:content-heading",
    },
  },
  "type:softwareModule": {
    details: {
      title: "records.sections.software",
      where: "records.where.software",
      fields: {
        "*.name": {
          label: "records.fields.softwareName",
          hint: "records.hints.softwareName",
        },
        "*.formal": {
          label: "records.fields.formal",
          hint: "records.hints.softwareFormal",
        },
        "*.shortLabel": {
          label: "records.fields.shortLabel",
          hint: "records.hints.softwareShortLabel",
        },
        "*.category": {
          label: "records.fields.category",
        },
        "*.title": {
          label: "records.fields.softwareTitle",
          hint: "records.hints.softwareTitle",
        },
        "*.short": {
          label: "records.fields.short",
        },
        "*.description": {
          label: "records.fields.description",
        },
        "*.tasks": {
          label: "records.fields.tasks",
          hint: "records.hints.softwareTasks",
        },
        "*.icon": {
          label: "records.fields.softwareIcon",
          hint: "records.hints.softwareIcon",
        },
        "*.image.src": {
          label: "records.fields.softwareImage",
          hint: "records.hints.softwareImage",
        },
        "*.image.alt": {
          label: "records.fields.imageAlt",
          hint: "records.hints.imageAlt",
          state: "assistive",
        },
      },
      previewTarget: "class:content-heading",
    },
    highlights: {
      title: "records.sections.highlights",
      where: "records.where.highlights",
      fields: {
        "*.highlights": {
          label: "records.fields.highlights",
        },
        "*.highlights.*": {
          label: "records.fields.highlights",
        },
        "*.highlights.*.title": {
          label: "records.fields.featureTitle",
        },
        "*.highlights.*.body": {
          label: "records.fields.featureBody",
        },
      },
      previewTarget: "id:capabilities",
    },
    useCases: {
      title: "records.sections.useCases",
      where: "records.where.useCases",
      fields: {
        "*.useCases": {
          label: "records.fields.useCases",
        },
        "*.useCases.*": {
          label: "records.fields.useCases",
        },
        "*.useCases.*.title": {
          label: "records.fields.useCaseTitle",
        },
        "*.useCases.*.body": {
          label: "records.fields.useCaseBody",
          state: "conditional",
        },
      },
      previewTarget: "id:demo",
    },
  },
  "type:article": {
    details: {
      title: "records.sections.article",
      where: "records.where.article",
      fields: {
        "*.name": {
          label: "records.fields.articleTitle",
        },
        "*.excerpt": {
          label: "records.fields.excerpt",
        },
        "*.takeaways": {
          label: "records.fields.takeaways",
        },
        "*.category": {
          label: "records.fields.articleCategory",
          hint: "records.hints.articleCategory",
        },
        "*.publishedOn": {
          label: "records.fields.articleDate",
          hint: "records.hints.articleDate",
        },
        "*.readingMinutes": {
          label: "records.fields.readingMinutes",
          hint: "records.hints.readingMinutes",
        },
        "*.image.src": {
          label: "records.fields.articleImage",
          hint: "records.hints.articleImage",
        },
        "*.image.alt": {
          label: "records.fields.imageAlt",
          hint: "records.hints.imageAlt",
          state: "assistive",
        },
      },
      previewTarget: "class:content-heading",
    },
    body: {
      title: "records.sections.articleBody",
      where: "records.where.articleBody",
      fields: {
        "*.sections": {
          label: "records.fields.articleSections",
        },
        "*.sections.*": {
          label: "records.fields.articleSections",
        },
        "*.sections.*.heading": {
          label: "records.fields.sectionHeading",
        },
        "*.sections.*.paragraphs": {
          label: "records.fields.paragraphs",
          hint: "records.hints.articleParagraphs",
          state: "conditional",
        },
        "*.sections.*.paragraphs.*": {
          label: "records.fields.paragraph",
          hint: "records.hints.articleParagraphs",
          state: "conditional",
        },
        "*.sections.*.blocks": {
          label: "records.fields.blocks",
        },
        "*.sections.*.blocks.*": {
          label: "records.fields.blocks",
        },
        "*.sections.*.blocks.*.text": {
          label: "records.fields.blockText",
        },
        "*.sections.*.blocks.*.src": {
          label: "records.fields.mediaSource",
        },
        "*.sections.*.blocks.*.alt": {
          label: "records.fields.mediaAlt",
          hint: "records.hints.articleAlt",
          state: "assistive",
        },
        "*.sections.*.blocks.*.caption": {
          label: "records.fields.mediaCaption",
        },
      },
      previewTarget: "id:article",
    },
  },
  "type:legalDocument": {
    details: {
      title: "records.sections.legal",
      where: "records.where.legal",
      fields: {
        "*.name": {
          label: "records.fields.legalTitle",
        },
        "*.summary": {
          label: "records.fields.legalSummary",
        },
        "*.versionLabel": {
          label: "records.fields.version",
          hint: "records.hints.legalVersion",
        },
        "*.effectiveFrom": {
          label: "records.fields.effective",
          hint: "records.hints.legalVersion",
        },
      },
      previewTarget: "id:legal",
    },
    sections: {
      title: "records.sections.legalBody",
      where: "records.where.legalBody",
      fields: {
        "*.sections": {
          label: "records.fields.legalSections",
        },
        "*.sections.*": {
          label: "records.fields.legalSections",
        },
        "*.sections.*.heading": {
          label: "records.fields.legalHeading",
        },
        "*.sections.*.body": {
          label: "records.fields.legalBody",
        },
      },
      previewTarget: "id:legal",
    },
  },
  "type:roadmapItem": {
    details: {
      title: "records.sections.roadmap",
      where: "records.where.roadmap",
      fields: {
        "*.name": {
          label: "records.fields.milestoneTitle",
        },
        "*.body": {
          label: "records.fields.milestoneBody",
          hint: "records.hints.roadmapBody",
        },
        "*.timing": {
          label: "records.fields.timing",
        },
        "*.theme": {
          label: "records.fields.theme",
          hint: "records.hints.roadmapTheme",
        },
        "*.status": {
          label: "records.fields.status",
        },
        "*.period": {
          label: "records.fields.period",
        },
        "*.year": {
          label: "records.fields.year",
        },
        "*.progress": {
          label: "records.fields.progress",
        },
      },
      preview: false,
    },
  },
  "type:caseStudy": {
    brief: {
      title: "records.sections.caseBrief",
      where: "records.where.caseBrief",
      fields: {
        "*.name": {
          label: "records.fields.projectName",
          hint: "records.hints.projectCard",
        },
        "*.category": {
          label: "records.fields.projectCategory",
          hint: "records.hints.projectCard",
        },
        "*.sector": {
          label: "records.fields.sector",
          hint: "records.hints.projectCard",
        },
        "*.summary": {
          label: "records.fields.projectSummary",
          hint: "records.hints.projectCard",
        },
        "*.transformation": {
          label: "records.fields.transformation",
        },
        "*.client": {
          label: "records.fields.client",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.timeline": {
          label: "records.fields.timeline",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.team": {
          label: "records.fields.team",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.challenge": {
          label: "records.fields.challenge",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.goal": {
          label: "records.fields.goal",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.role": {
          label: "records.fields.role",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.highlight": {
          label: "records.fields.highlight",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.highlight.value": {
          label: "records.fields.highlightValue",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.highlight.label": {
          label: "records.fields.highlightLabel",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.image.src": {
          label: "records.fields.projectImage",
          hint: "records.hints.projectImage",
        },
        "*.image.alt": {
          label: "records.fields.imageAlt",
          hint: "records.hints.imageAlt",
          state: "assistive",
        },
      },
      previewTarget: "class:cs-brief",
    },
    approach: {
      title: "records.sections.approach",
      where: "records.where.approach",
      fields: {
        "*.approach": {
          label: "records.fields.approachContent",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.approach.title": {
          label: "records.fields.blockTitle",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.approach.intro": {
          label: "records.fields.blockIntro",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.approach.steps": {
          label: "records.fields.steps",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.approach.steps.*": {
          label: "records.fields.steps",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.approach.steps.*.title": {
          label: "records.fields.stepTitle",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.approach.steps.*.detail": {
          label: "records.fields.stepDetail",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.approach.steps.*.outputs": {
          label: "records.fields.stepOutputs",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.approach.steps.*.when": {
          label: "records.fields.stepWhen",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.approach.steps.*.log": {
          label: "records.fields.stepLog",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.approach.weeks": {
          label: "records.fields.weeks",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.approach.steps.*.start": {
          label: "records.fields.stepStart",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.approach.steps.*.end": {
          label: "records.fields.stepEnd",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.approach.steps.*.id": {
          label: "records.fields.ticket",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.approach.steps.*.state": {
          label: "records.fields.ticketState",
          hint: "records.hints.support",
          state: "conditional",
        },
      },
      previewTarget: "class:cs-approach",
      preview: false,
    },
    delivered: {
      title: "records.sections.delivered",
      where: "records.where.delivered",
      fields: {
        "*.delivered": {
          label: "records.fields.deliveredContent",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.delivered.title": {
          label: "records.fields.blockTitle",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.delivered.intro": {
          label: "records.fields.blockIntro",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.delivered.palette": {
          label: "records.fields.palette",
          hint: "records.hints.design",
          state: "conditional",
        },
        "*.delivered.palette.*": {
          label: "records.fields.palette",
          hint: "records.hints.design",
          state: "conditional",
        },
        "*.delivered.palette.*.name": {
          label: "records.fields.colorName",
          hint: "records.hints.design",
          state: "conditional",
        },
        "*.delivered.palette.*.hex": {
          label: "records.fields.colorHex",
          hint: "records.hints.design",
          state: "conditional",
        },
        "*.delivered.typeface": {
          label: "records.fields.typeface",
          hint: "records.hints.design",
          state: "conditional",
        },
        "*.delivered.weights": {
          label: "records.fields.weights",
          hint: "records.hints.design",
          state: "conditional",
        },
        "*.delivered.touchpoints": {
          label: "records.fields.touchpoints",
          hint: "records.hints.design",
          state: "conditional",
        },
        "*.delivered.touchpoints.*": {
          label: "records.fields.touchpoints",
          hint: "records.hints.design",
          state: "conditional",
        },
        "*.delivered.touchpoints.*.label": {
          label: "records.fields.touchpointLabel",
          hint: "records.hints.design",
          state: "conditional",
        },
        "*.delivered.touchpoints.*.image": {
          label: "records.fields.touchpointImage",
          hint: "records.hints.touchpointImage",
          state: "conditional",
        },
        "*.delivered.core": {
          label: "records.fields.core",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.delivered.layers": {
          label: "records.fields.layers",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.delivered.modules": {
          label: "records.fields.modules",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.delivered.modules.*": {
          label: "records.fields.modules",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.delivered.modules.*.name": {
          label: "records.fields.moduleName",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.delivered.modules.*.icon": {
          label: "records.fields.moduleIcon",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.delivered.stack": {
          label: "records.fields.stack",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.delivered.week": {
          label: "records.fields.week",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.delivered.week.*": {
          label: "records.fields.week",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.delivered.week.*.day": {
          label: "records.fields.day",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.delivered.week.*.task": {
          label: "records.fields.task",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.delivered.week.*.items": {
          label: "records.fields.items",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.delivered.priorities": {
          label: "records.fields.priorities",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.delivered.priorities.*": {
          label: "records.fields.priorities",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.delivered.priorities.*.level": {
          label: "records.fields.priorityLevel",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.delivered.priorities.*.name": {
          label: "records.fields.priorityName",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.delivered.priorities.*.when": {
          label: "records.fields.priorityWhen",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.delivered.priorities.*.target": {
          label: "records.fields.priorityTarget",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.delivered.components": {
          label: "records.fields.components",
          hint: "records.hints.hosting",
          state: "conditional",
        },
        "*.delivered.components.*": {
          label: "records.fields.components",
          hint: "records.hints.hosting",
          state: "conditional",
        },
        "*.delivered.components.*.name": {
          label: "records.fields.componentName",
          hint: "records.hints.hosting",
          state: "conditional",
        },
        "*.delivered.components.*.detail": {
          label: "records.fields.componentDetail",
          hint: "records.hints.hosting",
          state: "conditional",
        },
        "*.delivered.components.*.state": {
          label: "records.fields.componentState",
          hint: "records.hints.hosting",
          state: "conditional",
        },
      },
      previewTarget: "class:cs-delivered",
      preview: false,
    },
    results: {
      title: "records.sections.results",
      where: "records.where.results",
      fields: {
        "*.results": {
          label: "records.fields.resultsContent",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.results.title": {
          label: "records.fields.blockTitle",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.results.intro": {
          label: "records.fields.blockIntro",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.results.metrics": {
          label: "records.fields.metrics",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.results.metrics.*": {
          label: "records.fields.metrics",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.results.metrics.*.value": {
          label: "records.fields.metricValue",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.results.metrics.*.label": {
          label: "records.fields.metricLabel",
          hint: "records.hints.fullStory",
          state: "conditional",
        },
        "*.results.shifts": {
          label: "records.fields.shifts",
          hint: "records.hints.shifts",
          state: "conditional",
        },
        "*.results.shifts.*": {
          label: "records.fields.shifts",
          hint: "records.hints.shifts",
          state: "conditional",
        },
        "*.results.shifts.*.0": {
          label: "records.fields.beforeText",
          hint: "records.hints.shifts",
          state: "conditional",
        },
        "*.results.shifts.*.1": {
          label: "records.fields.afterText",
          hint: "records.hints.shifts",
          state: "conditional",
        },
        "*.results.gauges": {
          label: "records.fields.gauges",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.results.gauges.*": {
          label: "records.fields.gauges",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.results.gauges.*.label": {
          label: "records.fields.gaugeLabel",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.results.gauges.*.value": {
          label: "records.fields.gaugeValue",
          hint: "records.hints.development",
          state: "conditional",
        },
        "*.results.kpis": {
          label: "records.fields.kpis",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.results.kpis.*": {
          label: "records.fields.kpis",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.results.kpis.*.label": {
          label: "records.fields.kpiLabel",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.results.kpis.*.before": {
          label: "records.fields.before",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.results.kpis.*.after": {
          label: "records.fields.after",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.results.kpis.*.change": {
          label: "records.fields.change",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.results.monthly": {
          label: "records.fields.monthly",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.results.monthly.label": {
          label: "records.fields.chartLabel",
          hint: "records.hints.marketing",
          state: "conditional",
        },
        "*.results.monthly.baseline": {
          label: "records.fields.baseline",
          hint: "records.hints.monthlyBaseline",
          state: "conditional",
        },
        "*.results.monthly.points": {
          label: "records.fields.points",
          hint: "records.hints.series",
          state: "conditional",
        },
        "*.results.monthly.points.*": {
          label: "records.fields.points",
          hint: "records.hints.series",
          state: "conditional",
        },
        "*.results.monthly.points.*.0": {
          label: "records.fields.pointLabel",
          hint: "records.hints.series",
          state: "conditional",
        },
        "*.results.monthly.points.*.1": {
          label: "records.fields.pointValue",
          hint: "records.hints.series",
          state: "conditional",
        },
        "*.results.funnel": {
          label: "records.fields.funnel",
          hint: "records.hints.funnel",
          state: "conditional",
        },
        "*.results.funnel.*": {
          label: "records.fields.funnel",
          hint: "records.hints.funnel",
          state: "conditional",
        },
        "*.results.funnel.*.0": {
          label: "records.fields.stageLabel",
          hint: "records.hints.funnel",
          state: "conditional",
        },
        "*.results.funnel.*.1": {
          label: "records.fields.stageValue",
          hint: "records.hints.funnel",
          state: "conditional",
        },
        "*.results.channels": {
          label: "records.fields.channels",
          hint: "records.hints.channels",
          state: "conditional",
        },
        "*.results.channels.*": {
          label: "records.fields.channels",
          hint: "records.hints.channels",
          state: "conditional",
        },
        "*.results.channels.*.0": {
          label: "records.fields.channelName",
          hint: "records.hints.channels",
          state: "conditional",
        },
        "*.results.channels.*.1": {
          label: "records.fields.channelShare",
          hint: "records.hints.channels",
          state: "conditional",
        },
        "*.results.comparisons": {
          label: "records.fields.comparisons",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.results.comparisons.*": {
          label: "records.fields.comparisons",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.results.comparisons.*.label": {
          label: "records.fields.comparisonLabel",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.results.comparisons.*.before": {
          label: "records.fields.before",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.results.comparisons.*.after": {
          label: "records.fields.after",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.results.comparisons.*.unit": {
          label: "records.fields.unit",
          hint: "records.hints.support",
          state: "conditional",
        },
        "*.results.chart": {
          label: "records.fields.chart",
          hint: "records.hints.hosting",
          state: "conditional",
        },
        "*.results.chart.label": {
          label: "records.fields.chartLabel",
          hint: "records.hints.hosting",
          state: "conditional",
        },
        "*.results.chart.cutover": {
          label: "records.fields.cutover",
          hint: "records.hints.chartCutover",
          state: "conditional",
        },
        "*.results.chart.points": {
          label: "records.fields.points",
          hint: "records.hints.series",
          state: "conditional",
        },
        "*.results.chart.points.*": {
          label: "records.fields.points",
          hint: "records.hints.series",
          state: "conditional",
        },
        "*.results.chart.points.*.0": {
          label: "records.fields.pointLabel",
          hint: "records.hints.series",
          state: "conditional",
        },
        "*.results.chart.points.*.1": {
          label: "records.fields.pointValue",
          hint: "records.hints.series",
          state: "conditional",
        },
      },
      previewTarget: "class:cs-results",
      preview: false,
    },
  },
};

export const RECORD_COPY: Record<string, string> = {
  "records.sections.family": "Service family — cards and detail introduction",
  "records.where.family":
    "/services → department cards, /services/'{family}' → family heading and service list, and About → capability cards. These fields describe the family; individual services are edited separately.",
  "records.sections.service": "Service — listing card and detail heading",
  "records.where.service":
    "/services → searchable service cards; /services/'{family}' → service cards; /services/'{family}'/'{service}' → service heading, introduction and capability labels. Pricing and package contents use a separate purchasing catalog.",
  "records.sections.software":
    "Software system — names, cards and introduction",
  "records.where.software":
    "Home → software diagram; /software → system cards; /software/'{system}' → detail heading, introduction and feature cards. Home uses Short label; the software page uses Formal name. Purchasing labels and prices come from a separate catalog.",
  "records.sections.highlights": "Software detail — feature cards",
  "records.where.highlights":
    "/software/'{system}' → feature section below the detail introduction. The first item is the large lead card; later items form the supporting cards. Task labels use the matching position in the system Tasks list.",
  "records.sections.useCases": "Software detail — use-case selector",
  "records.where.useCases":
    "/software/'{system}' → use-case section after the feature cards. Titles appear in the selector; the selected item supplies the visible title and description. Use-case images are chosen by the website template.",
  "records.sections.article": "Article — listing card and opening content",
  "records.where.article":
    "/insights → article cards; /insights/'{article}' → title, excerpt and takeaway panel near the beginning of the article. Article SEO is separate from these visible words.",
  "records.sections.articleBody": "Article detail — body sections and media",
  "records.where.articleBody":
    "/insights/'{article}' → reading column after the cover and takeaway panel. Section order controls reading order. Each section shows its heading, then its text, image and video blocks in order.",
  "records.sections.legal": "Legal document — navigation and introduction",
  "records.where.legal":
    "/legal/'{document}' → selected document title and introduction; the title also labels its entry in the legal document navigation. The page-level introduction is edited in Pages → Legal.",
  "records.sections.legalBody": "Legal document — numbered content sections",
  "records.where.legalBody":
    "/legal/'{document}' → document reading area below its title and summary. Every saved section supplies a heading and body paragraph; changing order changes document reading order.",
  "records.sections.roadmap":
    "Roadmap milestone — timeline card and detail dialog",
  "records.where.roadmap":
    "/roadmap → milestone timeline, filtered by period, year, theme and search. Selecting a milestone opens its detail dialog. These records are separate from community suggestions in Marketing → Ideas.",
  "records.sections.caseBrief":
    "Project — listing card, story heading and brief",
  "records.where.caseBrief":
    "/work → project cards; /work/'{project}' → project heading and Brief section. Client facts, challenge, goal, role and highlight require a full published story with approved or explicitly labelled sample results. Card-only projects do not show those story fields.",
  "records.sections.approach": "Project story — approach",
  "records.where.approach":
    "/work/'{project}' → section 02, after the Brief. Requires a full published story. The department determines its layout: design journal, development log, marketing schedule, support tickets or hosting runbook.",
  "records.sections.delivered": "Project story — delivered work",
  "records.where.delivered":
    "/work/'{project}' → section 03 after Approach. Requires a full published story. The department selects a design board, system architecture, campaign week, support priorities or hosting component-status view.",
  "records.sections.results": "Project story — results and charts",
  "records.where.results":
    "/work/'{project}' → section 04 after Delivered work. Requires a full published story. The department selects metrics, gauges, marketing charts, support comparisons or a hosting performance chart. Sample figures retain their sample label until approved.",
  "records.hints.fullStory":
    "Visible only in an eligible full published project story. Use the project’s existing display choice and approval workflow; entering text here does not publish the story.",
  "records.hints.familyName":
    "Family heading and breadcrumb on /services/'{family}'; also used by department cards and structured search metadata.",
  "records.hints.familyShort":
    "Short department label on service chips and navigation; also labels article categories associated with this family.",
  "records.hints.familyKicker":
    "Department-card eyebrow; also appears as the accent text on an individual service’s detail heading.",
  "records.hints.familyTitle":
    "Accent heading on the family detail page; also inserted into its service-list introduction.",
  "records.hints.familyIntro":
    "Description on the Services overview department card and related About capability cards. The current family-detail reading area uses the family Title in its introduction instead.",
  "records.hints.serviceOutcome":
    "Short outcome on the service directory card and family service row. The current detail page uses Summary for its introduction instead.",
  "records.hints.serviceSummary":
    "Description in the expanded family service row and in the service-detail introduction; also searchable from the service directory.",
  "records.hints.serviceCapabilities":
    "Capability labels on family service rows and the service-detail capability cards. These do not change the purchasing catalog’s deliverables or prices.",
  "records.hints.softwareName":
    "Record name used for structured search metadata and breadcrumb data. The current software page displays Formal name instead; Home displays Short label.",
  "records.hints.softwareFormal":
    "Visible software-page name: detail eyebrow, related-system cards, use-case panel and dynamic calls to action. Home’s diagram uses Short label separately.",
  "records.hints.softwareShortLabel":
    "Home → software diagram node label. It does not replace Formal name on /software or purchasing catalog labels.",
  "records.hints.softwareTitle":
    "Detail-page heading, split into main and accent sentences by the template; also supplies Home’s selected software panel heading.",
  "records.hints.softwareTasks":
    "Task labels in the Home software panel and software-detail feature cards. Feature cards use tasks by list position, so their ordering matters.",
  "records.hints.articleParagraphs":
    "Legacy paragraph list. Current article sections with Blocks display those blocks instead; the existing article editor converts legacy paragraphs to text blocks without changing their order.",
  "records.hints.articleAlt":
    "Image alternative text, or the accessible name of a video, inside the article reading column. It is separate from the visible caption.",
  "records.hints.legalVersion":
    "Document publishing and version-history metadata. Used by the document workflow even though the current Legal page does not print it in the document body.",
  "records.hints.roadmapBody":
    "Description on the milestone timeline card and in its detail dialog. This text is not an idea comment or a visitor suggestion.",
  "records.hints.roadmapTheme":
    "Theme badge and filter/search value on the timeline; use a recognized theme to match the website’s fixed theme-filter choices.",
  "records.hints.projectCard":
    "Project title, category, sector and summary appear in /work listing/search and the project header or Brief. These fields are independent of publishing a full narrative.",
  "records.hints.design":
    "Design department only, in the full published story’s Delivered work board.",
  "records.hints.development":
    "Development department only, in the full published story’s architecture or performance view.",
  "records.hints.marketing":
    "Digital marketing department only, in the full published story’s campaign schedule or results dashboard.",
  "records.hints.support":
    "IT support department only, in the full published story’s ticket log, priority list or before/after comparisons.",
  "records.hints.hosting":
    "Hosting department only, in the full published story’s migration runbook, component status or performance chart.",
  "records.hints.shifts":
    "Design Results → before/after rows. Each pair stores the old wording first and the new wording second.",
  "records.hints.chartCutover":
    "Hosting Results → migration marker on the performance chart. This is a point count separating before/after data, not a visible date label.",
  "records.hints.monthlyBaseline":
    "Marketing Results → monthly bars. Counts how many leading points use the baseline style; later points use the campaign style.",
  "records.hints.series":
    "Chart points are ordered label/value pairs. The label appears on the time axis; the number determines chart height and its accessible description.",
  "records.hints.funnel":
    "Marketing Results → conversion funnel. Each pair is stage label then numeric count; the website calculates the rate against the preceding stage.",
  "records.hints.channels":
    "Marketing Results → channel mix. Each pair stores the channel name then its percentage share; the value controls segment width and the visible percentage.",
  "records.hints.touchpointImage":
    "Design Delivered work → application image. The current renderer prefixes /assets/ to this stored filename; use the existing asset-path format.",
  "records.fields.familyName": "Family name",
  "records.fields.familyShort": "Short family label",
  "records.fields.familyKicker": "Department card eyebrow",
  "records.fields.familyTitle": "Family detail accent heading",
  "records.fields.familyIntro": "Family introduction and card description",
  "records.fields.serviceName": "Service card and detail title",
  "records.fields.outcome": "Service outcome",
  "records.fields.summary": "Service description",
  "records.fields.capabilities": "Capability labels",
  "records.fields.softwareName": "Record and search metadata name",
  "records.fields.formal": "Formal software-page name",
  "records.fields.shortLabel": "Home diagram short label",
  "records.fields.category": "System category label",
  "records.fields.softwareTitle": "System detail and Home panel heading",
  "records.fields.short": "System tagline",
  "records.fields.description": "System introduction",
  "records.fields.tasks": "Included task labels",
  "records.fields.highlights": "Feature cards",
  "records.fields.featureTitle": "Feature card heading",
  "records.fields.featureBody": "Feature card description",
  "records.fields.useCases": "Selectable use cases",
  "records.fields.useCaseTitle": "Use-case selector and panel title",
  "records.fields.useCaseBody": "Selected use-case description",
  "records.fields.articleTitle": "Article card and detail title",
  "records.fields.excerpt": "Article card excerpt and opening summary",
  "records.fields.takeaways": "Article takeaway list",
  "records.fields.articleSections": "Article reading sections",
  "records.fields.sectionHeading": "Reading section heading",
  "records.fields.paragraphs": "Legacy article paragraphs",
  "records.fields.paragraph": "Article paragraph",
  "records.fields.blocks": "Ordered text and media blocks",
  "records.fields.blockText": "Text block paragraph",
  "records.fields.mediaSource": "Article image or video source",
  "records.fields.mediaAlt": "Article media alternative text",
  "records.fields.mediaCaption": "Visible caption below article media",
  "records.fields.legalTitle": "Document title and navigation label",
  "records.fields.legalSummary": "Document opening summary",
  "records.fields.legalSections": "Document content sections",
  "records.fields.legalHeading": "Document section heading",
  "records.fields.legalBody": "Document section body",
  "records.fields.version": "Document publishing version",
  "records.fields.effective": "Document effective date",
  "records.fields.milestoneTitle": "Timeline card and dialog title",
  "records.fields.milestoneBody": "Milestone detail description",
  "records.fields.timing": "Milestone timing label",
  "records.fields.theme": "Milestone theme badge and filter value",
  "records.fields.status": "Milestone delivery status",
  "records.fields.period": "Timeline period grouping",
  "records.fields.year": "Timeline year grouping",
  "records.fields.progress": "Milestone progress indicator",
  "records.fields.projectName": "Project card and story title",
  "records.fields.projectCategory": "Project category chip",
  "records.fields.sector": "Project sector label",
  "records.fields.projectSummary": "Project card and Brief summary",
  "records.fields.transformation": "Brief section headline",
  "records.fields.client": "Brief facts — client",
  "records.fields.timeline": "Brief facts — timeline",
  "records.fields.team": "Brief facts — team",
  "records.fields.challenge": "Brief — challenge explanation",
  "records.fields.goal": "Brief — project goal",
  "records.fields.role": "Brief — team role",
  "records.fields.highlight": "Brief highlight card",
  "records.fields.highlightValue": "Highlight value",
  "records.fields.highlightLabel": "Highlight explanation",
  "records.fields.blockTitle": "Story section heading lines",
  "records.fields.blockIntro": "Story section introductory paragraph",
  "records.fields.steps": "Approach steps",
  "records.fields.stepTitle": "Approach step title",
  "records.fields.stepDetail": "Approach step explanation",
  "records.fields.stepOutputs": "Step output labels",
  "records.fields.stepWhen": "Step date or phase label",
  "records.fields.stepLog": "Development step completion log",
  "records.fields.weeks": "Campaign schedule length in weeks",
  "records.fields.stepStart": "Campaign step start week",
  "records.fields.stepEnd": "Campaign step end week",
  "records.fields.ticket": "Support ticket reference",
  "records.fields.ticketState": "Support ticket status label",
  "records.fields.palette": "Design palette swatches",
  "records.fields.colorName": "Swatch name",
  "records.fields.colorHex": "Swatch color and HEX label",
  "records.fields.typeface": "Typography specimen font name",
  "records.fields.weights": "Typography specimen weights",
  "records.fields.touchpoints": "Design application examples",
  "records.fields.touchpointLabel":
    "Application caption and image alternative text",
  "records.fields.touchpointImage": "Application image filename",
  "records.fields.core": "Architecture core label",
  "records.fields.layers": "Architecture layer labels",
  "records.fields.modules": "Architecture module nodes",
  "records.fields.moduleName": "Architecture module name",
  "records.fields.moduleIcon": "Architecture module icon",
  "records.fields.stack": "Technology stack labels",
  "records.fields.week": "Campaign delivery week",
  "records.fields.day": "Campaign day label",
  "records.fields.task": "Campaign day task",
  "records.fields.items": "Campaign day deliverables",
  "records.fields.priorities": "Support priority levels",
  "records.fields.priorityLevel": "Priority code",
  "records.fields.priorityName": "Priority name",
  "records.fields.priorityWhen": "When this priority applies",
  "records.fields.priorityTarget": "Priority response target",
  "records.fields.components": "Hosting component status rows",
  "records.fields.componentName": "Hosting component name",
  "records.fields.componentDetail": "Hosting component description",
  "records.fields.componentState": "Hosting component status text",
  "records.fields.metrics": "Result metric cards",
  "records.fields.metricValue": "Result metric value",
  "records.fields.metricLabel": "Result metric description",
  "records.fields.shifts": "Design before and after wording",
  "records.fields.beforeText": "Before wording",
  "records.fields.afterText": "After wording",
  "records.fields.gauges": "Development performance gauges",
  "records.fields.gaugeLabel": "Gauge description",
  "records.fields.gaugeValue": "Gauge score from 0 to 100",
  "records.fields.kpis": "Marketing KPI cards",
  "records.fields.kpiLabel": "KPI name",
  "records.fields.before": "Baseline value",
  "records.fields.after": "Result value",
  "records.fields.change": "Displayed change text",
  "records.fields.monthly": "Monthly performance chart",
  "records.fields.chartLabel": "Performance chart caption",
  "records.fields.baseline": "Number of baseline months",
  "records.fields.points": "Ordered chart labels and values",
  "records.fields.pointLabel": "Chart time label",
  "records.fields.pointValue": "Chart data value",
  "records.fields.funnel": "Conversion funnel stages and counts",
  "records.fields.stageLabel": "Funnel stage label",
  "records.fields.stageValue": "Funnel stage count",
  "records.fields.channels": "Channel names and percentage shares",
  "records.fields.channelName": "Channel name",
  "records.fields.channelShare": "Channel percentage share",
  "records.fields.comparisons": "Support before and after comparisons",
  "records.fields.comparisonLabel": "Comparison metric name",
  "records.fields.unit": "Unit appended to comparison values",
  "records.fields.chart": "Hosting migration performance chart",
  "records.fields.cutover": "Migration boundary point count",
  "records.fields.familyIcon": "Department card icon",
  "records.fields.softwareIcon": "System diagram and detail icon",
  "records.fields.articleCategory": "Article service-family category",
  "records.fields.articleDate": "Article date shown to readers",
  "records.fields.readingMinutes": "Article reading-time estimate",
  "records.hints.familyIcon":
    "Icon on department cards and family service rows; it does not replace the family cover image.",
  "records.hints.softwareIcon":
    "Home software diagram nodes and the software-detail use-case panel. Changing this icon does not change icons in the separate purchasing catalog.",
  "records.hints.articleCategory":
    "Associates the article with a service family. The website displays that family’s Short label on article cards, category filters and the article heading.",
  "records.hints.articleDate":
    "Displayed on article cards and in article facts; also used in structured article metadata. This is separate from the publishing schedule.",
  "records.hints.readingMinutes":
    "Minutes shown on article cards, the article heading and article facts. The website formats the unit; enter the number only.",
  "records.fields.familyImage": "Family card and service illustration",
  "records.fields.softwareImage": "Software detail feature illustration",
  "records.fields.articleImage": "Article card and reading-page cover",
  "records.fields.projectImage": "Project listing card image",
  "records.fields.imageAlt": "Social and search image alternative text",
  "records.hints.familyImage":
    "/services → family cards and expanded family-service illustrations; service-detail capability cards reuse the family image. It does not replace each project’s images.",
  "records.hints.softwareImage":
    "/software/'{system}' → illustration in the feature section. Related-system cards may also use it. Home’s software diagram uses icons, and use-case images additionally use template assets.",
  "records.hints.articleImage":
    "/insights → article cards and /insights/'{article}' → cover above the takeaway panel. Images inserted between paragraphs are edited separately in the article body.",
  "records.hints.projectImage":
    "/work → project card image, also available as the project’s fallback social image. The project gallery is a separate collection and is not replaced by this cover.",
  "records.hints.imageAlt":
    "Used by the entry’s social/search image metadata. The current page templates use their own visible captions or placeholder labels, so this text is not a visible section heading.",
  "records.fields.approachContent": "Approach section content",
  "records.fields.deliveredContent": "Delivered work section content",
  "records.fields.resultsContent": "Results section content",
};
