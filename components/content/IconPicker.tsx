"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@orgtik/ui";
import { MediaPicker } from "@/components/media/MediaPicker";
import { mediaUrl } from "@/lib/env";
import {
  ArrowsClockwise,
  BehanceLogo,
  Browser,
  CalendarBlank,
  CalendarCheck,
  CaretDown,
  ChartLineUp,
  CheckSquare,
  CirclesThreePlus,
  Code,
  CursorClick,
  DiscordLogo,
  DribbbleLogo,
  EnvelopeSimple,
  FacebookLogo,
  FileText,
  Flag,
  FolderSimple,
  GithubLogo,
  HardDrives,
  IdentificationBadge,
  InstagramLogo,
  Lifebuoy,
  LinkedinLogo,
  ListChecks,
  MagnifyingGlass,
  MediumLogo,
  Megaphone,
  Note,
  Palette,
  PinterestLogo,
  RocketLaunch,
  Shapes,
  SnapchatLogo,
  Target,
  TelegramLogo,
  ThreadsLogo,
  TiktokLogo,
  TrendUp,
  User,
  UserCircleCheck,
  UsersThree,
  WhatsappLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";
const icons = {
  "ph-users-three": UsersThree,
  "ph-chart-line-up": ChartLineUp,
  "ph-folder-simple": FolderSimple,
  "ph-check-square": CheckSquare,
  "ph-megaphone": Megaphone,
  "ph-browser": Browser,
  "ph-palette": Palette,
  "ph-code": Code,
  "ph-lifebuoy": Lifebuoy,
  "ph-hard-drives": HardDrives,
  "ph-flag": Flag,
  "ph-arrows-clockwise": ArrowsClockwise,
  "ph-trend-up": TrendUp,
  "ph-user": User,
  "ph-calendar-check": CalendarCheck,
  "ph-user-circle-check": UserCircleCheck,
  "ph-list-checks": ListChecks,
  "ph-file-text": FileText,
  "ph-identification-badge": IdentificationBadge,
  "ph-calendar-blank": CalendarBlank,
  "ph-target": Target,
  "ph-note": Note,
  "ph-cursor-click": CursorClick,
  "ph-envelope-simple": EnvelopeSimple,
  "ph-circles-three-plus": CirclesThreePlus,
  "ph-rocket-launch": RocketLaunch,
};
// Footer network symbols. The website reads them as an icon font class ("ph-fill ph-x-logo"),
// so these are stored in that form and can't be replaced by an uploaded image.
const socialIcons = {
  "ph-facebook-logo": FacebookLogo,
  "ph-instagram-logo": InstagramLogo,
  "ph-linkedin-logo": LinkedinLogo,
  "ph-x-logo": XLogo,
  "ph-tiktok-logo": TiktokLogo,
  "ph-pinterest-logo": PinterestLogo,
  "ph-snapchat-logo": SnapchatLogo,
  "ph-youtube-logo": YoutubeLogo,
  "ph-threads-logo": ThreadsLogo,
  "ph-whatsapp-logo": WhatsappLogo,
  "ph-telegram-logo": TelegramLogo,
  "ph-github-logo": GithubLogo,
  "ph-behance-logo": BehanceLogo,
  "ph-dribbble-logo": DribbbleLogo,
  "ph-medium-logo": MediumLogo,
  "ph-discord-logo": DiscordLogo,
};
const WEIGHTS = new Set(["ph", "ph-thin", "ph-light", "ph-regular", "ph-bold", "ph-fill", "ph-duotone"]);
// "ph-fill ph-facebook-logo" → "ph-facebook-logo"; a plain key or an image address stays as it is.
const iconKey = (value: string) => value.trim().split(/\s+/).find(part => part.startsWith("ph-") && !WEIGHTS.has(part)) ?? value;
const iconName = (key: string) => {
  const words = key.replace(/^ph-/, "").replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export function IconPicker({
  value,
  onChange,
  disabled,
  social = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Footer network symbols: brand logos, saved as an icon font class. */
  social?: boolean;
}) {
  const t = useTranslations("Fields");
  const [search, setSearch] = useState("");
  const set: Record<string, typeof Shapes> = social ? socialIcons : icons;
  const key = iconKey(value);
  const Selected = Object.hasOwn(set, key) ? set[key] : undefined;
  const pick = (next: string) => onChange(social ? `ph-fill ${next}` : next);
  const query = search.trim().toLowerCase().replace(/^ph-/, "").replaceAll("-", " ");
  const filtered = Object.entries(set).filter(([k]) =>
    k.replace(/^ph-/, "").replaceAll("-", " ").includes(query),
  );
  const image = !Selected && value && !social && !value.startsWith("ph-");
  return (
    <details className="group w-full min-w-0 rounded-field border border-line-control bg-raised text-fg transition-[border-color] hover:border-fg-subtle open:hover:border-line-control">
      {/* Closed, the field is the same height as the text inputs beside it. */}
      <summary className="-my-px flex h-control-md cursor-pointer list-none items-center gap-2 rounded-field px-3 text-body focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="grid size-6 shrink-0 place-items-center">
          {Selected ? (
            <Selected weight={social ? "fill" : "regular"} className="size-5" />
          ) : image ? (
            <img src={mediaUrl(value)} alt="" className="size-5 object-contain" />
          ) : (
            <Shapes className="size-5 text-fg-subtle" />
          )}
        </span>
        <span className={`min-w-0 flex-1 truncate ${Selected || image ? "text-fg" : "text-fg-subtle"}`}>
          {Selected ? iconName(key) : image ? t("icon") : t("chooseIcon")}
        </span>
        <CaretDown aria-hidden className="size-4 shrink-0 text-fg-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-3 border-t border-line p-3">
        <Input type="search" size="sm" aria-label={t("searchIcons")} placeholder={t("searchIcons")} startIcon={<MagnifyingGlass className="size-4" />} value={search} onChange={event => setSearch(event.target.value)} />
        <div role="group" aria-label={t("icon")} className="flex flex-wrap gap-2">
          {filtered.map(([k, Icon]) => <Button key={k} size="sm" variant={k === key ? "primary" : "secondary"} disabled={disabled} title={iconName(k)} aria-label={iconName(k)} aria-pressed={k === key} onClick={() => pick(k)} className="size-10 p-0"><Icon aria-hidden weight={social ? "fill" : "regular"} className="size-6" /></Button>)}
        </div>
        {!filtered.length ? <p role="status" className="text-body-sm text-fg-muted">{t("noIcons")}</p> : null}
        {social ? null : <MediaPicker iconOnly value={Selected ? "" : value} onChange={onChange} disabled={disabled} />}
      </div>
    </details>
  );
}
