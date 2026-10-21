import type { SeoCheck, SeoIssue } from "@/store/api";

/** The five checks SEO health counts on its own cards; every other issue is under "Other issues". */
export const MAIN_CHECKS: SeoCheck[] = ["titleMissing", "titleDuplicate", "descriptionMissing", "descriptionDuplicate", "noSocialImage"];

/** Guidance, not a verdict: lengths, a shared default image, a canonical naming another page on purpose. */
export const GUIDANCE: SeoIssue[] = ["titleShort", "titleLong", "descriptionShort", "descriptionLong", "focusDuplicate", "socialImageDefault", "canonicalOther", "keywordsMissing", "focusMissing"];
export const isGuidance = (issue: SeoIssue) => GUIDANCE.includes(issue);

/** Which duplicate an issue is, so its hint can name the other pages. */
export const DUPLICATE_OF: Partial<Record<SeoIssue, "title" | "description" | "address" | "focus">> = {
  titleDuplicate: "title",
  descriptionDuplicate: "description",
  addressDuplicate: "address",
  focusDuplicate: "focus",
};

/** The SEO editor field that fixes an issue; the editor opens with it focused (?field=). */
export function fieldOf(issue: SeoIssue): string | null {
  if (issue.startsWith("title")) return "title";
  if (issue.startsWith("description")) return "description";
  if (issue === "noSocialImage" || issue === "socialImageDefault") return "ogImage";
  if (issue.startsWith("canonical")) return "canonical";
  if (issue === "schemaInvalid") return "jsonLd";
  if (issue === "focusDuplicate" || issue === "focusMissing") return "focus";
  return null;
}
