"use client";

// An entry's SEO block, in one language (plan: "Metadata and slugs on everything"): how it shows in
// search results and link previews, its keywords and the checks they drive, indexing, and
// structured data. Lengths are measured the way results are cut: by width in pixels, not letters.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowClockwise, CheckCircle, Circle, Code, Globe, Info, MagnifyingGlass, ShareNetwork, Warning } from "@phosphor-icons/react";
import { Badge, Button, Card, Checkbox, Field, Input, Select, Tag, Textarea, cn, toast, useFormatter } from "@orgtik/ui";
import { useEntryName } from "@/lib/entryName";
import { DESCRIPTION_PX, SearchResultPreview, SocialPreview, TITLE_PX, widthOf } from "@/components/seo/SeoPreviews";
import { useSeoConflictsQuery, type Locale, type SeoPageRef } from "@/store/api";

export type SeoBlock = {
  title?: string;
  description?: string;
  focus?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  robots?: "index" | "noindex";
  inSitemap?: boolean;
  canonical?: string;
  jsonLd?: unknown;
};

/** The title as the site renders it: a title already in the template's form is kept, otherwise wrapped. */
export function renderTitle(own: string, template = "{page} | OrgTik") {
  if (!own) return "";
  const [before, after = ""] = template.split("{page}");
  return (before || after) && own.startsWith(before) && own.endsWith(after) ? own : template.replace("{page}", own);
}
const has = (text: string, phrase: string) => Boolean(phrase.trim()) && text.toLowerCase().includes(phrase.trim().toLowerCase());

// A warning under a field: something to change before saving, not an error that blocks it.
function WarningNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-1.5 rounded-field bg-warning-subtle px-3 py-2 text-body-sm text-warning">
      <Warning aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

// When another page already uses the same value in this language.
function DuplicateHint({ pages, message }: { pages: SeoPageRef[] | undefined; message: (pages: string) => string }) {
  const entryName = useEntryName();
  if (!pages?.length) return null;
  return <WarningNote>{message(pages.map((page) => entryName(page)).join(", "))}</WarningNote>;
}

// A focus keyphrase is a short search (2 words); each other keyword stays at 4 words or fewer.
const FOCUS_WORDS = 2;
const KEYWORD_WORDS = 4;
const wordsIn = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const strong = (chunks: ReactNode) => <strong className="font-semibold text-fg">{chunks}</strong>;

function Section({ icon, title, children, aside, className }: { icon: ReactNode; title: string; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-title-sm text-fg">
          <span aria-hidden="true" className="text-fg-subtle [&>svg]:size-5">
            {icon}
          </span>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </Card>
  );
}

export function SeoPanel({
  lang,
  seo,
  english,
  address,
  slug,
  siteHidden,
  entryImage,
  images,
  structuredType,
  errors,
  can,
  onChange,
  fullWidthFields = false,
  entryId,
  titleTemplate,
}: {
  lang: Locale;
  seo: SeoBlock;
  /** The English block: what an untranslated field falls back to. */
  english: SeoBlock;
  /** The page's full address, for the previews ("orgtik.ch/work/…"). */
  address: string;
  slug: string;
  /** The whole site is hidden from search (Indexing): a page's own setting waits for it. */
  siteHidden: boolean;
  entryImage?: string;
  images: { value: string; label: string }[];
  /** What the site generates for this page ("Service", "BlogPosting"…), or null. */
  structuredType: string | null;
  errors: Record<string, string>;
  can: { edit: boolean; canonical: boolean; jsonLd: boolean };
  onChange: (patch: Partial<SeoBlock>) => void;
  fullWidthFields?: boolean;
  /** This page, so duplicate warnings can leave it out. */
  entryId?: string;
  /** The site's title template ("{page} | OrgTik"): results show the title wrapped in it. */
  titleTemplate?: string;
}) {
  const t = useTranslations("Seo.block");
  const title = seo.title ?? "";
  const description = seo.description ?? "";
  const shownTitle = renderTitle(title || english.title || "", titleTemplate);
  const shownDescription = description || english.description || "";
  const titlePx = widthOf(shownTitle, "20px Arial");
  const descriptionPx = widthOf(shownDescription, "14px Arial");
  const keywords = seo.keywords ?? [];
  const [keyword, setKeyword] = useState("");
  const [json, setJson] = useState(() => (seo.jsonLd ? JSON.stringify(seo.jsonLd, null, 2) : ""));
  const [jsonError, setJsonError] = useState(false);
  const focus = seo.focus ?? "";
  const ogTitle = seo.ogTitle || shownTitle;
  // ?field=title (from SEO health) opens the editor with that field in view and focused.
  const asked = useSearchParams().get("field");
  const root = useRef<HTMLDivElement>(null);
  const focusField = (field: string) => {
    const el = root.current?.querySelector<HTMLElement>(`[data-seo-field="${field}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!asked) return;
    // Again once the editor above has finished laying out, so the field ends up in view.
    requestAnimationFrame(() => focusField(asked));
    const settle = setTimeout(() => focusField(asked), 700);
    return () => clearTimeout(settle);
    // Only on arrival: later edits keep the person where they are.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked, lang]);
  const ogDescription = seo.ogDescription || shownDescription;
  const ogImage = seo.ogImage || english.ogImage || entryImage;
  const err = (k: string) => errors[`seo.${k}`];
  const tooLong = (k: string) => (err(k) === "too_long" ? t("tooLong") : undefined);

  // The checklist the old dashboard's keyword fields fed, per language (plan: "a checklist, not a vanity score").
  const checks = useMemo(
    () => [
      { key: "titleSet", ok: Boolean(title.trim()) },
      { key: "titleFits", ok: Boolean(shownTitle) && titlePx <= TITLE_PX },
      { key: "descriptionSet", ok: description.trim().length >= 50 },
      { key: "descriptionFits", ok: Boolean(shownDescription) && descriptionPx <= DESCRIPTION_PX },
      { key: "focusInTitle", ok: has(shownTitle, focus), needs: "focus" },
      { key: "focusInDescription", ok: has(shownDescription, focus), needs: "focus" },
      { key: "focusInAddress", ok: has(slug.replace(/-/g, " "), focus.replace(/-/g, " ")), needs: "focus" },
      { key: "socialImage", ok: Boolean(ogImage) },
    ],
    [title, shownTitle, titlePx, description, shownDescription, descriptionPx, focus, slug, ogImage],
  );
  // The card shows the last run (one runs when a language is first shown) and says when the fields
  // have changed since, so "Run check" confirms the result of an edit before it is saved.
  const f = useFormatter();
  const [runs, setRuns] = useState<Partial<Record<Locale, { at: number; results: boolean[] }>>>({});
  const run = runs[lang];
  if (!run) setRuns((all) => ({ ...all, [lang]: { at: Date.now(), results: checks.map((c) => c.ok) } }));
  const shown = run ? checks.map((c, i) => ({ ...c, ok: run.results[i] ?? c.ok })) : checks;
  const stale = Boolean(run) && checks.some((c, i) => c.ok !== run!.results[i]);
  const done = shown.filter((c) => c.ok).length;
  // Duplicate warnings follow what is typed, checked against the other pages after a short pause.
  const [probe, setProbe] = useState({ title: title.trim(), focus: focus.trim() });
  useEffect(() => {
    const id = setTimeout(() => setProbe({ title: title.trim(), focus: focus.trim() }), 400);
    return () => clearTimeout(id);
  }, [title, focus]);
  const { data: conflicts } = useSeoConflictsQuery({ entry: entryId ?? "", lang, title: probe.title, focus: probe.focus }, { skip: !entryId });
  const runChecks = () => {
    setRuns((all) => ({ ...all, [lang]: { at: Date.now(), results: checks.map((c) => c.ok) } }));
    toast.success(t("checksRan", { done: checks.filter((c) => c.ok).length, total: checks.length }));
  };

  const linkPreview = (
    <Section icon={<ShareNetwork />} title={t("socialPreview")}>
      {/* A link preview as social networks draw it; choosing it opens the fields it shows. */}
      <SocialPreview url={address} title={ogTitle} description={ogDescription} image={ogImage} lang={lang} onEdit={can.edit ? () => focusField("ogTitle") : undefined} />
    </Section>
  );

  const addKeyword = () => {
    const k = keyword.trim();
    if (!k || keywords.some((x) => x.toLowerCase() === k.toLowerCase())) return setKeyword("");
    onChange({ keywords: [...keywords, k] });
    setKeyword("");
  };

  return (
    <div ref={root} className={fullWidthFields ? "grid min-w-0 gap-4" : "grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]"}>
      <div className="flex min-w-0 flex-col gap-4">
        <Section icon={<MagnifyingGlass />} title={t("search")}>
          {/* The result as a search engine shows it, cut where it'd be cut; choosing it opens the title. */}
          <SearchResultPreview url={address} title={shownTitle} description={shownDescription} lang={lang} onEdit={can.edit ? () => focusField("title") : undefined} />
          <DuplicateHint pages={conflicts?.address} message={(pages) => t("addressUsedOn", { pages })} />
          <Field label={t("title")} description={t("pixels", { used: titlePx, max: TITLE_PX })} error={tooLong("title")}>
            <Input data-seo-field="title" dir="auto" lang={lang} readOnly={!can.edit} value={title} placeholder={lang === "en" ? undefined : english.title} onChange={(e) => onChange({ title: e.target.value })} />
          </Field>
          <DuplicateHint pages={probe.title === title.trim() ? conflicts?.title : undefined} message={(pages) => t("titleUsedOn", { pages })} />
          <Field label={t("description")} description={t("descriptionHelp", { count: description.length, used: descriptionPx, max: DESCRIPTION_PX })} error={tooLong("description")}>
            <Textarea data-seo-field="description" dir="auto" lang={lang} rows={3} readOnly={!can.edit} value={description} placeholder={lang === "en" ? undefined : english.description} onChange={(e) => onChange({ description: e.target.value })} />
          </Field>
        </Section>

        <Section icon={<Info />} title={t("keywords")}>
          <Field label={t("focus")} description={t.rich("focusHelp", { b: strong, max: FOCUS_WORDS })} error={tooLong("focus")}>
            <Input data-seo-field="focus" dir="auto" lang={lang} readOnly={!can.edit} value={focus} onChange={(e) => onChange({ focus: e.target.value })} />
          </Field>
          {wordsIn(focus) > FOCUS_WORDS ? <WarningNote>{t("focusTooManyWords", { count: wordsIn(focus), max: FOCUS_WORDS })}</WarningNote> : null}
          <DuplicateHint pages={probe.focus === focus.trim() ? conflicts?.focus : undefined} message={(pages) => t("focusUsedOn", { pages })} />
          <Field label={t("keywordList")} description={t.rich("keywordListHelp", { b: strong, max: KEYWORD_WORDS })} error={err("keywords") ? t("keywordsInvalid") : undefined}>
            <div className="flex flex-col gap-2">
              {keywords.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {keywords.map((k) => (
                    <li key={k}>
                      <Tag className={wordsIn(k) > KEYWORD_WORDS ? "border-warning text-warning" : undefined} onRemove={can.edit ? () => onChange({ keywords: keywords.filter((x) => x !== k) }) : undefined}>
                        <bdi>{k}</bdi>
                      </Tag>
                    </li>
                  ))}
                </ul>
              ) : null}
              {can.edit ? (
                <Input
                  dir="auto"
                  lang={lang}
                  value={keyword}
                  placeholder={t("keywordPlaceholder")}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  onBlur={addKeyword}
                />
              ) : null}
            </div>
          </Field>
          {/* While typing, then for any keyword already added that runs long (marked in the list above). */}
          {wordsIn(keyword) > KEYWORD_WORDS ? <WarningNote>{t("keywordTooManyWords", { count: wordsIn(keyword), max: KEYWORD_WORDS })}</WarningNote> : null}
          {keywords.some((k) => wordsIn(k) > KEYWORD_WORDS) ? (
            <WarningNote>{t("keywordsTooLong", { keywords: keywords.filter((k) => wordsIn(k) > KEYWORD_WORDS).join(", "), max: KEYWORD_WORDS })}</WarningNote>
          ) : null}
        </Section>

        <Section icon={<ShareNetwork />} title={t("social")}>
          <Field label={t("ogTitle")} description={t("ogFallback")} error={tooLong("ogTitle")}>
            <Input data-seo-field="ogTitle" dir="auto" lang={lang} readOnly={!can.edit} value={seo.ogTitle ?? ""} placeholder={shownTitle} onChange={(e) => onChange({ ogTitle: e.target.value })} />
          </Field>
          <Field label={t("ogDescription")} description={t("ogFallback")} error={tooLong("ogDescription")}>
            <Textarea dir="auto" lang={lang} rows={2} readOnly={!can.edit} value={seo.ogDescription ?? ""} placeholder={shownDescription} onChange={(e) => onChange({ ogDescription: e.target.value })} />
          </Field>
          <Field label={t("ogImage")} description={t("ogImageHelp")}>
            <Select data-seo-field="ogImage" readOnly={!can.edit} value={seo.ogImage || "default"} onValueChange={(v) => onChange({ ogImage: !v || v === "default" ? "" : v })} options={[{ value: "default", label: t("ogImageDefault") }, ...images.map((i) => ({ value: i.value, label: <span dir="ltr">{i.label}</span> }))]} />
          </Field>
        </Section>

        {/* Beside two columns, the preview sits under the fields it shows; the side column keeps the sticky checks. */}
        {fullWidthFields ? null : linkPreview}

        <Section icon={<Globe />} title={t("indexing")}>
          {siteHidden ? (
            <p className="rounded-field bg-warning-subtle px-3 py-2 text-body-sm text-warning">{t("siteHidden")}</p>
          ) : null}
          <div className={fullWidthFields ? "grid min-w-0 gap-4" : "grid gap-4 sm:grid-cols-2"}>
            <Field label={t("robots")}>
              <Select
                data-seo-field="robots"
                readOnly={!can.edit}
                value={seo.robots ?? "index"}
                onValueChange={(v) => onChange({ robots: v as "index" | "noindex" })}
                options={[
                  { value: "index", label: t("robotsIndex") },
                  { value: "noindex", label: t("robotsNoindex") },
                ]}
              />
            </Field>
            <div className="flex items-end pb-2">
              <Checkbox disabled={!can.edit} checked={seo.inSitemap !== false} onCheckedChange={(v: boolean) => onChange({ inSitemap: v })} label={t("inSitemap")} />
            </div>
          </div>
          <Field label={t("canonical")} description={can.canonical ? t("canonicalHelp", { address }) : t("canonicalSeoOnly")} error={err("canonical") ? t("canonicalInvalid") : undefined}>
            <Input data-seo-field="canonical" dir="ltr" readOnly={!can.canonical} value={seo.canonical ?? ""} placeholder={address.startsWith("http") ? address : `https://${address}`} onChange={(e) => onChange({ canonical: e.target.value.trim() })} />
          </Field>
        </Section>

        <Section icon={<Code />} title={t("structured")} aside={structuredType ? <Badge tone="info">{structuredType}</Badge> : null}>
          <p className="text-body-sm text-fg-muted">{structuredType ? t("structuredGenerated", { type: structuredType }) : t("structuredNone")}</p>
          <Field
            label={t("customJsonLd")}
            description={can.jsonLd ? t("customJsonLdHelp") : t("customJsonLdLocked")}
            error={jsonError ? t("jsonInvalid") : err("jsonLd") ? t("jsonType") : undefined}
          >
            <Textarea
              data-seo-field="jsonLd"
              dir="ltr"
              rows={6}
              className="font-mono text-body-sm"
              readOnly={!can.jsonLd}
              value={json}
              placeholder={'{ "@type": "FAQPage", … }'}
              onChange={(e) => {
                const v = e.target.value;
                setJson(v);
                if (!v.trim()) {
                  setJsonError(false);
                  return onChange({ jsonLd: null });
                }
                try {
                  onChange({ jsonLd: JSON.parse(v) });
                  setJsonError(false);
                } catch {
                  setJsonError(true);
                }
              }}
            />
          </Field>
        </Section>
      </div>

      <div className={fullWidthFields ? "grid min-w-0 items-start gap-4 sm:grid-cols-2" : "flex flex-col gap-4"}>
        <Section
          icon={<CheckCircle />}
          title={t("checks")}
          aside={<span className="text-body-sm text-fg-muted tabular-nums">{t("checksDone", { done, total: checks.length })}</span>}
          className={fullWidthFields ? undefined : "xl:sticky xl:top-4"}
        >
          <ul className="flex flex-col gap-2">
            {shown.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-body-sm">
                {c.ok ? <CheckCircle weight="fill" aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" /> : <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />}
                <span className={c.ok ? "text-fg" : "text-fg-muted"}>
                  <span className="sr-only">{t(c.ok ? "checkDone" : "checkOpen")}: </span>
                  {t(`check.${c.key}`)}
                  {!c.ok && c.needs === "focus" && !focus ? <span className="block text-caption text-fg-subtle">{t("check.needsFocus")}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <p role="status" className={cn("text-caption", stale ? "text-warning" : "text-fg-subtle")}>
              {stale ? t("checksStale") : run ? t("checksRanAt", { time: f.date(new Date(run.at), { timeStyle: "short" }) }) : null}
            </p>
            <Button size="sm" variant={stale ? "primary" : "secondary"} startIcon={<ArrowClockwise />} onClick={runChecks}>
              {t("runCheck")}
            </Button>
          </div>
        </Section>
        {fullWidthFields ? linkPreview : null}
      </div>
    </div>
  );
}
