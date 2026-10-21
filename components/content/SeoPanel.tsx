"use client";

// An entry's SEO block, in one language (plan: "Metadata and slugs on everything"): how it shows in
// search results and link previews, its keywords and the checks they drive, indexing, and
// structured data. Lengths are measured the way results are cut: by width in pixels, not letters.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowClockwise, CheckCircle, Circle, Code, Globe, Info, MagnifyingGlass, ShareNetwork, Warning } from "@phosphor-icons/react";
import { Badge, Button, Card, Checkbox, Field, Input, Select, Tag, Textarea, cn, toast, useFormatter } from "@orgtik/ui";
import { mediaUrl } from "@/lib/env";
import { useEntryName } from "@/lib/entryName";
import { IssueSpot } from "@/components/seo/IssueSpot";
import { Link } from "@/i18n/routing";
import { useSeoConflictsQuery, type Locale, type SeoDuplicateKind, type SeoDuplicates, type SeoPageRef } from "@/store/api";

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

// Search results cut titles at about 600px (20px Arial) and descriptions at about two lines.
const TITLE_PX = 600;
const DESCRIPTION_PX = 920;
let canvas: HTMLCanvasElement | null = null;
function widthOf(text: string, font: string) {
  if (typeof document === "undefined") return text.length * 8;
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  return Math.round(ctx.measureText(text).width);
}
function cut(text: string, font: string, max: number) {
  if (widthOf(text, font) <= max) return text;
  let s = text;
  while (s && widthOf(`${s}…`, font) > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
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

// Every duplicate in this language at the top of the editor, each naming the pages to compare with.
function DuplicatesNote({ conflicts, lang }: { conflicts: Partial<SeoDuplicates> | undefined; lang: Locale }) {
  const t = useTranslations("Seo.block");
  const entryName = useEntryName();
  const kinds = (["title", "description", "focus", "address", "text"] as SeoDuplicateKind[]).filter((k) => conflicts?.[k]?.length);
  if (!kinds.length) return null;
  return (
    <div role="status" className="flex flex-col gap-2 rounded-field bg-info-subtle px-3 py-2 text-body-sm text-info">
      <p className="font-semibold">{t("duplicatesTitle")}</p>
      <ul className="flex flex-col gap-1">
        {kinds.map((k) => (
          <li key={k} className="flex flex-wrap gap-x-1">
            <span>{t(`duplicateOf.${k}`)}</span>
            {conflicts![k]!.map((page, i) => (
              <span key={page.id}>
                <Link href={`/seo/content/${page.id}?lang=${lang}`} className="underline hover:no-underline focus-visible:outline-2 focus-visible:outline-focus">{entryName(page)}</Link>
                {i < conflicts![k]!.length - 1 ? "," : null}
              </span>
            ))}
            {/* Page text names the passage, so it can be found on the page. */}
            {k === "text" && conflicts![k]![0]?.excerpt ? <span dir="auto" lang={lang} className="w-full italic">“{conflicts![k]![0].excerpt}”</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Where each SEO missing issue is fixed in this panel (address and image description are the editor's).
const FIELD_OF: Record<string, keyof SeoBlock | "text"> = {
  titleMissing: "title", titleLong: "title", titleDuplicate: "title",
  descriptionMissing: "description", descriptionShort: "description", descriptionLong: "description", descriptionDuplicate: "description",
  focusMissing: "focus", focusDuplicate: "focus", keywordsMissing: "keywords", noSocialImage: "ogImage", textDuplicate: "text",
};

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
  addressCard,
  canonical,
  slug,
  siteHidden,
  entryImage,
  images,
  structuredType,
  errors,
  can,
  onChange,
  spot,
  fullWidthFields = false,
  entryId,
}: {
  lang: Locale;
  seo: SeoBlock;
  /** The English block: what an untranslated field falls back to. */
  english: SeoBlock;
  /** The page's full address, for the previews ("orgtik.ch/work/…"). */
  address: string;
  /** The page's address field, shown first so the side column's checks start level with it. */
  addressCard?: ReactNode;
  /** The canonical URL the site prints for this page and language, built from its address. */
  canonical: string;
  slug: string;
  /** The whole site is hidden from search (Indexing): a page's own setting waits for it. */
  siteHidden: boolean;
  entryImage?: string;
  images: { value: string; label: string }[];
  /** What the site generates for this page ("Service", "BlogPosting"…), or null. */
  structuredType: string | null;
  errors: Record<string, string>;
  can: { edit: boolean; jsonLd: boolean };
  onChange: (patch: Partial<SeoBlock>) => void;
  /** The SEO missing issue the editor was opened from: its field is outlined until it is edited. */
  spot?: string;
  fullWidthFields?: boolean;
  /** This page, so duplicate warnings can leave it out. */
  entryId?: string;
}) {
  const t = useTranslations("Seo.block");
  const ts = useTranslations("Seo");
  const [spotIssue, setSpotIssue] = useState(spot && FIELD_OF[spot] ? spot : undefined);
  const spotField = spotIssue ? FIELD_OF[spotIssue] : undefined;
  const spotLabel = spotIssue ? t("fixHere", { issue: ts(`checks.${spotIssue}`) }) : "";
  // Editing the outlined field means it is being fixed: the outline goes.
  const edit = (patch: Partial<SeoBlock>) => {
    if (spotField && spotField in patch) setSpotIssue(undefined);
    onChange(patch);
  };
  const title = seo.title ?? "";
  const description = seo.description ?? "";
  const shownTitle = title || english.title || "";
  const shownDescription = description || english.description || "";
  const titlePx = widthOf(shownTitle, "20px Arial");
  const descriptionPx = widthOf(shownDescription, "14px Arial");
  const keywords = seo.keywords ?? [];
  const [keyword, setKeyword] = useState("");
  const [json, setJson] = useState(() => (seo.jsonLd ? JSON.stringify(seo.jsonLd, null, 2) : ""));
  const [jsonError, setJsonError] = useState(false);
  const focus = seo.focus ?? "";
  const ogTitle = seo.ogTitle || shownTitle;
  const ogDescription = seo.ogDescription || shownDescription;
  const ogImage = seo.ogImage || english.ogImage || entryImage;
  const err = (k: string) => errors[`seo.${k}`];
  const tooLong = (k: string) => (err(k) === "too_long" ? t("tooLong") : undefined);

  // The checklist the old dashboard's keyword fields fed, per language (plan: "a checklist, not a vanity score").
  const checks = useMemo(
    () => [
      { key: "titleSet", ok: Boolean(title.trim()) },
      { key: "titleFits", ok: Boolean(shownTitle) && titlePx <= TITLE_PX },
      { key: "descriptionSet", ok: description.trim().length >= 60 },
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
  const [probe, setProbe] = useState({ title: title.trim(), description: description.trim(), focus: focus.trim() });
  useEffect(() => {
    const id = setTimeout(() => setProbe({ title: title.trim(), description: description.trim(), focus: focus.trim() }), 400);
    return () => clearTimeout(id);
  }, [title, description, focus]);
  const { data: conflicts } = useSeoConflictsQuery({ entry: entryId ?? "", lang, title: probe.title, description: probe.description, focus: probe.focus }, { skip: !entryId });
  // Only what still matches the fields: a warning goes as soon as the value changes.
  const current: Partial<SeoDuplicates> | undefined = conflicts && {
    title: probe.title === title.trim() ? conflicts.title : [],
    description: probe.description === description.trim() ? conflicts.description : [],
    focus: probe.focus === focus.trim() ? conflicts.focus : [],
    address: conflicts.address,
    text: conflicts.text,
  };
  const runChecks = () => {
    setRuns((all) => ({ ...all, [lang]: { at: Date.now(), results: checks.map((c) => c.ok) } }));
    toast.success(t("checksRan", { done: checks.filter((c) => c.ok).length, total: checks.length }));
  };

  const linkPreview = (
    <Section icon={<ShareNetwork />} title={t("socialPreview")}>
      {/* A link preview as social networks draw it: image, site, title, description. */}
      <div role="img" aria-label={t("socialPreview")} className="overflow-hidden rounded-field border border-line bg-raised">
        {ogImage ? <img src={mediaUrl(ogImage)} alt="" className="aspect-[1.91/1] w-full object-cover" /> : <div className="grid aspect-[1.91/1] place-items-center bg-sunken text-body-sm text-fg-subtle">{t("noImage")}</div>}
        {/* Always left-aligned; each line reads in its own text's direction (an English fallback keeps its full stop at the end). */}
        <div className="flex flex-col gap-0.5 p-3 text-left" dir="ltr" lang={lang}>
          <span className="text-caption uppercase text-fg-subtle">
            orgtik.ch
          </span>
          <span dir="auto" className="line-clamp-2 text-left text-body font-medium text-fg">{ogTitle || t("noTitle")}</span>
          <span dir="auto" className="line-clamp-2 text-left text-body-sm text-fg-muted">{ogDescription}</span>
        </div>
      </div>
    </Section>
  );

  const addKeyword = () => {
    const k = keyword.trim();
    if (!k || keywords.some((x) => x.toLowerCase() === k.toLowerCase())) return setKeyword("");
    edit({ keywords: [...keywords, k] });
    setKeyword("");
  };

  return (
    <div className={fullWidthFields ? "grid min-w-0 gap-4" : "grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]"}>
      <div className="flex min-w-0 flex-col gap-4">
        <IssueSpot active={spotField === "text"} label={spotLabel}>
          <DuplicatesNote conflicts={current} lang={lang} />
        </IssueSpot>
        {addressCard}
        <Section icon={<MagnifyingGlass />} title={t("search")}>
          {/* The result as a search engine shows it: address, title and description, cut where they'd be cut.
              Its colours are the search engine's own, on purpose and in both themes: it shows what people see there. */}
          {/* Always left-aligned; each line reads in its own text's direction (an English fallback keeps its full stop at the end). */}
          <div aria-label={t("searchPreview")} role="img" className="rounded-field border border-line bg-white p-4 text-left" dir="ltr" lang={lang}>
            <div className="truncate text-left text-[12px] text-[#4D5156]">
              {address}
            </div>
            <div dir="auto" className="mt-1 truncate text-left text-[20px] leading-7 text-[#1A0DAB]" style={{ fontFamily: "Arial, sans-serif" }}>
              {shownTitle ? cut(shownTitle, "20px Arial", TITLE_PX) : <span className="text-[#70757A]">{t("noTitle")}</span>}
            </div>
            <p dir="auto" className="mt-1 line-clamp-2 text-left text-[14px] leading-[22px] text-[#4D5156]" style={{ fontFamily: "Arial, sans-serif" }}>
              {shownDescription ? cut(shownDescription, "14px Arial", DESCRIPTION_PX) : <span className="text-[#70757A]">{t("noDescription")}</span>}
            </p>
          </div>
          <DuplicateHint pages={current?.address} message={(pages) => t("addressUsedOn", { pages })} />
          <IssueSpot active={spotField === "title"} label={spotLabel}>
          <Field label={t("title")} description={t("pixels", { used: titlePx, max: TITLE_PX })} error={tooLong("title")}>
            <Input dir="auto" lang={lang} readOnly={!can.edit} value={title} placeholder={lang === "en" ? undefined : english.title} onChange={(e) => edit({ title: e.target.value })} />
          </Field>
          </IssueSpot>
          <DuplicateHint pages={current?.title} message={(pages) => t("titleUsedOn", { pages })} />
          <IssueSpot active={spotField === "description"} label={spotLabel}>
          <Field label={t("description")} description={t("descriptionHelp", { count: description.length, used: descriptionPx, max: DESCRIPTION_PX })} error={tooLong("description")}>
            <Textarea dir="auto" lang={lang} rows={3} readOnly={!can.edit} value={description} placeholder={lang === "en" ? undefined : english.description} onChange={(e) => edit({ description: e.target.value })} />
          </Field>
          </IssueSpot>
          <DuplicateHint pages={current?.description} message={(pages) => t("descriptionUsedOn", { pages })} />
        </Section>

        <Section icon={<Info />} title={t("keywords")}>
          <IssueSpot active={spotField === "focus"} label={spotLabel}>
          <Field label={t("focus")} description={t.rich("focusHelp", { b: strong, max: FOCUS_WORDS })} error={tooLong("focus")}>
            <Input dir="auto" lang={lang} readOnly={!can.edit} value={focus} onChange={(e) => edit({ focus: e.target.value })} />
          </Field>
          </IssueSpot>
          {wordsIn(focus) > FOCUS_WORDS ? <WarningNote>{t("focusTooManyWords", { count: wordsIn(focus), max: FOCUS_WORDS })}</WarningNote> : null}
          <DuplicateHint pages={current?.focus} message={(pages) => t("focusUsedOn", { pages })} />
          <IssueSpot active={spotField === "keywords"} label={spotLabel}>
          <Field label={t("keywordList")} description={t.rich("keywordListHelp", { b: strong, max: KEYWORD_WORDS })} error={err("keywords") ? t("keywordsInvalid") : undefined}>
            <div className="flex flex-col gap-2">
              {keywords.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {keywords.map((k) => (
                    <li key={k}>
                      <Tag className={wordsIn(k) > KEYWORD_WORDS ? "border-warning text-warning" : undefined} onRemove={can.edit ? () => edit({ keywords: keywords.filter((x) => x !== k) }) : undefined}>
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
          </IssueSpot>
          {/* While typing, then for any keyword already added that runs long (marked in the list above). */}
          {wordsIn(keyword) > KEYWORD_WORDS ? <WarningNote>{t("keywordTooManyWords", { count: wordsIn(keyword), max: KEYWORD_WORDS })}</WarningNote> : null}
          {keywords.some((k) => wordsIn(k) > KEYWORD_WORDS) ? (
            <WarningNote>{t("keywordsTooLong", { keywords: keywords.filter((k) => wordsIn(k) > KEYWORD_WORDS).join(", "), max: KEYWORD_WORDS })}</WarningNote>
          ) : null}
        </Section>

        <Section icon={<ShareNetwork />} title={t("social")}>
          <Field label={t("ogTitle")} description={t("ogFallback")} error={tooLong("ogTitle")}>
            <Input dir="auto" lang={lang} readOnly={!can.edit} value={seo.ogTitle ?? ""} placeholder={shownTitle} onChange={(e) => edit({ ogTitle: e.target.value })} />
          </Field>
          <Field label={t("ogDescription")} description={t("ogFallback")} error={tooLong("ogDescription")}>
            <Textarea dir="auto" lang={lang} rows={2} readOnly={!can.edit} value={seo.ogDescription ?? ""} placeholder={shownDescription} onChange={(e) => edit({ ogDescription: e.target.value })} />
          </Field>
          <IssueSpot active={spotField === "ogImage"} label={spotLabel}>
          <Field label={t("ogImage")} description={t("ogImageHelp")}>
            <Select readOnly={!can.edit} value={seo.ogImage || "default"} onValueChange={(v) => edit({ ogImage: !v || v === "default" ? "" : v })} options={[{ value: "default", label: t("ogImageDefault") }, ...images.map((i) => ({ value: i.value, label: <span dir="ltr">{i.label}</span> }))]} />
          </Field>
          </IssueSpot>
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
                readOnly={!can.edit}
                value={seo.robots ?? "index"}
                onValueChange={(v) => edit({ robots: v as "index" | "noindex" })}
                options={[
                  { value: "index", label: t("robotsIndex") },
                  { value: "noindex", label: t("robotsNoindex") },
                ]}
              />
            </Field>
            <div className="flex items-end pb-2">
              <Checkbox disabled={!can.edit} checked={seo.inSitemap !== false} onCheckedChange={(v: boolean) => edit({ inSitemap: v })} label={t("inSitemap")} />
            </div>
          </div>
          {/* Always the page's own address: set automatically, never typed in. */}
          <Field label={t("canonical")} description={t("canonicalHelp")}>
            <Input dir="ltr" readOnly value={canonical} />
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
                  return edit({ jsonLd: null });
                }
                try {
                  edit({ jsonLd: JSON.parse(v) });
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
