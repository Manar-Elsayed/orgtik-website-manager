"use client";

// How a page shows in a search result and as a shared link, drawn the way search engines and
// social networks draw them. Used by the SEO editor (live, as you type) and SEO health's preview.
// Both are approximations: real results depend on the engine, the query and the network.
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@orgtik/ui";
import { mediaUrl } from "@/lib/env";
import type { Locale } from "@/store/api";

// Search results cut titles at about 600px (20px Arial) and descriptions at about two lines.
export const TITLE_PX = 600;
export const DESCRIPTION_PX = 920;
let canvas: HTMLCanvasElement | null = null;
export function widthOf(text: string, font: string) {
  if (typeof document === "undefined") return text.length * 8;
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  return Math.round(ctx.measureText(text).width);
}
export function cut(text: string, font: string, max: number) {
  if (widthOf(text, font) <= max) return text;
  let s = text;
  while (s && widthOf(`${s}…`, font) > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}
/** "https://orgtik-site.vercel.app/work/x" → "orgtik-site.vercel.app/work/x", as results print it. */
export const displayAddress = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

// A preview that opens its fields: a button when it can, a picture of the result when it can't.
function Frame({ label, onEdit, className, children }: { label: string; onEdit?: () => void; className: string; children: ReactNode }) {
  return onEdit ? (
    <button type="button" aria-label={label} onClick={onEdit} className={cn(className, "w-full cursor-pointer text-start transition-shadow hover:ring-1 hover:ring-fg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus")}>
      {children}
    </button>
  ) : (
    <div role="img" aria-label={label} className={className}>
      {children}
    </div>
  );
}

/** A search result: address, title and description, cut where they'd be cut. */
export function SearchResultPreview({ url, title, description, lang, onEdit }: { url: string; title: string; description: string; lang: Locale; onEdit?: () => void }) {
  const t = useTranslations("Seo.block");
  return (
    // Its colours are the search engine's own, on purpose and in both themes: it shows what people see there.
    <Frame label={onEdit ? t("editSearchResult") : t("searchPreview")} onEdit={onEdit} className="block rounded-field border border-line bg-white p-4">
      <span dir={lang === "ar" ? "rtl" : "ltr"} lang={lang} className="block">
        <span dir="ltr" className="block truncate text-start text-[12px] text-[#4D5156]">
          {displayAddress(url)}
        </span>
        <span className="mt-1 block truncate text-[20px] leading-7 text-[#1A0DAB]" style={{ fontFamily: "Arial, sans-serif" }}>
          {title ? cut(title, "20px Arial", TITLE_PX) : <span className="text-[#70757A]">{t("noTitle")}</span>}
        </span>
        <span className="mt-1 line-clamp-2 block text-[14px] leading-[22px] text-[#4D5156]" style={{ fontFamily: "Arial, sans-serif" }}>
          {description ? cut(description, "14px Arial", DESCRIPTION_PX) : <span className="text-[#70757A]">{t("noDescription")}</span>}
        </span>
      </span>
    </Frame>
  );
}

/** A shared link as social networks draw it: image, site, title, description. */
export function SocialPreview({ url, title, description, image, lang, onEdit }: { url: string; title: string; description: string; image: string | null | undefined; lang: Locale; onEdit?: () => void }) {
  const t = useTranslations("Seo.block");
  const host = displayAddress(url).split("/")[0];
  return (
    <Frame label={onEdit ? t("editSocialPreview") : t("socialPreview")} onEdit={onEdit} className="block overflow-hidden rounded-field border border-line bg-raised">
      {image ? <img src={mediaUrl(image)} alt="" className="aspect-[1.91/1] w-full object-cover" /> : <span className="grid aspect-[1.91/1] place-items-center bg-sunken text-body-sm text-fg-subtle">{t("noImage")}</span>}
      <span className="flex flex-col gap-0.5 p-3" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <span dir="ltr" className="text-start text-caption uppercase text-fg-subtle">
          {host}
        </span>
        <span className="line-clamp-2 text-body font-medium text-fg">{title || t("noTitle")}</span>
        <span className="line-clamp-2 text-body-sm text-fg-muted">{description}</span>
      </span>
    </Frame>
  );
}
