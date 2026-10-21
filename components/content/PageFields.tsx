"use client";
import { useId, type ReactNode } from "react";
import { Field, Input, Textarea } from "@orgtik/ui";
import { useTranslations } from "next-intl";
import { SectionPreviewLink } from "./SectionPreviewLink";
import { ValueEditor, type EditorContext } from "./BlockEditor";
import type { Node } from "@/lib/caseStudySchema";
import type { Entry, Locale } from "@/store/api";
import { copyText } from "@/lib/richCopy";
import { pageCardGroups, type PageCardGroup } from "@/lib/pageCardGroups";
import {
  decoratePageNode,
  pageFieldPlacement,
  pageSectionPlacement,
  resolvedPageFieldPlacement,
} from "@/lib/pagePlacement";

export type PageField = {
  record: string;
  path: string;
  label: string;
  initial?: string;
  link?: boolean;
  template?: boolean;
};
export function PageFields({
  fields,
  records,
  lang,
  edits,
  onChange,
  ctx,
  cardTitle,
  previewHref,
  pageId,
  section,
}: {
  fields: PageField[];
  records: Entry[];
  lang: Locale;
  edits: Record<string, Partial<Record<Locale, Record<string, unknown>>>>;
  onChange: (id: string, words: Record<string, unknown>) => void;
  ctx: EditorContext;
  cardTitle?: string;
  previewHref?: string;
  pageId?: string;
  section?: string;
}) {
  const t = useTranslations("Fields");
  const ti = useTranslations("Improvements");
  const placementText = useTranslations("PagePlacement");
  const renderField = (field: PageField) => {
    const placement =
      pageId && section
        ? resolvedPageFieldPlacement(
            pageId,
            section,
            field.record,
            field.path,
            placementText,
          )
        : undefined;
    const entry = records.find((item) => item.id === field.record);
    if (!entry) return null;
    const [block, slot] = field.path.split(".");
    const words =
      edits[field.record]?.[lang] ??
      entry.content.locales[lang] ??
      entry.content.locales.en ??
      {};
    const values = (words[block] ?? {}) as Record<string, unknown>;
    const fallback = (entry.content.locales.en?.[block] ?? {}) as Record<
      string,
      unknown
    >;
    const value =
      values[slot] ?? (lang === "en" ? field.initial : undefined) ?? "";
    const fullWidth =
      cardTitle &&
      ["description", "header", "headerAccent"].includes(field.label)
        ? "sm:col-span-2"
        : undefined;
    if (!field.link && /<m\d+>|<br\s*\/?>/.test(String(value)))
      return (
        <div key={`${field.record}.${field.path}`} className={fullWidth}>
          <ValueEditor
            node={{
              kind: "rich",
              label: field.label,
              long: String(value).length > 100,
              displayLabel: placement?.label,
              placement: placement?.hint,
            }}
            value={value}
            fallback={fallback[slot]}
            path={field.path}
            onChange={(next) =>
              onChange(field.record, {
                ...words,
                [block]: { ...values, [slot]: next },
              })
            }
            ctx={ctx}
          />
        </div>
      );
    return (
      <Field
        key={`${field.record}.${field.path}`}
        className={fullWidth}
        label={
          placement?.label ??
          (t.has(field.label) ? t(field.label) : field.label)
        }
        description={
          [placement?.hint, field.template ? ti("templateField") : undefined]
            .filter(Boolean)
            .join(" · ") || undefined
        }
      >
        {field.label === "subheading" ? (
          <Textarea
            rows={3}
            value={String(value)}
            placeholder={String(fallback[slot] ?? field.initial ?? "")}
            dir="auto"
            lang={lang}
            disabled={ctx.readOnly}
            onChange={(event) =>
              onChange(field.record, {
                ...words,
                [block]: { ...values, [slot]: event.target.value },
              })
            }
          />
        ) : (
          <Input
            value={String(value)}
            placeholder={String(fallback[slot] ?? field.initial ?? "")}
            dir={field.link ? "ltr" : "auto"}
            lang={lang}
            readOnly={field.template}
            disabled={ctx.readOnly || (field.link && ctx.structureLocked)}
            onChange={(event) =>
              onChange(field.record, {
                ...words,
                [block]: { ...values, [slot]: event.target.value },
              })
            }
          />
        )}
      </Field>
    );
  };
  const retained = fields.filter(
    (field) =>
      pageId &&
      section &&
      pageFieldPlacement(pageId, section, field.record, field.path)?.state ===
        "unused",
  );
  const active = fields.filter((field) => !retained.includes(field));
  const content = (
    <div className="flex min-w-0 flex-col gap-4">
      {active.length ? (
        <div
          className={
            cardTitle ? "grid gap-4 sm:grid-cols-2" : "grid max-w-3xl gap-4"
          }
        >
          {active.map(renderField)}
        </div>
      ) : null}
      {retained.length ? (
        <RetainedPageFields>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {retained.map(renderField)}
          </div>
        </RetainedPageFields>
      ) : null}
    </div>
  );
  return cardTitle ? (
    <PageSectionCard title={cardTitle} previewHref={previewHref}>
      {content}
    </PageSectionCard>
  ) : (
    content
  );
}

function RetainedPageFields({ children }: { children: ReactNode }) {
  const t = useTranslations("PagePlacement");
  return (
    <details className="min-w-0 border-t border-line pt-4">
      <summary className="cursor-pointer text-body font-semibold text-fg outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
        {t("common.retainedTitle")}
      </summary>
      <p className="mt-2 max-w-prose text-body-sm text-fg-muted">
        {t("common.retainedHelp")}
      </p>
      {children}
    </details>
  );
}

/** Location guidance uses the UI language while the editable content keeps its own language. */
export function PagePlacementHint({
  pageId,
  section,
}: {
  pageId: string;
  section: string;
}) {
  const t = useTranslations("PagePlacement");
  const placement = pageSectionPlacement(pageId, section);
  const key =
    placement?.where ?? (section === "seo" ? "common.seo" : undefined);
  return key ? (
    <p className="mb-5 max-w-prose text-body-sm text-fg-muted">{t(key)}</p>
  ) : null;
}

export function PageSectionCard({
  title,
  children,
  previewHref,
}: {
  title?: string;
  children: ReactNode;
  previewHref?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={title ? id : undefined}
      className="min-w-0 rounded-card border border-line bg-raised p-5"
    >
      {title || previewHref ? (
        <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
          {title ? (
            <h3 id={id} className="min-w-0 text-title-sm font-semibold text-fg">
              {title}
            </h3>
          ) : (
            <span />
          )}
          {previewHref ? (
            <PagePreviewLink href={previewHref} title={title} />
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function PagePreviewLink({ href, title }: { href: string; title?: string }) {
  const t = useTranslations("Preview");
  const label = title ? `${t("button")}: ${title}` : t("button");
  return (
    <SectionPreviewLink
      href={href}
      label={label}
      iconOnly
      className="shrink-0"
    />
  );
}

/** Read the visible heading, keeping rich-copy formatting outside card titles. */
function copyHeading(value: unknown, tag?: string) {
  if (typeof value !== "string") return "";
  const selected = tag
    ? value.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"))?.[1]
    : value;
  return copyText(selected ?? value)
    .replace(/\s+/g, " ")
    .trim();
}

/** Cards retain the original field paths, fallback values, and save callbacks. */
export function PageCards({
  pageId,
  section,
  node,
  value,
  fallback,
  onChange,
  ctx,
  title,
  path = section,
  previewHref,
  sourceRecordId = pageId,
  nested = false,
}: {
  pageId: string;
  section: string;
  node: Node;
  value: unknown;
  fallback?: unknown;
  onChange: (value: unknown) => void;
  ctx: EditorContext;
  title?: string;
  path?: string;
  previewHref?: (section: string) => string | undefined;
  sourceRecordId?: string;
  nested?: boolean;
}) {
  const t = useTranslations("Fields");
  const placementText = useTranslations("PagePlacement");
  node = decoratePageNode({
    pageId,
    section,
    record: sourceRecordId,
    path,
    node,
    translate: placementText,
  });
  const words = (value ?? {}) as Record<string, unknown>;
  const english = (fallback ?? {}) as Record<string, unknown>;
  const translated = (key: string) => (t.has(key) ? t(key) : key);
  const sectionTitle =
    (nested && title
      ? title
      : pageSectionPlacement(pageId, section)?.title
        ? placementText(pageSectionPlacement(pageId, section)!.title)
        : title) ??
    ("label" in node && node.label
      ? translated(node.label)
      : translated(section));
  const heading = (group: PageCardGroup) => {
    if (group.intro) return sectionTitle;
    const contentTitle = group.titleKey
      ? copyHeading(
          words[group.titleKey] || english[group.titleKey],
          group.titleTag,
        )
      : "";
    return (
      contentTitle || (group.label ? translated(group.label) : sectionTitle)
    );
  };
  const childTitle = (key: string, child: Node) => {
    if (child.displayLabel) return child.displayLabel;
    const childWords = (words[key] ?? {}) as Record<string, unknown>;
    const childEnglish = (english[key] ?? {}) as Record<string, unknown>;
    if (child.kind === "group") {
      const keyWithTitle = [
        ...(key === "enquiry"
          ? ["div"]
          : key === "legal"
            ? ["aside@aria-label"]
            : []),
        "h1",
        "h2",
        "PurchaseHeading@title",
        "h3",
        "title",
      ].find((key) => child.fields[key]);
      const fromCopy = keyWithTitle
        ? copyHeading(childWords[keyWithTitle] || childEnglish[keyWithTitle])
        : "";
      if (fromCopy) return fromCopy;
    }
    return "label" in child && child.label
      ? translated(child.label)
      : t.has(key)
        ? t(key)
        : sectionTitle;
  };
  if (node.kind === "list") {
    const itemFields =
      node.item.kind === "group" ? node.item.fields : undefined;
    const titleKey = itemFields
      ? ["question", "title", "name", "label", "heading"].find(
          (key) => key in itemFields,
        )
      : undefined;
    const content = (
      <ValueEditor
        node={node}
        value={value}
        fallback={fallback}
        onChange={onChange}
        path={path}
        ctx={ctx}
        cardTitleKey={titleKey}
      />
    );
    // Repeated records already own their white cards; keep their list heading outside them.
    if (node.item.kind === "group" && Array.isArray(value) && value.length)
      return (
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <h3 className="min-w-0 text-title-sm font-semibold text-fg">
              {sectionTitle}
            </h3>
            {previewHref?.(section) ? (
              <PagePreviewLink
                href={previewHref(section)!}
                title={sectionTitle}
              />
            ) : null}
          </div>
          {content}
        </div>
      );
    return (
      <PageSectionCard
        title={sectionTitle}
        previewHref={previewHref?.(section)}
      >
        <div className="[&>section>h3]:sr-only">{content}</div>
      </PageSectionCard>
    );
  }
  if (node.kind !== "group")
    return (
      <PageSectionCard
        title={sectionTitle}
        previewHref={previewHref?.(section)}
      >
        <ValueEditor
          node={node}
          value={value}
          fallback={fallback}
          onChange={onChange}
          path={path}
          ctx={ctx}
        />
      </PageSectionCard>
    );
  // Contact's topic choices are stored beside its form. Keep them beside the form in the editor.
  if (pageId === "pg_contact" && section === "hero" && path === "") {
    const order = [
      ...new Set([
        "hero",
        "enquiry",
        "topics",
        "paths",
        ...Object.keys(node.fields),
      ]),
    ];
    return (
      <div className="flex min-w-0 flex-col gap-5">
        {order.flatMap((key) => {
          const child = node.fields[key];
          if (!child) return [];
          const heading =
            key === "hero" && child.kind === "group"
              ? Object.values(child.fields)[0]?.displayLabel
              : undefined;
          return [
            <PageCards
              key={key}
              pageId={pageId}
              section={key}
              node={child}
              value={words[key]}
              fallback={english[key]}
              onChange={(next) => onChange({ ...words, [key]: next })}
              path={key}
              ctx={ctx}
              title={heading ?? childTitle(key, child)}
              previewHref={previewHref}
              sourceRecordId={sourceRecordId}
              nested
            />,
          ];
        })}
      </div>
    );
  }
  const plain = Object.entries(node.fields).filter(
    ([, child]) => child.kind !== "group" && child.kind !== "list",
  );
  const related = Object.entries(node.fields).filter(
    ([, child]) => child.kind === "group" || child.kind === "list",
  );
  const retained = plain.filter(
    ([, child]) => child.placementState === "unused",
  );
  const groups = pageCardGroups(
    pageId,
    section,
    plain
      .filter(([, child]) => child.placementState !== "unused")
      .map(([key]) => key),
  );
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {groups.map((group, index) => (
        <PageSectionCard
          key={group.titleKey ?? group.label ?? `intro-${index}`}
          title={heading(group)}
          previewHref={previewHref?.(section)}
        >
          <ValueEditor
            node={{
              kind: "group",
              fields: Object.fromEntries(
                group.keys.map((key) => [key, node.fields[key]]),
              ),
            }}
            value={value}
            fallback={fallback}
            onChange={onChange}
            path={path}
            ctx={ctx}
          />
        </PageSectionCard>
      ))}
      {related.map(([key, child]) => (
        <PageCards
          key={key}
          pageId={pageId}
          section={key}
          node={child}
          value={words[key]}
          fallback={english[key]}
          onChange={(next) => onChange({ ...words, [key]: next })}
          path={path ? `${path}.${key}` : key}
          ctx={ctx}
          title={childTitle(key, child)}
          previewHref={previewHref}
          sourceRecordId={sourceRecordId}
          nested
        />
      ))}
      {retained.length ? (
        <RetainedPageFields>
          <ValueEditor
            node={{ kind: "group", fields: Object.fromEntries(retained) }}
            value={value}
            fallback={fallback}
            onChange={onChange}
            path={path}
            ctx={ctx}
          />
        </RetainedPageFields>
      ) : null}
    </div>
  );
}
