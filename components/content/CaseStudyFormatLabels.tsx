"use client";

import { useTranslations } from "next-intl";
import { ErrorState } from "@orgtik/ui";
import { Link } from "@/i18n/routing";
import type { Node, Department } from "@/lib/caseStudySchema";
import { caseFormatPreviewHref } from "@/lib/caseFormatLabels";
import type { EntrySummary } from "@/store/api";
import { ValueEditor, type EditorContext } from "./BlockEditor";
import { PageSectionCard } from "./PageFields";

/** These shared words label case-study stories; they are not a separate website section. */
export function CaseStudyFormatLabels({
  node,
  value,
  fallback,
  onChange,
  ctx,
  examples,
  loading,
  failed,
  onRetry,
}: {
  node: Node;
  value: unknown;
  fallback?: unknown;
  onChange: (value: unknown) => void;
  ctx: EditorContext;
  examples: Partial<Record<Department, EntrySummary>>;
  loading: boolean;
  failed: boolean;
  onRetry: () => unknown;
}) {
  const t = useTranslations("CaseStudyLabels");
  const departments = useTranslations("Departments");
  const words = (value ?? {}) as Record<string, unknown>;
  const english = (fallback ?? {}) as Record<string, unknown>;
  if (node.kind !== "group") return null;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageSectionCard title={t("whereTitle")}>
        <p className="max-w-prose text-body text-fg">{t("whereBody")}</p>
        <p className="mt-2 max-w-prose text-body-sm text-fg-muted">
          {t("scope")}
        </p>
        <Link
          href="/content/work"
          className="mt-3 inline-flex text-body-sm font-semibold text-fg-brand underline underline-offset-4"
        >
          {t("manageWork")}
        </Link>
      </PageSectionCard>
      {failed ? (
        <ErrorState
          size="compact"
          title={t("examplesFailed")}
          onRetry={onRetry}
        />
      ) : null}
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        {Object.entries(node.fields).map(([key, child]) => {
          const example = examples[key as Department];
          return (
            <PageSectionCard
              key={key}
              title={departments.has(key) ? departments(key) : key}
              previewHref={
                example ? caseFormatPreviewHref(example, ctx.lang) : undefined
              }
            >
              <ValueEditor
                node={{ ...child, label: "caseStudyLabelValue" }}
                value={words[key]}
                fallback={english[key]}
                path={`formats.${key}`}
                ctx={ctx}
                onChange={(next) => onChange({ ...words, [key]: next })}
              />
              <p className="mt-3 text-body-sm text-fg-muted" dir="auto">
                {example
                  ? t("example", { name: example.name })
                  : loading
                    ? t("loadingExamples")
                    : failed
                      ? t("exampleRetry")
                      : t("noExample")}
              </p>
            </PageSectionCard>
          );
        })}
      </div>
    </div>
  );
}
