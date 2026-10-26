"use client";
import { Children, useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CaretDown, CaretUp } from "@phosphor-icons/react";

/**
 * The list filter bar. On phones only the first `keep` controls show (search and two filters);
 * the rest fold behind "Show more" so the list isn't pushed down. Wider screens show every filter.
 */
export function FilterFold({ keep = 3, open: startOpen = false, children }: { keep?: number; open?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(startOpen);
  const id = useId();
  const items = Children.toArray(children);
  const rest = items.slice(keep);
  return (
    <div className="wm-table-filters">
      {items.slice(0, keep)}
      {rest.length ? <div id={id} className="wm-filter-more" data-folded={open ? undefined : ""}>{rest}</div> : null}
      {rest.length ? <FoldToggle open={open} onToggle={() => setOpen(!open)} controls={id} /> : null}
    </div>
  );
}

/** "Show more" / "Show less" for a folded filter group. Phones only. */
export function FoldToggle({ open, onToggle, controls, className }: { open: boolean; onToggle: () => void; controls?: string; className?: string }) {
  const t = useTranslations("Filters");
  const Caret = open ? CaretUp : CaretDown;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className={`wm-filter-hug inline-flex h-control-sm items-center gap-1 rounded-field px-1 text-body-sm font-semibold text-fg-brand hover:underline focus-visible:outline-2 focus-visible:outline-focus md:hidden ${className ?? "self-center"}`}
    >
      {t(open ? "showLess" : "showMore")}
      <Caret aria-hidden className="size-3.5" />
    </button>
  );
}
