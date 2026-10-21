"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Select, TabsList } from "@orgtik/ui";
import type { Node } from "@/lib/caseStudySchema";
import type { EditorSection } from "@/lib/contentTypes";
import {
  commerceCards,
  commerceNavigation,
  commercePresentation,
} from "@/lib/commerceEditor";
import { PageSectionCard } from "./PageFields";
import { SectionPreviewLink } from "./SectionPreviewLink";

/** The screen picker keeps the section list short without changing the saved section key. */
export function CommerceNavigation({
  sections,
  active,
  onSelect,
}: {
  sections: EditorSection[];
  active: string;
  onSelect: (section: string) => void;
}) {
  const t = useTranslations("PurchasingEditor");
  const te = useTranslations("Editor");
  const groups = commerceNavigation(sections);
  const current =
    groups.find((group) =>
      group.sections.some((section) => section.value === active),
    ) ?? groups[0];
  if (!current) return null;
  const items = current.sections.map((section) => ({
    value: section.value,
    label: t(commercePresentation(section.value).titleKey),
  }));

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4">
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-body-sm font-medium text-fg">
          {t("navigationLabel")}
        </span>
        <Select
          aria-label={t("navigationLabel")}
          value={current.id}
          options={groups.map((group) => ({
            value: group.id,
            label: t(group.titleKey),
          }))}
          onValueChange={(id) => {
            const first = groups.find((group) => group.id === id)?.sections[0];
            if (first) onSelect(first.value);
          }}
          className="w-full"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2 lg:hidden">
        <span className="text-body-sm font-medium text-fg">
          {te("section")}
        </span>
        <Select
          aria-label={te("section")}
          value={active}
          onValueChange={(value) => value && onSelect(value)}
          options={items}
          className="w-full"
        />
      </div>
      <TabsList variant="side" items={items} className="hidden lg:flex" />
    </div>
  );
}

export type CommercePreviewHref = (
  section: string,
  cardId?: string,
  context?: "service" | "software",
) => string | undefined;

/** Group schema copies only; the owner supplies the original value, fallback and save callback. */
export function CommerceSection({
  section,
  renderFields,
  previewHref,
}: {
  section: EditorSection;
  renderFields: (node: Node) => ReactNode;
  previewHref: CommercePreviewHref;
}) {
  const t = useTranslations("PurchasingEditor");
  const presentation = commercePresentation(section.value);
  const cards = commerceCards(section);
  const title = t(presentation.titleKey);
  const serviceHref = previewHref(section.value, undefined, "service");
  const softwareHref = previewHref(section.value, undefined, "software");
  const sharedBuilder =
    section.value.startsWith("purchaseUI-") &&
    serviceHref &&
    softwareHref &&
    serviceHref !== softwareHref;
  const href = previewHref(section.value);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <h2 className="min-w-0 text-title-sm font-semibold text-fg">
            {title}
          </h2>
          {sharedBuilder ? (
            <div className="flex flex-wrap gap-1">
              <SectionPreviewLink
                href={serviceHref}
                label={t("previewService")}
              />
              <SectionPreviewLink
                href={softwareHref}
                label={t("previewSoftware")}
              />
            </div>
          ) : href ? (
            <SectionPreviewLink href={href} label={t("preview")} />
          ) : null}
        </div>
        <p className="mt-2 max-w-prose text-body-sm text-fg-muted">
          {t(presentation.whereKey)}
        </p>
        {presentation.stateKey ? (
          <p className="mt-3 max-w-prose text-body-sm text-fg-muted">
            {t(presentation.stateKey)}
          </p>
        ) : null}
        {!href && !sharedBuilder ? (
          <p className="mt-2 text-body-sm text-fg-muted">
            {t("previewUnavailable")}
          </p>
        ) : null}
      </header>
      {cards.map((card) =>
        card.id === "unused" ? (
          <details
            key={card.id}
            className="min-w-0 rounded-card border border-line bg-raised p-5"
          >
            <summary className="cursor-pointer text-title-sm font-semibold text-fg outline-hidden focus-visible:rounded-field focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
              {t(card.titleKey)}
            </summary>
            <p className="mt-3 max-w-prose text-body-sm text-fg-muted">
              {t(card.stateKey ?? "states.unused")}
            </p>
            <div className="mt-4 min-w-0">{renderFields(card.node)}</div>
          </details>
        ) : (
          <PageSectionCard
            key={card.id}
            title={t(card.titleKey)}
            previewHref={previewHref(section.value, card.id)}
          >
            {card.stateKey ? (
              <p className="mb-4 max-w-prose text-body-sm text-fg-muted">
                {t(card.stateKey)}
              </p>
            ) : null}
            {renderFields(card.node)}
          </PageSectionCard>
        ),
      )}
    </div>
  );
}
