"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Field, RadioGroup } from "@orgtik/ui";

export type CaseStudyDisplayMode = "card" | "sample" | "approved";

export function CaseStudyDisplay({
  mode,
  approved,
  disabled,
  error,
  onChange,
  action,
}: {
  mode: CaseStudyDisplayMode;
  approved: boolean;
  disabled: boolean;
  error?: string;
  onChange: (mode: CaseStudyDisplayMode) => void;
  /** Shown under the choices, e.g. confirming the client's results. */
  action?: ReactNode;
}) {
  const t = useTranslations("Editor.caseStudyDisplay");
  return (
    <div className="rounded-card border border-line bg-raised px-4 py-4">
      <Field
        group
        label={t("title")}
        description={t(disabled ? "permission" : "publication")}
        error={error}
      >
        <RadioGroup<CaseStudyDisplayMode>
          aria-label={t("title")}
          value={mode}
          disabled={disabled}
          className="py-2"
          options={[
            { value: "card", label: t("card"), description: t("cardHelp") },
            {
              value: "sample",
              label: t("sample"),
              description: t(approved ? "sampleUnavailable" : "sampleHelp"),
              disabled: approved,
            },
            {
              value: "approved",
              label: t("approved"),
              description: t(approved ? "approvedHelp" : "approvedUnavailable"),
              disabled: !approved,
            },
          ]}
          onValueChange={(value) => {
            if (
              disabled ||
              (value === "approved" && !approved) ||
              (value === "sample" && approved)
            )
              return;
            onChange(value);
          }}
        />
      </Field>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
