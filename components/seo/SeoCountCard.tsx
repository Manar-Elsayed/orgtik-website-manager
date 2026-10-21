"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { cn, useFormatter } from "@orgtik/ui";

/**
 * A summary count that is also the way in: choosing it filters the list below to those pages,
 * where each row opens the place to fix it. A zero count has nothing to open, so it is disabled.
 */
export function SeoCountCard({ label, count, active, hint, onSelect }: { label: ReactNode; count: number; active: boolean; hint: string; onSelect: () => void }) {
  const f = useFormatter();
  const empty = count === 0 && !active;
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={empty}
      title={empty ? undefined : hint}
      onClick={onSelect}
      className={cn(
        "group flex flex-col rounded-card border bg-raised p-4 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        active ? "border-fg-brand ring-1 ring-fg-brand" : "border-line",
        empty ? "cursor-default" : "hover:border-line-strong",
      )}
    >
      <span className="flex items-center justify-between gap-2 text-body-sm text-fg-muted">
        {label}
        {empty ? null : <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />}
      </span>
      <span className="font-display text-title text-fg tabular-nums">{f.number(count)}</span>
      <span className="sr-only">{hint}</span>
    </button>
  );
}

/** Bring the filtered list into view after a card is chosen. */
export function revealList(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}
