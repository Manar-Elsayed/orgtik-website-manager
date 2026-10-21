"use client";

import { useEffect, useRef, useState } from "react";
import type { WmDispatch } from "@/store";
import { useDispatch } from "react-redux";
import { ElementComments } from "@/components/studio/ElementComments";
import { StudioFeedback } from "@/components/studio/StudioUI";
import { useStudioAction, StudioError } from "@/lib/studio";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import {
  ClockCounterClockwise,
  Flask,
  Translate,
} from "@phosphor-icons/react";
import {
  Badge,
  Button,
  ConfirmDialog,
  DialogBody,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  NoPermissionState,
  NumberField,
  PageHeader,
  Select,
  Sheet,
  SheetContent,
  SheetTrigger,
  StatusBadge,
  Switch,
  Tabs,
  TabsList,
  TabsPanel,
  Textarea,
  toast,
  useFormatter,
} from "@orgtik/ui";
import { DatePicker } from "@orgtik/ui/dates";
import {
  ValueEditor,
  type EditorContext,
} from "@/components/content/BlockEditor";
import {
  ScheduleButton,
  TranslationBar,
  VersionRow,
} from "@/components/content/EditorExtras";
import { SeoPanel, type SeoBlock } from "@/components/content/SeoPanel";
import { PricingAuthority } from "@/components/content/PricingAuthority";
import { SharedCopyPanel, SHARED_PAGES } from "@/components/content/SharedCopyPanel";
import { IconPicker } from "./IconPicker";
import { YearPicker } from "./YearPicker";
import { CaseStudyDisplay } from "./CaseStudyDisplay";
import { SectionOrder } from "./SectionOrder";
import { SectionAttachments } from "./SectionAttachments";
import { MediaPicker } from "@/components/media/MediaPicker";
import managerPages from "@/lib/manager-pages.json";
import { PageFields, PageCards, PageSectionCard, PagePlacementHint, type PageField } from "./PageFields";
import { pageMediaPlacement, pageSectionPlacement, resolvedPageFieldPlacement } from "@/lib/pagePlacement";
import { pagePreviewHref } from "@/lib/pagePreview";
import { SectionPreviewLink } from "./SectionPreviewLink";
import { CaseStudyFormatLabels } from "./CaseStudyFormatLabels";
import { caseFormatExamples, caseFormatPreviewHref } from "@/lib/caseFormatLabels";
import { CommerceNavigation, CommerceSection } from "./CommerceEditor";
import { commerceNavigation, commercePresentation } from "@/lib/commerceEditor";
import { commercePreviewHref } from "@/lib/commercePreview";
import { RotationWords } from "./RotationWords";
import { CollectionOrder } from "./CollectionOrder";
import sectionMap from "@/lib/cms-sections.json";
import { orderEditorSections } from "@/lib/editorSectionOrder";
import { ReviewEditor } from "./ReviewEditor";
import { ArticleBodyEditor, synchronizeArticleEdits } from "./ArticleBodyEditor";
import {
  LifecycleActions,
  VisibilityBadge,
} from "@/components/content/Lifecycle";
import {
  typeOfId,
  type ContentType,
  type EditorSection,
} from "@/lib/contentTypes";

import { useEntryName } from "@/lib/entryName";
import { useCan } from "@/lib/permissions";
import { safeReturn } from "@/lib/useListState";
import { WEBSITE_URL } from "@/lib/env";
import { IssueSpot } from "@/components/seo/IssueSpot";
import {
  api,
  statusOf,
  useApproveFiguresMutation,
  useEntriesQuery,
  useEntryQuery,
  usePageSourcesQuery,
  useIndexingQuery,
  useMediaQuery,
  useMeQuery,
  useSiteQuery,
  useSaveEntryMutation,
  useTransitionEntryMutation,
  type ApiError,
  type Entry,
  type Locale,
  type NeutralPatch,
  type Period,
  type PriceMode,
  type RoadmapStatus,
  type Transition,
} from "@/store/api";

const LOCALES: Locale[] = ["en", "ar", "de", "fr", "it"];
// The canonical URL the site prints for a page: the canonical host, the language prefix (none for
// English) and the page's address, as the sitemap builds it.
const canonicalUrl = (host: string, lang: Locale, path: string) => host.replace(/\/+$/, "") + (lang === "en" ? "" : `/${lang}`) + (path === "/" && lang !== "en" ? "" : path);
const NATIVE: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
};
type Tree = Record<string, unknown>;
const ROADMAP_STATUS: RoadmapStatus[] = [
  "open",
  "planned",
  "in_progress",
  "shipped",
];
const PERIODS: Period[] = ["past", "now", "next"];

const get = (tree: Tree | undefined, path: string) =>
  path ? tree?.[path] : tree;
const put = (tree: Tree, path: string, v: unknown): Tree =>
  path ? { ...tree, [path]: v } : (v as Tree);

function Editor({ entry, type, seoOnly = false }: { entry: Entry; type: ContentType; seoOnly?: boolean }) {
  const t = useTranslations("Editor");
  const ti = useTranslations("Improvements");
  const nav = useTranslations("Nav");
  const tp = useTranslations("Preview");
  const router = useRouter();
  const tt = useTranslations("Types");
  const ta = useTranslations("Areas");
  const tn = useTranslations("NoAccess");
  const tf = useTranslations("Formats");
  const tl = useTranslations("Fields");
  const caseLabels = useTranslations("CaseStudyLabels");
  const purchasing = useTranslations("PurchasingEditor");
  const placementText = useTranslations("PagePlacement");
  const f = useFormatter();
  const uiLocale = useLocale();
  const permitted = useCan();
  const params = useSearchParams();
  const viewing = params.get("view") === "1";
  const can = (permission: string) => (!viewing || permission.endsWith(":view")) && (!seoOnly || !permission.startsWith("content:")) && permitted(permission);
  const images = useMediaQuery({ kind: "image", pageSize: 100 });
  const indexing = useIndexingQuery(undefined, { skip: !can("seo:view") });
  const me = useMeQuery();
  const site = useSiteQuery();
  const contentLocales = (site.data?.locales.filter(locale=>locale.enabled).map(locale=>locale.code) ?? LOCALES) as Locale[];
  const languageName = (locale:string) => NATIVE[locale as Locale] ?? new Intl.DisplayNames([locale],{type:"language"}).of(locale) ?? locale;
  const pageConfig = (managerPages as Record<string, {fields?: Record<string,{label:string;fields:PageField[]}>; supplemental?: Record<string,{titleKey?:string;fields:PageField[]}>; rotationSource?: "service"|"softwareModule"|"caseStudy"|"article"; staticRotation?: string[]; collections?: Record<string, "service"|"caseStudy"|"article">}>)[entry.id];
  const sourceQuery = usePageSourcesQuery(entry.id, {skip: !pageConfig || seoOnly});
  const [sourceEdits, setSourceEdits] = useState<Record<string, Partial<Record<Locale, Tree>>>>({});
  const references = (sectionMap as Record<string, { references?: Record<string, string> }>)[entry.id]?.references ?? {};
  const sections: EditorSection[] = seoOnly ? [] : [...type.sections(entry), ...Object.keys(references).map(value => ({ value, path: "", label: ti(value), node: { kind: "group" as const, fields: {} } })), ...(SHARED_PAGES[entry.id] ? [{ value: "shared-copy", path: "", label: ti("sharedCopy"), node: { kind: "group" as const, fields: {} } }] : [])];
  // ?lang=ar opens the editor in that language (from the localization matrix).
  const asked = useSearchParams().get("lang") as Locale | null;
  const spotIssue = params.get("issue") ?? undefined;
  const ts = useTranslations("Seo.block"), tc = useTranslations("Seo");
  const spotLabel = spotIssue ? ts("fixHere", { issue: tc(`checks.${spotIssue}`) }) : "";
  const [lang, setLang] = useState<Locale>(
    asked && (contentLocales.includes(asked) || ["es","pt","nl"].includes(asked)) ? asked : "en",
  );
  const [section, setSection] = useState<string>(seoOnly ? "seo" : params.get("section") ?? (entry.id === "gl_commerce" ? commerceNavigation(sections)[0]?.sections[0]?.value : orderEditorSections(entry.id, sections, entry.content.presentation?.sectionOrder)[0]?.value) ?? "seo");
  const [sharedPreviewSection, setSharedPreviewSection] = useState<string | null>(null);
  // Unsaved edits per language, over the entry's current content.
  const [edits, setEdits] = useState<Partial<Record<Locale, Tree>>>({});
  const [seoEdits, setSeoEdits] = useState<Partial<Record<Locale, SeoBlock>>>(
    {},
  );
  const [slugEdit, setSlugEdit] = useState<string | null>(null);
  const [neutralEdit, setNeutralEdit] = useState<NeutralPatch>({});
  const [altEdits, setAltEdits] = useState<Partial<Record<Locale, string>>>({});
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFocal, setImageFocal] = useState<{ x: number; y: number }>();
  const [presentationEdit, setPresentationEdit] = useState<Entry["content"]["presentation"]>();
  const presentation = presentationEdit ?? entry.content.presentation ?? { sectionOrder: [], sectionMedia: {}, cursor: { text: {}, link: "" } };
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stale, setStale] = useState<{ by: string } | null>(null);
  const savingAction = useStudioAction("entry:"+entry.id);
  const [saveLegacy,legacySaving] = useSaveEntryMutation();
  const saving = {isLoading:savingAction.busy||legacySaving.isLoading};
  const dispatch = useDispatch<WmDispatch>();
  const v3 = useTranslations("WmV3");
  const [autosaving,setAutosaving] = useState(entry.type !== "page");
  const [transition, moving] = useTransitionEntryMutation();
  const [approveFigures] = useApproveFiguresMutation();
  // Services live under their family's address; articles are filed under a family.
  const needsFamilies =
    type.key === "service" || type.key === "review" || type.neutral.includes("category");
  const relatedServices = useEntriesQuery({ type: "service", pageSize: 100 }, { skip: type.key !== "review" });
  const relatedSoftware = useEntriesQuery({ type: "softwareModule", pageSize: 100 }, { skip: type.key !== "review" });
  const caseStudies = useEntriesQuery({ type: "caseStudy", pageSize: 100 }, { skip: entry.id !== "gl_caseFormats" });
  const formatExamples = caseFormatExamples(caseStudies.data?.items ?? []);
  const formatExample = Object.values(formatExamples)[0];
  const families = useEntriesQuery(
    { type: "serviceFamily", pageSize: 100 },
    { skip: !needsFamilies },
  );

  const ref = { type: entry.type, id: entry.id };
  const saved = entry.content.locales[lang] as Tree | undefined;
  const english = entry.content.locales.en as Tree;
  const tree = edits[lang] ?? saved;
  const neutral = { ...entry.content, ...neutralEdit };
  const reviewRelatedEntries = neutral.relatedEntries ?? (neutral.relatedEntry ? [neutral.relatedEntry] : []);
  const alt = { ...(entry.content.image?.alt ?? {}), ...altEdits };
  const dirty =
    [edits, seoEdits, neutralEdit, altEdits, sourceEdits].some(
      (o) => Object.keys(o).length > 0,
    ) || slugEdit !== null || imageSrc !== null || Boolean(presentationEdit);
  // Retained catalog mirrors are read-only. Current prices are owned by the platform.
  const managedIn = entry.content.managedIn ?? null;
  const editable = can("content:edit") && !managedIn;
  const mayEdit = seoOnly ? permitted("seo:edit") : permitted("content:edit") && !managedIn;
  const editQuery = new URLSearchParams(params.toString());
  editQuery.delete("view");
  editQuery.set("lang", lang);
  editQuery.set("section", section);
  const editHref = `${seoOnly ? "/seo/content" : `/content/${type.area}`}/${entry.id}?${editQuery}`;
  // The SEO team edits an entry's SEO block (and only that); a draft changing nothing else goes
  // through their review too (the SEO fast lane).
  const seoEditable = can("content:edit") || can("seo:edit");
  const seoLane = Boolean(entry.seoOnly);
  // Legal text needs a legal approver; prices someone who may approve prices (four eyes).
  const canApprove =
    (can("content:approve") ||
      (Boolean(entry.seoOnly) && can("seo:approve"))) &&
    (type.key !== "legalDocument" || can("legal:approve")) &&
    (type.key !== "pricing" || can("pricing:approve"));
  // A number the website prices with changes only with pricing:edit; words stay editable.
  const pricesLocked = type.key === "pricing" && !can("pricing:edit");
  const ctx: EditorContext = {
    lang,
    currency: entry.content.currency,
    readOnly: !editable,
    structureLocked: lang !== "en" || !editable || pricesLocked,
    numbersLocked: lang !== "en" || !editable || pricesLocked,
    mediaAlwaysOpen: type.key === "caseStudy",
    fullWidthFields: type.key === "article",
    errors,
  };
  const lastEditor = entry.lastEditor ?? entry.versions.find((v) => v.state === "draft")?.by.key;
  const mine = entry.hasDraft && lastEditor === me.data?.user.key;
  const ownPageApproval = type.key === "page" && me.data?.roles.some(role => ["wm_admin", "wm_super_admin", "wm_owner"].includes(role.key));
  const needsAnotherApprover = mine && !ownPageApproval;
  const areaTitle = seoOnly ? ti("seoHealth") : ta(`${type.area}.title`);
  const entryName = useEntryName();
  const name = entryName(entry) || String(english?.name ?? "");
  const familySlug = entry.parent
    ? families.data?.items.find((x) => x.id === entry.parent)?.slug.en
    : undefined;
  const slug = slugEdit ?? entry.content.slug.en ?? "";
  // Published at another address: publishing this one moves it, and the old one redirects.
  const liveSlug = entry.live?.slug?.en;
  // Where the preview opens: this entry's own address, or the page that shows it.
  const previewPath = type.seo
    ? type.fixedAddress
      ? slug
      : type.path(slug, familySlug)
    : ((
        { roadmapItem: "/roadmap", pricing: "/software" } as Record<
          string,
          string
        >
      )[type.key] ?? "/");
  const previewHref = (target = section === "shared-copy" ? sharedPreviewSection ?? "seo" : section): string | undefined => {
    const placement = pageSectionPlacement(entry.id, target);
    if (placement?.preview === false) return undefined;
    if (SHARED_PAGES[entry.id]?.id === "gl_commerce" && target !== "seo") return commercePreviewHref(target, lang);
    return entry.id === "gl_commerce"
      ? commercePreviewHref(target, lang) ?? `/preview?path=%2Fplans&lang=${lang}`
      : entry.id === "gl_caseFormats" && formatExample
      ? caseFormatPreviewHref(formatExample, lang)
      : type.key === "page"
      ? pagePreviewHref({ pageId: entry.id, section: target, locale: lang, path: previewPath })
      : `/preview?path=${encodeURIComponent(previewPath)}&lang=${lang}${placement?.previewTarget ? `&section=${encodeURIComponent(placement.previewTarget)}` : ""}`;
  };

  // Leaving with unsaved edits asks first (the browser's own prompt).
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const onError = (e: unknown) => {
    const err = e as ApiError;
    if (err.status === 412) setStale({ by: err.by ?? "" });
    else if (err.status === 422 && err.fieldErrors) {
      // The API names fields by their place in the entry; the editor by their place in one language.
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(err.fieldErrors))
        mapped[
          k
            .replace(`locales.${lang}.`, "")
            .replace(`seo.${lang}.`, "seo.")
            .replace(`slug.${lang}`, "slug")
        ] = v;
      setErrors(mapped);
    } else if (err.code === "four_eyes")
      toast.error(
        err.message?.includes("translation")
          ? t("fourEyesTranslation")
          : t("fourEyes"),
      );
    else if (err.status === 403)
      toast.error(tn("actionBody", { permission: err.required ?? "" }));
    // The API's own messages are English; the screen says it in the person's language.
    else toast.error(t("saveFailed"));
  };

  const editStamp = JSON.stringify({sourceEdits,edits,seoEdits,slugEdit,neutralEdit,altEdits,imageSrc,imageFocal,presentationEdit});
  const latestEdit = useRef(editStamp);
  latestEdit.current = editStamp;
  const acceptSaved = (result:unknown,stamp?:string) => {
    const value=result as Entry;
    dispatch(api.util.upsertQueryData("entry",{type:entry.type,id:entry.id},value));
    dispatch(api.util.invalidateTags(["EntryList","Overview","Seo","Media","MediaList"]));
    if(stamp && latestEdit.current===stamp){setEdits({});setSeoEdits({});setSlugEdit(null);setNeutralEdit({});setAltEdits({});setImageSrc(null);setImageFocal(undefined);setPresentationEdit(undefined);setSourceEdits({});}
  };
  const saveRestricted = async () => {
    setErrors({});
    let version = entry.version;
    try {
      for (const l of contentLocales) {
        const fields = edits[l];
        const seo = seoEdits[l];
        const s = l === "en" ? slugEdit : null;
        if (!fields && !seo && s === null) continue;
        version = (
          await saveLegacy({
            ...ref,
            version,
            patch: { locale: l, fields, seo, slug: s ?? undefined },
          }).unwrap()
        ).version;
      }
      if (Object.keys(neutralEdit).length || Object.keys(altEdits).length || imageSrc !== null || presentationEdit) {
        const patch = {
          neutral: Object.keys(neutralEdit).length ? neutralEdit : undefined,
          image: Object.keys(altEdits).length || imageSrc !== null ? { alt, ...(imageSrc !== null ? { src: imageSrc, focal: imageFocal } : {}) } : undefined,
          presentation: presentationEdit,
        };
        version = (await saveLegacy({ ...ref, version, patch }).unwrap()).version;
      }
      setEdits({});
      setSeoEdits({});
      setSlugEdit(null);
      setNeutralEdit({});
      setAltEdits({});
      setImageSrc(null);
      setImageFocal(undefined);
      setPresentationEdit(undefined);
      toast.success(t("saved"));
    } catch (e) {
      onError(e);
    }
  };

  const makePatches = () => {
    const patches=[];
    for(const l of contentLocales){const fields=edits[l],seo=seoEdits[l],slug=l==="en"?slugEdit:null;if(fields||seo||slug!==null)patches.push({locale:l,fields,seo,slug:slug??undefined});}
    if(Object.keys(neutralEdit).length||Object.keys(altEdits).length||imageSrc!==null||presentationEdit)patches.push({neutral:Object.keys(neutralEdit).length?neutralEdit:undefined,image:Object.keys(altEdits).length||imageSrc!==null?{alt,...(imageSrc!==null?{src:imageSrc,focal:imageFocal}:{})}:undefined,presentation:presentationEdit});
    return patches;
  };
  const saveAll = async () => {
    if (pageConfig && !seoOnly && editable) {
      const commands = [{id:entry.id,version:entry.version,patches:makePatches()}, ...(sourceQuery.data ?? []).filter(item=>sourceEdits[item.id]).map(item=>({id:item.id,version:item.version,patches:Object.entries(sourceEdits[item.id]).map(([locale,fields])=>({locale,fields}))}))].filter(command=>command.patches.length);
      try {const result = await savingAction.run<Entry>("/studio/page-draft/"+entry.id,{commands}); acceptSaved(result,editStamp); dispatch(api.util.invalidateTags(["Entry"])); toast.success(t("saved"));} catch (error) {if(error instanceof StudioError && error.status===412)setStale({by:""});else onError(error);}
      return;
    }
    if(managedIn || ["pricing","legalDocument","service","softwareModule","serviceFamily"].includes(entry.type))return saveRestricted();
    setErrors({});
    const stamp=editStamp;
    const patches=makePatches();
    try{const result=await savingAction.run<Entry>("/studio/entries/"+entry.id+"/autosave",{version:entry.version,patches});acceptSaved(result,stamp);}catch(error){if(error instanceof StudioError&&error.status===412)setStale({by:""});else if(!(error instanceof StudioError&&error.uncertain))onError(error);}
  };
  useEffect(()=>{if(!dirty||!autosaving||savingAction.busy||savingAction.pending||savingAction.error||!editable&&!seoEditable||managedIn||["pricing","legalDocument","service","softwareModule","serviceFamily"].includes(entry.type))return;const timer=setTimeout(()=>void saveAll(),1200);return()=>clearTimeout(timer);},[editStamp,autosaving,savingAction.busy,savingAction.pending,savingAction.error,entry.version,editable,seoEditable,managedIn]);

  const act = (action: Transition, note?: string) =>
    transition({ ...ref, version: entry.version, action, note }).unwrap();

  const state = entry.state;
  const primary = (() => {
    if (dirty)
      return (
        <Button loading={saving.isLoading} onClick={saveAll}>
          {t("save")}
        </Button>
      );
    if (
      state === "draft" &&
      (editable ||
        (seoLane && (can("seo:edit") || (managedIn && can("content:edit")))))
    )
      return (
        <Button
          loading={moving.isLoading}
          onClick={() => act("submit").catch(onError)}
        >
          {t("submit")}
        </Button>
      );
    if (state === "in_review" && canApprove)
      return (
        <Button
          disabled={needsAnotherApprover}
          title={needsAnotherApprover ? t("fourEyes") : undefined}
          onClick={() => act("approve").catch(onError)}
        >
          {t("approve")}
        </Button>
      );
    if (state === "scheduled" && canApprove)
      return (
        <Button
          variant="secondary"
          loading={moving.isLoading}
          onClick={() =>
            act("unschedule")
              .then(() => toast.success(t("unscheduled")))
              .catch(onError)
          }
        >
          {t("unschedule")}
        </Button>
      );
    if (state === "approved" && canApprove)
      return (
        <span className="inline-flex flex-wrap gap-2">
          <ScheduleButton
            onError={onError}
            onSchedule={(publishAt) =>
              transition({
                ...ref,
                version: entry.version,
                action: "schedule",
                publishAt,
              })
                .unwrap()
                .then(() => toast.success(t("scheduled")))
            }
          />
          <ConfirmDialog
            trigger={<Button>{t("publish")}</Button>}
            tone="primary"
            title={t("publishTitle", { name })}
            impact={t("publishImpact")}
            confirmLabel={t("publishConfirm")}
            onConfirm={() =>
              act("publish").then(
                () => toast.success(t("publish")),
                (e) => {
                  // A legal version without its own number or date: say which field, then keep the dialog.
                  onError(e);
                  throw e;
                },
              )
            }
          />
        </span>
      );
    return null;
  })();

  const setTree = (next: Tree) => setEdits(current => {
    const result = { ...current, [lang]: next };
    if (type.key === "article" && lang === "en" && next.sections) for (const locale of contentLocales) {
      if (locale !== "en" && current[locale]) result[locale] = { ...current[locale], sections: synchronizeArticleEdits(next.sections, (current.en ?? english).sections, current[locale]?.sections) };
    }
    return result;
  });
  // A section is named by the page's own heading, a field name, or the editor's tab name.
  const sectionName = (s: EditorSection) =>
    pageSectionPlacement(entry.id, s.value)?.title ? placementText(pageSectionPlacement(entry.id, s.value)!.title) : entry.id === "gl_commerce" ? purchasing(commercePresentation(s.value).titleKey) : (s.label === "Custom Cursor" || s.label === "View project" ? ti("customCursor") : s.label) ??
    (s.labelKey && tl.has(s.labelKey)
      ? tl(s.labelKey)
      : t.has(`tabs.${s.value}`)
        ? t(`tabs.${s.value}`)
        : t("sectionFallback", { key: s.value }));
  const purchasingMediaDescription = (key: string) => {
    if (key.startsWith("siteHeader-") || key.startsWith("accountControl-")) return purchasing("mediaHeader");
    if (key === "commerceLayout-footer") return purchasing("mediaFooter");
    const screen = key.startsWith("purchasePlans-") ? "plans" : key.startsWith("purchaseCart-") ? "cart" : key.startsWith("purchaseCheckout-") || key.startsWith("paymentDetails-") ? "checkout" : undefined;
    return screen ? purchasing("mediaPage", { page: purchasing(`screens.${screen}`) }) : purchasing("mediaAcross");
  };
  const tabItems = [
    ...orderEditorSections(entry.id, sections, presentation.sectionOrder).map((s) => ({
      value: s.value,
      label: <span dir="auto">{sectionName(s)}</span>,
    })),
    ...(type.seo ? [{ value: "seo", label: t("tabs.seo") }] : []),
  ];
  // More sections than fit in a row (a page has up to a dozen) go in a column beside the form.
  const side = entry.id === "pg_about" || tabItems.length > 6;
  const seo = { ...(entry.content.seo[lang] ?? {}), ...(seoEdits[lang] ?? {}) };
  const hasShared = type.key !== "review" && (type.neutral.length > 0 || type.image);
  const lockShared = !editable || lang !== "en";
  const body = (sectionMap as Record<string, { body: string[] }>)[entry.id]?.body ?? [];
  const orderedBody = [...new Set([...presentation.sectionOrder.filter(key => body.includes(key)), ...body])];

  // What every language shares (icon, date, family...) and the image with its description in this
  // language. Shared fields are set in English; the description is per language.
  const sharedField = (path: string, label: string, description?: string) => {
    const placement = resolvedPageFieldPlacement(entry.id, section, entry.id, path, placementText);
    const descriptions = [...new Set([placement?.hint, description].filter((value): value is string => Boolean(value)))];
    return { label: placement?.label ?? label, description: descriptions.length ? descriptions.join(" ") : undefined };
  };
  const sharedImagePlacement = resolvedPageFieldPlacement(entry.id, section, entry.id, "image.src", placementText);
  const shared = hasShared ? (
    <section
      aria-labelledby="shared"
      className="mb-6 flex flex-col gap-4 rounded-card border border-line bg-raised p-4"
    >
      <div className="flex flex-col gap-0.5">
        <h3 id="shared" className="text-label text-fg">
          {t("shared")}
        </h3>
        {lang !== "en" ? (
          <p className="text-body-sm text-fg-muted">{t("sharedNote")}</p>
        ) : null}
      </div>
      <div className={ctx.fullWidthFields ? "grid min-w-0 gap-4" : "grid gap-4 sm:grid-cols-2"}>
        {type.neutral.includes("icon") ? (
          <Field {...sharedField("icon", tl("icon"), t("iconHelp"))}>
            <IconPicker disabled={!editable || lang !== "en"} value={neutral.icon ?? ""} onChange={icon => setNeutralEdit(previous => ({ ...previous, icon }))} />
          </Field>
        ) : null}
        {type.neutral.includes("category") ? (
          <Field {...sharedField("category", tl("articleCategory"))}>
            <Select
              readOnly={!editable || lang !== "en"}
              value={neutral.category ?? ""}
              onValueChange={(v) =>
                v && setNeutralEdit((n) => ({ ...n, category: v }))
              }
              options={(families.data?.items ?? []).map((x) => ({
                value: x.slug.en ?? x.id,
                label: <span dir="auto">{x.name}</span>,
              }))}
            />
          </Field>
        ) : null}
        {type.neutral.includes("publishedOn") ? (
          <Field
            {...sharedField("publishedOn", tl("publishedOn"))}
            error={errors.publishedOn ? t("errorRequired") : undefined}
          >
            <DatePicker
              aria-label={sharedField("publishedOn", tl("publishedOn")).label}
              disabled={!editable || lang !== "en"}
              value={neutral.publishedOn ?? null}
              onChange={(v) =>
                setNeutralEdit((n) => ({ ...n, publishedOn: v }))
              }
            />
          </Field>
        ) : null}
        {type.neutral.includes("readingMinutes") ? (
          <Field
            {...sharedField("readingMinutes", tl("readingMinutes"))}
            error={errors.readingMinutes ? t("errorRequired") : undefined}
          >
            <NumberField
              min={1}
              max={120}
              readOnly={!editable || lang !== "en"}
              disabled={!editable || lang !== "en"}
              value={neutral.readingMinutes ?? null}
              onValueChange={(v) =>
                setNeutralEdit((n) => ({
                  ...n,
                  readingMinutes: v ?? undefined,
                }))
              }
            />
          </Field>
        ) : null}
        {type.neutral.includes("priceMode") ? (
          <Field {...sharedField("priceMode", tl("priceMode"), t("priceModeHelp"))}>
            <Select
              readOnly={lockShared || pricesLocked}
              value={neutral.priceMode ?? "indicative"}
              onValueChange={(v) =>
                v &&
                setNeutralEdit((n) => ({ ...n, priceMode: v as PriceMode }))
              }
              options={(["indicative", "on_request"] as const).map((x) => ({
                value: x,
                label: t(`priceModes.${x}`),
              }))}
            />
          </Field>
        ) : null}
        {managedIn ? (
          <p role="note" className="text-body-sm text-fg-muted sm:col-span-2">
            {type.key === "pricing" ? t("historicalPricingBody") : t("catalogReferenceBody")}
          </p>
        ) : type.key === "pricing" ? (
          <p className="self-end text-body-sm text-fg-muted sm:col-span-2">
            {pricesLocked ? t("pricesLocked") : t("pricesNote")}
          </p>
        ) : null}
        {type.neutral.includes("status") ? (
          <Field
            {...sharedField("status", tl("roadmapStatus"))}
            error={errors.status ? t("errorRequired") : undefined}
          >
            <Select
              readOnly={lockShared}
              value={neutral.status ?? "open"}
              onValueChange={(v) =>
                v &&
                setNeutralEdit((n) => ({ ...n, status: v as RoadmapStatus }))
              }
              options={ROADMAP_STATUS.map((x) => ({
                value: x,
                label: (
                  <StatusBadge entity="roadmap_idea" state={x} size="sm" />
                ),
              }))}
            />
          </Field>
        ) : null}
        {type.neutral.includes("period") ? (
          <Field
            {...sharedField("period", tl("period"))}
            error={errors.period ? t("errorRequired") : undefined}
          >
            <Select
              readOnly={lockShared}
              value={neutral.period ?? "now"}
              onValueChange={(v) =>
                v && setNeutralEdit((n) => ({ ...n, period: v as Period }))
              }
              options={PERIODS.map((x) => ({
                value: x,
                label: t(`periods.${x}`),
              }))}
            />
          </Field>
        ) : null}
        {type.neutral.includes("year") ? (
          <Field
            {...sharedField("year", tl("year"))}
            error={errors.year ? t("errorYear") : undefined}
          >
            <YearPicker
              label={sharedField("year", tl("year")).label}
              disabled={lockShared}
              value={neutral.year ?? ""}
              onValueChange={(year) =>
                setNeutralEdit((n) => ({ ...n, year: year ?? "" }))
              }
            />
          </Field>
        ) : null}
        {type.neutral.includes("progress") ? (
          <Field
            {...sharedField("progress", tl("progress"))}
            error={
              errors.progress
                ? t("errorRange", { min: 0, max: 100 })
                : undefined
            }
          >
            <NumberField
              min={0}
              max={100}
              readOnly={lockShared}
              disabled={lockShared}
              value={neutral.progress ?? null}
              onValueChange={(v) =>
                setNeutralEdit((n) => ({ ...n, progress: v ?? 0 }))
              }
              format={{ style: "unit", unit: "percent" }}
            />
          </Field>
        ) : null}
        {type.neutral.includes("versionLabel") ? (
          <Field
            {...sharedField("versionLabel", tl("versionLabel"), t("versionHelp"))}
            error={
              errors.versionLabel
                ? errors.versionLabel === "version_exists"
                  ? t("errorVersionExists")
                  : t("errorRequired")
                : undefined
            }
          >
            <Input
              dir="ltr"
              readOnly={lockShared}
              value={neutral.versionLabel ?? ""}
              onChange={(e) =>
                setNeutralEdit((n) => ({ ...n, versionLabel: e.target.value }))
              }
            />
          </Field>
        ) : null}
        {type.neutral.includes("effectiveFrom") ? (
          <Field
            {...sharedField("effectiveFrom", tl("effectiveFrom"))}
            error={errors.effectiveFrom ? t("errorEffectiveFrom") : undefined}
          >
            <DatePicker
              aria-label={sharedField("effectiveFrom", tl("effectiveFrom")).label}
              disabled={lockShared}
              value={neutral.effectiveFrom ?? null}
              onChange={(v) =>
                setNeutralEdit((n) => ({ ...n, effectiveFrom: v }))
              }
            />
          </Field>
        ) : null}
      </div>
      {entry.legalVersions ? (
        // Legal text is versioned: what was published stays as it was, a change is a new version.
        <section
          aria-labelledby="legal-versions"
          className="flex flex-col gap-2 border-t border-line pt-4"
        >
          <h4 id="legal-versions" className="text-label text-fg">
            {t("legalVersions")}
          </h4>
          <p className="text-body-sm text-fg-muted">{t("legalNote")}</p>
          <ol className="flex flex-col gap-2">
            {entry.legalVersions.map((v) => (
              <li
                key={v.versionLabel + v.publishedAt}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-body-sm"
              >
                <span dir="ltr" className="font-semibold text-fg tabular-nums">
                  {v.versionLabel}
                </span>
                <span className="text-fg-muted">
                  {v.effectiveFrom
                    ? t("effectiveOn", {
                        date: f.date(v.effectiveFrom + "T00:00:00", {
                          dateStyle: "medium",
                        }),
                      })
                    : t("noEffectiveDate")}
                </span>
                <span className="text-fg-subtle">
                  {t("publishedOn", {
                    date: f.date(v.publishedAt, { dateStyle: "medium" }),
                  })}
                </span>
                {v.note ? (
                  <span dir="auto" className="basis-full text-fg-muted">
                    {v.note}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {type.image && entry.content.image ? (
        <>
        {errors["image.src"] ? <p role="alert" className="text-body-sm text-danger">{t("errorRequired")}</p> : null}
        <div className={ctx.fullWidthFields ? "grid min-w-0 items-start gap-4" : "grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.65fr)]"}>
          <div className="min-w-0">{sharedImagePlacement ? <div className="mb-2 flex flex-col gap-1"><h4 className="text-label text-fg">{sharedImagePlacement.label}</h4>{sharedImagePlacement.hint ? <p className="text-body-sm text-fg-muted">{sharedImagePlacement.hint}</p> : null}</div> : null}<MediaPicker imagesOnly alwaysOpen={type.key === "caseStudy"} value={imageSrc ?? entry.content.image.src} onChange={(src, media) => { setImageSrc(src); setImageFocal(media?.focal); if (media?.alt) setAltEdits(media.alt); }} disabled={!editable || lang !== "en"} /></div>
          <IssueSpot active={spotIssue === "imageNoAlt" && lang === asked && !alt[lang]} label={spotLabel}>
          <Field
            {...sharedField("image.alt", t("altText"), alt[lang] ? t("altHelp") : t("altMissing"))}
            className="min-w-0 flex-1"
          >
            <Textarea
              dir="auto"
              lang={lang}
              rows={2}
              readOnly={!editable}
              value={alt[lang] ?? ""}
              onChange={(e) =>
                setAltEdits((a) => ({ ...a, [lang]: e.target.value }))
              }
            />
          </Field>
          </IssueSpot>
        </div>
        </>
      ) : null}
    </section>
  ) : null;

  const returnToView = () => { const query = new URLSearchParams(params.toString()); query.set("view", "1"); router.replace(`${seoOnly ? "/seo/content" : `/content/${type.area}`}/${entry.id}?${query}`); };
  const discardLocal = () => {setEdits({});setSourceEdits({});setSeoEdits({});setSlugEdit(null);setNeutralEdit({});setAltEdits({});setImageSrc(null);setImageFocal(undefined);setPresentationEdit(undefined);setErrors({});returnToView();};

  return (
    <div className="wm-entry-editor flex flex-col gap-6 pb-24">

      <PageHeader
        breadcrumb={[
          { label: areaTitle, href: `/${uiLocale}${safeReturn(params.get("returnTo"), (seoOnly ? "/seo" : `/content/${type.area}`))}` },
          { label: <span dir="auto">{name}</span> },
        ]}
        title={<span dir="auto">{name}</span>}
        description={
          type.key === "page" ? undefined : entry.id === "gl_commerce" ? purchasing("summary") : entry.id === "gl_caseFormats" ? caseLabels("summary") : entry.department ? tf(entry.department) : tt(`${type.key}.one`)
        }
        status={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge entity="cms_revision" state={state} />
            <VisibilityBadge entry={entry} />
            {entry.hasDraft && entry.updatedBy?.key === "assistant" ? (
              <Badge tone="brand">{t("suggested")}</Badge>
            ) : null}
            {type.figures ? (
              entry.figures === "sample" ? (
                <Badge tone="warning" icon={<Flask weight="bold" />}>
                  {t("figuresSample")}
                </Badge>
              ) : (
                <Badge tone="success">{t("figuresApproved")}</Badge>
              )
            ) : null}
          </span>
        }
        actions={
          <div className="ms-auto flex flex-wrap justify-end gap-2">
            {viewing && mayEdit ? <Button onClick={() => router.replace(editHref)}>{ti("edit")}</Button> : null}
            <SectionPreviewLink href={previewHref() ?? "/preview"} variant={seoOnly ? "primary" : "ghost"} disabled={!previewHref() || entry.id === "gl_caseFormats" && !formatExample || entry.id === "gl_commerce" && !commercePreviewHref(section, lang)} />
            {!viewing && !seoOnly ? <LifecycleActions
              entry={entry}
              area={type.area}
              address={type.seo && !type.fixedAddress ? previewPath : null}
              listing={
                type.seo && !type.fixedAddress
                  ? "/" + previewPath.split("/")[1]
                  : null
              }
            /> : null}
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    startIcon={<ClockCounterClockwise />}
                  />
                }
              >
                {t("versions")}
              </SheetTrigger>
              <SheetContent>
                <DialogHeader>
                  <DialogTitle>{t("versionsTitle")}</DialogTitle>
                  <DialogDescription>
                    <span dir="auto">{name}</span>
                  </DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <ol className="flex flex-col gap-3">
                    {entry.versions.map((v, i) => (
                      <VersionRow
                        readOnly={viewing || seoOnly}
                        key={v.version + "-" + i}
                        entry={entry}
                        index={i}
                        onError={onError}
                      />
                    ))}
                  </ol>
                </DialogBody>
              </SheetContent>
            </Sheet>
            {entry.hasDraft && entry.live && editable && !dirty ? (
              <ConfirmDialog
                trigger={<Button variant="secondary">{t("discard")}</Button>}
                title={t("discardTitle")}
                impact={t("discardImpact")}
                confirmLabel={t("discardConfirm")}
                onConfirm={async () => { await act("discard"); returnToView(); }}
              />
            ) : null}
            {state === "in_review" && canApprove && !dirty ? (
              <ConfirmDialog
                trigger={
                  <Button variant="secondary">{t("requestChanges")}</Button>
                }
                tone="primary"
                title={t("changesTitle")}
                impact={t("changesImpact")}
                reason={{ label: t("changesReason"), required: true }}
                confirmLabel={t("changesConfirm")}
                onConfirm={({ reason }) => act("request_changes", reason)}
              />
            ) : null}
            {!viewing && editable && !dirty && !entry.hasDraft ? <Button variant="secondary" onClick={discardLocal}>{t("cancel")}</Button> : null}
            {primary}
          </div>
        }
      />

      {!viewing && !managedIn && !["pricing","legalDocument","service","softwareModule","serviceFamily"].includes(entry.type)?<><div className="flex flex-wrap items-center gap-3"><Switch checked={autosaving} onCheckedChange={setAutosaving} aria-label={v3("autosave")}/><span className="text-body-sm text-fg-muted">{v3(savingAction.busy?"autosaving":"autosave")}</span></div><StudioFeedback action={savingAction} onRetry={value=>acceptSaved(value,JSON.stringify((savingAction.pending?.body as {patches?:unknown})?.patches)===JSON.stringify(makePatches())?editStamp:undefined)}/></>:null}
      {viewing ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-line bg-info-subtle p-4"><p className="text-body-sm text-info">{ti(mayEdit ? "viewModeHelp" : "viewOnlyHelp")}</p></div> : null}

      {!seoOnly && body.length > 1 ? <SectionOrder items={orderedBody.map(key => ({ key, label: sections.find(section => section.value === key) ? sectionName(sections.find(section => section.value === key)!) : key === "reviews" ? ti("reviews") : key === "questions" ? ti("faqQuestions") : key }))} disabled={!editable || lang !== "en"} onChange={sectionOrder => setPresentationEdit({ ...presentation, sectionOrder })} /> : null}

      {type.key === "pricing" || type.key === "softwareModule" ? <PricingAuthority historical={type.key === "pricing"} /> : null}

      {needsAnotherApprover && state === "in_review" ? (
        <p className="rounded-field bg-info-subtle px-3 py-2 text-body-sm text-info">
          {t("fourEyes")}
        </p>
      ) : null}
      {state === "scheduled" && entry.publishAt ? (
        <p className="rounded-field bg-info-subtle px-3 py-2 text-body-sm text-info">
          {t("scheduledFor", {
            when: f.date(entry.publishAt, {
              dateStyle: "full",
              timeStyle: "short",
            }),
          })}
        </p>
      ) : null}

      {type.figures && entry.figures === "sample" ? (
        <div
          role="note"
          className="flex flex-wrap items-center gap-3 rounded-card border border-warning bg-warning-subtle px-4 py-3"
        >
          <Flask
            aria-hidden="true"
            weight="fill"
            className="size-5 shrink-0 text-warning"
          />
          <p className="min-w-0 flex-1 text-body-sm text-fg">
            {t("figuresBanner")}
            {dirty ? <span className="mt-1 block text-caption">{t("caseStudyDisplay.saveBeforeConfirm")}</span> : null}
          </p>
          {can("claims:approve") ? (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="secondary" disabled={dirty || saving.isLoading || savingAction.busy || Boolean(savingAction.pending)}>
                  {t("approveFigures")}
                </Button>
              }
              tone="primary"
              title={t("approveFiguresTitle")}
              impact={t("approveFiguresImpact")}
              acknowledgement={t("approveFiguresAck")}
              confirmLabel={t("approveFigures")}
              onConfirm={() =>
                approveFigures({ ...ref, version: entry.version }).unwrap()
              }
            />
          ) : null}
        </div>
      ) : null}

      {type.key === "caseStudy" ? (
        <CaseStudyDisplay
          mode={neutral.narrativePublished === true ? "approved" : neutral.sampleNarrativePublished === true ? "sample" : "card"}
          approved={entry.figures === "approved"}
          disabled={!editable || !can("content:approve")}
          error={errors.narrativePublished ? t(errors.narrativePublished === "narrative_needs_approved_figures" ? "errorNarrativeFigures" : "errorRequired") : errors.sampleNarrativePublished ? t(errors.sampleNarrativePublished === "sample_narrative_needs_sample_figures" ? "errorSampleNarrative" : "errorRequired") : undefined}
          onChange={mode => setNeutralEdit(previous => ({ ...previous, narrativePublished: mode === "approved", sampleNarrativePublished: mode === "sample" }))}
        />
      ) : null}

      <Tabs value={lang} onValueChange={(v) => setLang(v as Locale)}>
        <TabsList
          variant="contained"
          items={contentLocales.map((l) => ({
            value: l,
            label: (
              <span className="inline-flex items-center gap-1.5">
                <span lang={l} dir={l === "ar" ? "rtl" : "ltr"}>
                  {languageName(l)}
                </span>
                {edits[l] || seoEdits[l] || altEdits[l] ? (
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-pill bg-warning-solid"
                  />
                ) : null}
              </span>
            ),
          }))}
        />
      </Tabs>

      {lang !== "en" && tree && !viewing && !seoOnly ? (
        <TranslationBar
          entry={entry}
          lang={lang}
          dirty={dirty}
          onError={onError}
        />
      ) : null}

      {!tree && !seoOnly ? (
        // Opened from an issue in a language not started yet: the field appears once it is started.
        <IssueSpot active={spotIssue === "imageNoAlt" && lang === asked} label={spotIssue === "imageNoAlt" ? ts("fixAfterStart", { issue: tc("checks.imageNoAlt") }) : ""}>
        <EmptyState
          size="compact"
          icon={<Translate />}
          title={t("fallbackNote")}
          action={
            editable ? (
              <Button
                startIcon={<Translate />}
                onClick={() => setTree(JSON.parse(JSON.stringify(english)))}
              >
                {t("startTranslation")}
              </Button>
            ) : undefined
          }
        />
        </IssueSpot>
      ) : (
        <Tabs
          value={section}
          onValueChange={(v) => setSection(String(v))}
          orientation={side ? "vertical" : "horizontal"}
          className={
            side
              ? "grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start"
              : undefined
          }
        >
          {side && entry.id === "gl_commerce" ? <CommerceNavigation sections={sections} active={section} onSelect={setSection} /> : side ? (
            <>
              {/* On a phone the column would push the form out of sight: a picker instead. */}
              <Select
                aria-label={t("section")}
                value={section}
                onValueChange={(v) => v && setSection(v)}
                options={tabItems}
                className="w-full lg:hidden"
              />
              <TabsList
                variant="side"
                items={tabItems}
                className="hidden lg:sticky lg:top-4 lg:flex"
              />
            </>
          ) : (
            <TabsList items={tabItems} />
          )}
          {/* The form stays in the UI's language and direction; each input carries the content's. */}
          <div className={side ? "min-w-0" : "pt-6"}>
            {lang !== "en" ? (
              <p className="mb-4 text-body-sm text-fg-muted">
                {t("numbersNote")}
              </p>
            ) : null}
            {sections.map((s, i) => (
              <TabsPanel key={s.value} value={s.value}>
                {i === 0 ? shared : null}
                <PagePlacementHint pageId={entry.id} section={s.value} />
                {pageConfig?.supplemental?.[s.value] ? (sourceQuery.isLoading ? <LoadingState rows={3} /> : sourceQuery.error ? <ErrorState onRetry={sourceQuery.refetch} /> : <div className="mb-5"><PageFields pageId={entry.id} section={s.value} fields={pageConfig.supplemental[s.value].fields} records={[entry, ...(sourceQuery.data ?? [])]} lang={lang} edits={{...sourceEdits,[entry.id]:edits}} onChange={(id,words)=>id===entry.id ? setTree(words) : setSourceEdits(previous=>({...previous,[id]:{...previous[id],[lang]:words}}))} ctx={ctx} cardTitle={placementText(pageConfig.supplemental[s.value].titleKey ?? "common.headingCard")} previewHref={previewHref(s.value)} /></div>) : null}
                {entry.id === "gl_commerce" ? <CommerceSection section={s} previewHref={(key, cardId, context) => commercePreviewHref(key, lang, cardId, context)} renderFields={node => <ValueEditor node={node} value={get(tree, s.path)} fallback={lang === "en" ? undefined : get(english, s.path)} onChange={value => setTree(put(tree ?? {}, s.path, value))} path={s.path} ctx={ctx} />} /> : type.key === "review" ? <ReviewEditor value={tree ?? {}} fallback={english} onChange={setTree} ctx={ctx}
                  photo={imageSrc ?? entry.content.image?.src ?? ""} focal={imageFocal ?? entry.content.image?.focal} alt={alt[lang] ?? ""}
                  onPhoto={(src, media) => { setImageSrc(src); setImageFocal(media?.focal); if (media?.alt) setAltEdits(media.alt); }}
                  onAlt={value => setAltEdits(previous => ({ ...previous, [lang]: value }))}
                  sample={neutral.sample === true} position={neutral.position ?? 0} relatedEntries={reviewRelatedEntries}
                  category={neutral.category ?? (reviewRelatedEntries.length ? typeOfId(reviewRelatedEntries[0])?.key === "softwareModule" ? "software" : "services" : "")}
                  onSettings={patch => setNeutralEdit(previous => ({ ...previous, ...patch }))}
                  relatedOptions={[...(families.data?.items ?? []), ...(relatedServices.data?.items ?? []), ...(relatedSoftware.data?.items ?? [])].map(item => ({ value: item.id, label: entryName(item), hint: nav(item.type === "softwareModule" ? "software" : "services") }))}
                  additionalMedia={<SectionAttachments disabled={!editable || lang !== "en"} disabledReason={viewing && mayEdit ? ti("mediaViewHelp") : !editable ? ti("viewOnlyHelp") : lang !== "en" ? ti("mediaLanguageHelp") : undefined} items={presentation.sectionMedia.details ?? []} onChange={items => setPresentationEdit({ ...presentation, sectionMedia: { ...presentation.sectionMedia, details: items } })} />}
                /> : entry.id === "gl_caseFormats" && s.value === "formats" ? <CaseStudyFormatLabels node={s.node} value={get(tree, s.path)} fallback={lang === "en" ? undefined : get(english, s.path)} onChange={value => setTree(put(tree ?? {}, s.path, value))} ctx={ctx} examples={formatExamples} loading={caseStudies.isLoading} failed={Boolean(caseStudies.error)} onRetry={caseStudies.refetch} /> : s.value === "intro" && ["Custom Cursor", "View project"].includes(s.label ?? "") ? <PageSectionCard title={sectionName(s)} previewHref={previewHref(s.value)}>
                  <Field label={placementText("common.cursorText")} description={placementText("common.cursorTextHint")}><Input disabled={!editable} value={presentation.cursor.text[lang] ?? String(get(tree, "intro") && (get(tree, "intro") as Tree).div || "").replace(/<[^>]+>/g, "").trim()} onChange={event => setPresentationEdit({ ...presentation, cursor: { ...presentation.cursor, text: { ...presentation.cursor.text, [lang]: event.target.value } } })} /></Field>
                  <Field label={placementText("common.cursorLink")} description={placementText("common.cursorLinkHint")}><Input dir="ltr" disabled={!editable || lang !== "en"} value={presentation.cursor.link} onChange={event => setPresentationEdit({ ...presentation, cursor: { ...presentation.cursor, link: event.target.value } })} /></Field>
                </PageSectionCard> : s.value === "rotation-words" && pageConfig?.rotationSource ? <PageSectionCard title={sectionName(s)} previewHref={previewHref(s.value)}><RotationWords type={pageConfig.rotationSource} /></PageSectionCard> : pageConfig?.fields?.[s.value] ? (sourceQuery.isLoading ? <LoadingState rows={4} /> : sourceQuery.error ? <ErrorState onRetry={sourceQuery.refetch} /> : <PageFields pageId={entry.id} section={s.value} fields={pageConfig.fields[s.value].fields} records={[entry, ...(sourceQuery.data ?? [])]} lang={lang} edits={{...sourceEdits,[entry.id]:edits}} onChange={(id,words)=>id===entry.id ? setTree(words) : setSourceEdits(previous=>({...previous,[id]:{...previous[id],[lang]:words}}))} ctx={ctx} cardTitle={sectionName(s)} previewHref={previewHref(s.value)} />) : (entry.id === "pg_home" && ["two-sides", "work", "services", "software", "approach", "closing", "faqs"].includes(s.value) || entry.id === "pg_about" && s.value === "purpose") ? <PageCards pageId={entry.id} section={s.value} title={sectionName(s)} previewHref={previewHref} path={s.path} node={s.node} value={get(tree,s.path)} fallback={get(english,s.path)} onChange={value=>setTree(put(tree ?? {},s.path,value))} ctx={ctx} /> : references[s.value] ? <PageSectionCard title={sectionName(s)} previewHref={previewHref(s.value)}><Link href={references[s.value]} className="text-fg-brand underline">{ti("manage")} {sectionName(s)}</Link></PageSectionCard> : s.value === "shared-copy" ? <SharedCopyPanel key={`${entry.id}-${lang}`} pageId={entry.id} lang={lang} readOnly={!editable} onActiveSectionChange={setSharedPreviewSection} previewHref={previewHref} /> : type.key === "page" ? <PageCards pageId={entry.id} section={s.value} title={sectionName(s)} previewHref={previewHref} path={s.path} node={s.node} value={get(tree,s.path)} fallback={lang === "en" ? undefined : get(english,s.path)} onChange={value=>setTree(put(tree ?? {},s.path,value))} ctx={ctx} /> : type.key === "article" && s.value === "body" ? <ArticleBodyEditor ctx={ctx} value={get(tree, "sections")} onChange={value => setTree(put(tree ?? {}, "sections", value))} /> : pageSectionPlacement(entry.id, s.value) ? <PageCards pageId={entry.id} section={s.value} title={sectionName(s)} previewHref={previewHref} path={s.path} node={s.node} value={get(tree,s.path)} fallback={lang === "en" ? undefined : get(english,s.path)} onChange={value=>setTree(put(tree ?? {},s.path,value))} ctx={ctx} /> : <ValueEditor
                  surface
                  node={s.node}
                  value={get(tree, s.path)}
                  fallback={lang === "en" ? undefined : get(english, s.path)}
                  onChange={(v) => setTree(put(tree ?? {}, s.path, v))}
                  path={s.path}
                  ctx={ctx}
                />}
                {s.value === "rotation-words" && pageConfig?.staticRotation ? <ul className="mt-4 flex flex-wrap gap-2">{pageConfig.staticRotation.map(word=><li key={word} className="rounded-field bg-sunken px-3 py-2 text-body-sm text-fg-muted">{word}</li>)}</ul> : null}
                {pageConfig?.collections?.[s.value] ? <CollectionOrder type={pageConfig.collections[s.value]} disabled={!editable || lang !== "en"} /> : null}
                {type.key !== "review" && s.value !== "shared-copy" && !(s.value === "intro" && ["Custom Cursor", "View project"].includes(s.label ?? "")) && type.key !== "strings" && type.key !== "pricing" ? <SectionAttachments title={entry.id === "gl_commerce" ? purchasing("mediaTitle") : entry.id === "gl_caseFormats" ? caseLabels("mediaTitle") : type.key === "page" ? `${sectionName(s)} · ${ti("media")}` : undefined} description={entry.id === "gl_commerce" ? purchasingMediaDescription(s.value) : entry.id === "gl_caseFormats" ? caseLabels("mediaHelp") : type.key === "page" || type.key === "global" ? placementText(pageMediaPlacement(entry.id, s.value)) : undefined} pageCard={type.key === "page" || entry.id === "gl_caseFormats" || entry.id === "gl_commerce"} alwaysOpen={type.key === "caseStudy"} disabled={!editable || lang !== "en"} disabledReason={viewing && mayEdit ? ti("mediaViewHelp") : !editable ? ti("viewOnlyHelp") : lang !== "en" ? ti("mediaLanguageHelp") : undefined} items={presentation.sectionMedia[s.value] ?? []} onChange={items => setPresentationEdit({ ...presentation, sectionMedia: { ...presentation.sectionMedia, [s.value]: items } })} /> : null}
              </TabsPanel>
            ))}
            {type.seo ? (
              <TabsPanel value="seo"><PagePlacementHint pageId={entry.id} section="seo" />
                <SeoPanel
                  key={lang}
                  spot={lang === asked ? spotIssue : undefined}
                  addressCard={
                    <div className="grid min-w-0 gap-4 rounded-card border border-line bg-raised p-4 sm:p-5">
                      {/* The SEO editor looks the same for every type; in the content editor a page's SEO tab names itself. */}
                      {type.key === "page" && !seoOnly ? <div className="flex items-start justify-between gap-4">
                        <h3 className="min-w-0 text-title-sm font-semibold text-fg">{t("tabs.seo")}</h3>
                        <SectionPreviewLink href={previewHref("seo") ?? "/preview"} label={`${tp("button")} · ${t("tabs.seo")}`} iconOnly />
                      </div> : null}
                      <IssueSpot active={spotIssue === "addressDuplicate" && lang === asked} label={spotLabel}>
                        <Field
                          label={t("slug")}
                          description={
                            type.fixedAddress
                              ? t("addressFixed")
                              : lang !== "en"
                                ? t("slugOtherLanguage", { path: `/${lang}${previewPath === "/" ? "" : previewPath}` })
                              : liveSlug && liveSlug !== slug
                                ? t("slugMoves", {
                                    path: type.path(slug, familySlug),
                                    old: type.path(liveSlug, familySlug),
                                  })
                                : t("slugHelp", {
                                    path: type.path(slug, familySlug),
                                  })
                          }
                          error={
                            errors.slug
                              ? t(
                                  errors.slug === "slug_taken"
                                    ? "errorSlugTaken"
                                    : "errorSlug",
                                )
                              : undefined
                          }
                        >
                          <Input
                            dir="ltr"
                            disabled={!editable || type.fixedAddress || lang !== "en"}
                            value={type.fixedAddress ? `orgtik.ch${slug}` : slug}
                            onChange={(e) => setSlugEdit(e.target.value)}
                          />
                        </Field>
                      </IssueSpot>
                    </div>
                  }
                  entryId={entry.id}
                  fullWidthFields={ctx.fullWidthFields && !seoOnly}
                  lang={lang}
                  seo={seo as SeoBlock}
                  english={(entry.content.seo.en ?? {}) as SeoBlock}
                  address={`orgtik.ch${previewPath === "/" ? "" : previewPath}`}
                  canonical={canonicalUrl(indexing.data?.settings.canonicalHost ?? WEBSITE_URL, lang, previewPath)}
                  slug={
                    type.fixedAddress
                      ? (previewPath.split("/").pop() ?? "")
                      : slug
                  }
                  siteHidden={indexing.data?.settings.visibility === "noindex"}
                  entryImage={entry.content.image?.src}
                  images={(images.data?.items ?? []).map((m) => ({
                    value: m.file,
                    label: m.file,
                  }))}
                  structuredType={
                    STRUCTURED[type.key] ??
                    (previewPath === "/" ? "Organization · WebSite" : null)
                  }
                  errors={errors}
                  can={{
                    edit: seoEditable,
                    jsonLd: can("seo:custom-jsonld"),
                  }}
                  onChange={(patch) =>
                    setSeoEdits((s) => ({
                      ...s,
                      [lang]: { ...(s[lang] ?? {}), ...patch },
                    }))
                  }
                />
              </TabsPanel>
            ) : null}
          </div>
        </Tabs>
      )}

      {dirty ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-raised/95 px-4 py-3 shadow-overlay backdrop-blur lg:ps-[340px]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <span className="text-body-sm font-semibold text-fg">
              {t("unsaved")}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={saving.isLoading}
                onClick={discardLocal}
              >
                {t("cancel")}
              </Button>
              <Button loading={saving.isLoading} onClick={saveAll}>
                {t("save")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!viewing && !managedIn && !["pricing","legalDocument","service","softwareModule","serviceFamily"].includes(entry.type)?<ElementComments entryId={entry.id} anchor={section==="seo"?"seo":sections.find(s=>s.value===section)?.path||"entry"} locale={lang} editable={editable||seoEditable}/>:null}
      <ConfirmDialog
        open={Boolean(stale)}
        onOpenChange={(o) => !o && setStale(null)}
        tone="primary"
        title={t("staleTitle")}
        impact={t("staleBody", { who: stale?.by ?? "" })}
        confirmLabel={t("reload")}
        onConfirm={() => window.location.reload()}
      />
    </div>
  );
}

/** Loads one entry and shows its editor, or the state that stands in for it. */
// The structured data the website writes for each kind of page (src/content/heads.js), plus a breadcrumb.
const STRUCTURED: Record<string, string> = {
  serviceFamily: "Service · BreadcrumbList",
  service: "Service · BreadcrumbList",
  softwareModule: "SoftwareApplication · BreadcrumbList",
  article: "BlogPosting · BreadcrumbList",
  caseStudy: "CreativeWork · BreadcrumbList",
  legalDocument: "BreadcrumbList",
};

export function EntryEditor({ id, seoOnly = false }: { id: string; seoOnly?: boolean }) {
  const t = useTranslations("Editor");
  const tt = useTranslations("Types");
  const ta = useTranslations("Areas");
  const type = typeOfId(id);
  const { data, isLoading, error, refetch } = useEntryQuery(
    { type: type?.key ?? "caseStudy", id },
    { skip: !type },
  );
  const s = statusOf(error);
  if (!type || s === 404)
    return (
      <EmptyState
        title={type ? tt(`${type.key}.notFound`) : t("notFound")}
        action={
          <Button onClick={() => history.back()}>
            {t("back", { area: ta(`${type?.area ?? "work"}.title`) })}
          </Button>
        }
      />
    );
  if (isLoading) return <LoadingState rows={6} />;
  if (s === 403) return <NoPermissionState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;
  // Keyed by entry only: a save refreshes the entry in place, so the language, section and dialogs stay.
  return <Editor key={data.id} entry={data} type={type} seoOnly={seoOnly} />;
}
