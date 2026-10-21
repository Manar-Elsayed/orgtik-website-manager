"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  ErrorState,
  Field,
  LoadingState,
  Select,
  toast,
} from "@orgtik/ui";
import { Link } from "@/i18n/routing";
import { TYPES } from "@/lib/contentTypes";
import { useCan } from "@/lib/permissions";
import { useEntryQuery, useSaveEntryMutation, type Locale } from "@/store/api";
import { commercePresentation } from "@/lib/commerceEditor";
import { commercePreviewHref } from "@/lib/commercePreview";
import { PageCards } from "./PageFields";
import { ValueEditor, type EditorContext } from "./BlockEditor";
import { CommerceSection } from "./CommerceEditor";

export const SHARED_PAGES: Record<string, { id: string; prefixes: string[] }> =
  {
    pg_faq: { id: "pg_home", prefixes: ["faqs"] },
    pg_plans: {
      id: "gl_commerce",
      prefixes: ["purchasePlans-", "purchaseUI-", "purchaseControls-"],
    },
    pg_cart: {
      id: "gl_commerce",
      prefixes: ["purchaseCart-", "purchaseControls-"],
    },
    pg_checkout: {
      id: "gl_commerce",
      prefixes: ["purchaseCheckout-", "paymentDetails-"],
    },
    pg_signUp: { id: "pg_signIn", prefixes: ["signin"] },
  };

/** Edits the canonical record, so shared screens never diverge into duplicate copy. */
export function SharedCopyPanel({
  pageId,
  lang,
  readOnly,
  onActiveSectionChange,
  previewHref,
}: {
  pageId: string;
  lang: Locale;
  readOnly: boolean;
  onActiveSectionChange?: (section: string | null) => void;
  previewHref?: (section: string) => string | undefined;
}) {
  const source = SHARED_PAGES[pageId];
  const type = source.id.startsWith("pg_") ? "page" : "global";
  const query = useEntryQuery({ type, id: source.id });
  const [save, saving] = useSaveEntryMutation();
  const [section, setSection] = useState<string | null>(null);
  const [editsByLang, setEditsByLang] = useState<
    Partial<Record<Locale, Record<string, unknown>>>
  >({});
  const edits = editsByLang[lang] ?? {};
  useEffect(() => {
    if (
      !Object.values(editsByLang).some(
        (value) => Object.keys(value ?? {}).length,
      )
    )
      return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editsByLang]);
  const t = useTranslations("Improvements");
  const te = useTranslations("Editor");
  const purchasing = useTranslations("PurchasingEditor");
  const can = useCan();
  const sections = query.data
    ? TYPES[type]
        .sections({ ...query.data, id: undefined })
        .filter((item) =>
          source.prefixes.some((prefix) => item.value.startsWith(prefix)),
        )
        .sort(
          (a, b) =>
            source.prefixes.findIndex((prefix) => a.value.startsWith(prefix)) -
            source.prefixes.findIndex((prefix) => b.value.startsWith(prefix)),
        )
    : [];
  const active = sections.find((item) => item.value === section) ?? sections[0];
  useEffect(() => {
    onActiveSectionChange?.(active?.value ?? null);
  }, [active?.value, onActiveSectionChange]);
  if (query.isLoading) return <LoadingState rows={3} />;
  if (!query.data || query.error) return <ErrorState onRetry={query.refetch} />;
  const entry = query.data;
  const tree = { ...entry.content.locales[lang], ...edits };
  const locked = readOnly || !can("content:edit");
  const ctx: EditorContext = {
    lang,
    readOnly: locked,
    structureLocked: locked || lang !== "en",
    numbersLocked: locked || lang !== "en",
    errors: {},
  };
  const changeSection = (path: string, value: unknown) =>
    setEditsByLang((previous) => ({
      ...previous,
      [lang]: { ...previous[lang], [path]: value },
    }));
  return (
    <section className="flex flex-col gap-4">
      <p className="text-body-sm text-fg-muted">{t("sharedCopyHint")}</p>
      <Field label={te("section")}>
        <Select
          aria-label={te("section")}
          value={active?.value}
          onValueChange={setSection}
          options={sections.map((item) => ({
            value: item.value,
            label:
              source.id === "gl_commerce"
                ? purchasing(commercePresentation(item.value).titleKey)
                : (item.label ?? item.value),
          }))}
        />
      </Field>
      {active ? (
        source.id === "gl_commerce" ? (
          <CommerceSection
            section={active}
            previewHref={(key, cardId, context) =>
              commercePreviewHref(key, lang, cardId, context)
            }
            renderFields={(node) => (
              <ValueEditor
                node={node}
                value={tree[active.path]}
                fallback={
                  lang === "en"
                    ? undefined
                    : entry.content.locales.en?.[active.path]
                }
                path={active.path}
                onChange={(value) => changeSection(active.path, value)}
                ctx={ctx}
              />
            )}
          />
        ) : (
          <PageCards
            pageId={pageId}
            sourceRecordId={source.id}
            section={active.value}
            title={active.label}
            previewHref={previewHref}
            node={active.node}
            value={tree[active.path]}
            fallback={entry.content.locales.en?.[active.path]}
            path={active.path}
            onChange={(value) => changeSection(active.path, value)}
            ctx={ctx}
          />
        )
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        {!locked && Object.keys(edits).length ? (
          <Button
            variant="secondary"
            disabled={saving.isLoading}
            onClick={() =>
              setEditsByLang((previous) => ({ ...previous, [lang]: {} }))
            }
          >
            {te("cancel")}
          </Button>
        ) : null}
        {!locked ? (
          <Button
            disabled={!Object.keys(edits).length}
            loading={saving.isLoading}
            onClick={async () => {
              try {
                await save({
                  type,
                  id: entry.id,
                  version: entry.version,
                  patch: { locale: lang, fields: edits },
                }).unwrap();
                setEditsByLang((previous) => ({ ...previous, [lang]: {} }));
                toast.success(te("saved"));
              } catch {
                toast.error(te("saveFailed"));
              }
            }}
          >
            {te("save")}
          </Button>
        ) : null}
        <Link
          className="text-body-sm text-fg-brand underline"
          href={`/content/${TYPES[type].area}/${entry.id}?section=${active?.value ?? ""}&lang=${lang}`}
        >
          {t("sharedCopy")}
        </Link>
      </div>
    </section>
  );
}
