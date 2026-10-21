"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Monitor } from "@phosphor-icons/react";
import { Button, IconButton, toast } from "@orgtik/ui";
import { openSectionPreview } from "@/lib/sectionPreviewTab";

/** Open a section preview without replacing or sharing credentials from the editor tab. */
export function SectionPreviewLink({
  href,
  label,
  iconOnly = false,
  className,
  disabled = false,
  variant = "ghost",
}: {
  href: string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
  disabled?: boolean;
  /** The text button's emphasis; the SEO detail editor makes Preview its main action. */
  variant?: "ghost" | "primary";
}) {
  const locale = useLocale();
  const t = useTranslations("Preview");
  const pending = useRef(false);
  const [opening, setOpening] = useState(false);
  const name = label ?? t("button");

  async function open() {
    if (pending.current) return;
    pending.current = true;
    setOpening(true);
    try {
      await openSectionPreview({
        href,
        locale,
        origin: window.location.origin,
        openWindow: () => window.open("about:blank", "_blank"),
      });
    } catch {
      toast.error(t("tokenFailed"));
    } finally {
      pending.current = false;
      setOpening(false);
    }
  }

  return iconOnly ? (
    <IconButton
      label={name}
      icon={<Monitor />}
      className={className}
      variant="ghost"
      disabled={opening || disabled}
      aria-busy={opening || undefined}
      onClick={() => void open()}
    />
  ) : (
    <Button
      variant={variant}
      startIcon={<Monitor />}
      className={className}
      disabled={disabled}
      loading={opening}
      onClick={() => void open()}
    >
      {name}
    </Button>
  );
}
