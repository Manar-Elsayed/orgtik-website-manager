import type { Department, EntrySummary } from "@/store/api";
import { DEPARTMENTS } from "./caseStudySchema";
import { TYPES } from "./contentTypes";
import { localizedPreviewPath } from "./pagePreview";

/** Match the website's full-story gate without changing a case study's publication. */
export function isCaseFormatExample(entry: EntrySummary): boolean {
  return (
    entry.type === "caseStudy" &&
    entry.visibility === "live" &&
    DEPARTMENTS.includes(entry.department as Department) &&
    Boolean(entry.slug.en?.trim()) &&
    ((entry.narrativePublished === true && entry.figures === "approved") ||
      (entry.sampleNarrativePublished === true && entry.figures === "sample"))
  );
}

/** One real published story per department, independent of the query's arrival order. */
export function caseFormatExamples(
  entries: EntrySummary[],
): Partial<Record<Department, EntrySummary>> {
  const ordered = entries
    .filter(isCaseFormatExample)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return Object.fromEntries(
    DEPARTMENTS.flatMap((department) => {
      const entry = ordered.find(
        (candidate) => candidate.department === department,
      );
      return entry ? [[department, entry]] : [];
    }),
  );
}

/** Open the actual story and focus its shared format badge in the content language. */
export function caseFormatPreviewHref(
  entry: EntrySummary,
  locale: string,
): string {
  const slug = entry.slug.en;
  if (!isCaseFormatExample(entry) || !slug)
    throw new Error(
      "A published full case-study story is required for this preview.",
    );
  const params = new URLSearchParams({
    path: localizedPreviewPath(TYPES.caseStudy.path(slug), locale),
    lang: locale,
    section: "class:cs-header__tags",
  });
  return `/preview?${params}`;
}
