import type { Node } from "./caseStudySchema";
import type {
  PageFieldPlacement,
  PagePlacementMap,
} from "./pagePlacementTypes";
import { DISCOVERY_PLACEMENTS, DISCOVERY_COPY } from "./pagePlacementDiscovery";
import { SUPPORT_PLACEMENTS, SUPPORT_COPY } from "./pagePlacementSupport";
import {
  PURCHASING_PLACEMENTS,
  PURCHASING_COPY,
} from "./pagePlacementPurchasing";
import { SHARED_PLACEMENTS, SHARED_COPY } from "./pagePlacementShared";
import { COMMON_PLACEMENT_COPY } from "./pagePlacementCommon";
import { RECORD_PLACEMENTS, RECORD_COPY } from "./pagePlacementRecords";

export const PAGE_PLACEMENTS: PagePlacementMap = {
  ...DISCOVERY_PLACEMENTS,
  ...SUPPORT_PLACEMENTS,
  ...PURCHASING_PLACEMENTS,
  ...SHARED_PLACEMENTS,
  ...RECORD_PLACEMENTS,
};

export const PAGE_PLACEMENT_COPY = {
  ...DISCOVERY_COPY,
  ...SUPPORT_COPY,
  ...PURCHASING_COPY,
  ...SHARED_COPY,
  ...COMMON_PLACEMENT_COPY,
  ...RECORD_COPY,
};

function placementsFor(id: string) {
  const types: Record<string, string> = {
    sf: "serviceFamily",
    sv: "service",
    sm: "softwareModule",
    ar: "article",
    lg: "legalDocument",
    rm: "roadmapItem",
    cs: "caseStudy",
  };
  return (
    PAGE_PLACEMENTS[id] ??
    PAGE_PLACEMENTS[`type:${types[id.split("_")[0]]}`] ??
    {}
  );
}

export function pageSectionPlacement(pageId: string, section: string) {
  return placementsFor(pageId)[section];
}

/** Existing managedPageTree insertion points; editor-only tabs do not create website media areas. */
export function pageMediaPlacement(id: string, section: string) {
  const shared: Record<string, string> = {
    gl_header: "common.mediaHeader",
    gl_footer: "common.mediaFooter",
    gl_socials: "common.mediaFooter",
    gl_process: "common.mediaProcess",
    gl_components: "common.mediaCaseStudy",
  };
  if (shared[id]) return shared[id];
  const markers: Record<string, string[]> = {
    pg_home: [
      "hero",
      "two-sides",
      "partners",
      "work",
      "services",
      "software",
      "approach",
      "faqs",
      "reviews",
      "closing",
    ],
    pg_services: [
      "hero",
      "families",
      "all-services",
      "services-list",
      "approach",
      "reviews",
    ],
    pg_software: [
      "hero",
      "workspace",
      "capabilities",
      "demo",
      "section-1",
      "section-2",
      "reviews",
    ],
    pg_work: ["projects", "gallery", "hero", "reviews"],
    pg_about: ["hero", "purpose", "journey", "capabilities", "reviews"],
    pg_insights: ["articles", "article", "hero"],
    pg_contact: ["hero"],
    pg_roadmap: ["hero", "timeline", "community", "submit-idea"],
    pg_legal: ["hero"],
    pg_signIn: ["signin"],
    pg_faq: ["hero", "questions"],
  };
  return markers[id]?.includes(section)
    ? "common.mediaActive"
    : "common.mediaInactive";
}

/** List positions are represented by * so adding or reordering a record retains its guidance. */
export function pageFieldPlacement(
  pageId: string,
  section: string,
  record: string,
  path: string,
): PageFieldPlacement | undefined {
  const canonical = `${record}.${path}`;
  const pattern = canonical.replace(/\.\d+(?=\.|$)/g, ".*");
  const parts = canonical.split(".");
  const tuplePattern = parts
    .map((part, index) =>
      index > 0 && index < parts.length - 1 && /^\d+$/.test(part) ? "*" : part,
    )
    .join(".");
  const keys = [
    ...new Set([
      canonical,
      canonical.replace(/^[^.]+/, "*"),
      tuplePattern,
      tuplePattern.replace(/^[^.]+/, "*"),
      pattern,
      pattern.replace(/^[^.]+/, "*"),
    ]),
  ];
  const placements = placementsFor(pageId);
  const candidates = [placements[section], ...Object.values(placements)];
  for (const placement of candidates)
    for (const key of keys)
      if (placement?.fields?.[key]) return placement.fields[key];
  return undefined;
}

export function resolvedPageFieldPlacement(
  pageId: string,
  section: string,
  record: string,
  path: string,
  translate: (key: string) => string,
) {
  const field = pageFieldPlacement(pageId, section, record, path);
  if (!field) return undefined;
  return {
    label: translate(field.label),
    hint: field.hint
      ? translate(field.hint)
      : field.state
        ? translate(`common.${field.state}`)
        : undefined,
  };
}

/** Copy the editor schema, leaving original labels, rich marks, hints and storage paths intact. */
export function decoratePageNode({
  pageId,
  section,
  record = pageId,
  path,
  node,
  translate,
}: {
  pageId: string;
  section: string;
  record?: string;
  path: string;
  node: Node;
  translate: (key: string) => string;
}): Node {
  const field = resolvedPageFieldPlacement(
    pageId,
    section,
    record,
    path,
    translate,
  );
  const decorated: Node = {
    ...node,
    ...(field
      ? {
          displayLabel: field.label,
          ...(field.hint ? { placement: field.hint } : {}),
          placementState: pageFieldPlacement(pageId, section, record, path)
            ?.state,
        }
      : {}),
  };
  if (decorated.kind === "group")
    return {
      ...decorated,
      fields: Object.fromEntries(
        Object.entries(decorated.fields).map(([key, child]) => [
          key,
          decoratePageNode({
            pageId,
            section,
            record,
            path: path ? `${path}.${key}` : key,
            node: child,
            translate,
          }),
        ]),
      ),
    };
  if (decorated.kind === "list")
    return {
      ...decorated,
      item: decoratePageNode({
        pageId,
        section,
        record,
        path: `${path}.*`,
        node: decorated.item,
        translate,
      }),
    };
  if (decorated.kind === "pair" || decorated.kind === "series") {
    const base = decorated.kind === "series" ? `${path}.*` : path;
    const first = resolvedPageFieldPlacement(
      pageId,
      section,
      record,
      `${base}.0`,
      translate,
    );
    const second = resolvedPageFieldPlacement(
      pageId,
      section,
      record,
      `${base}.1`,
      translate,
    );
    return {
      ...decorated,
      firstDisplayLabel: first?.label,
      secondDisplayLabel: second?.label,
      firstPlacement: first?.hint,
      secondPlacement: second?.hint,
    };
  }
  return decorated;
}
