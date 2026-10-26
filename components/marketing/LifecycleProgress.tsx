"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function LifecycleProgress({
  label,
  stages,
  current,
  visited,
  outcome,
}: {
  label: string;
  stages: { key: string; label: string }[];
  current: string;
  visited: string[];
  outcome: ReactNode;
}) {
  // Phones show the steps in one clipped row instead of a tall column; the current step is
  // brought into view, and the others are a swipe away. Wider screens show every step.
  const row = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const ol = row.current;
    const step = ol?.querySelector<HTMLElement>("[aria-current=step]");
    if (!ol || !step || ol.scrollWidth <= ol.clientWidth) return;
    // Centre the current step; measured on screen, so it works in right-to-left too.
    const s = step.getBoundingClientRect(), o = ol.getBoundingClientRect();
    ol.scrollBy({ left: s.left + s.width / 2 - (o.left + o.width / 2), behavior: "instant" });
  }, [current]);
  return (
    <section
      aria-label={label}
      className="w-full min-w-0 overflow-hidden rounded-card border border-line bg-raised p-4"
    >
      <ol ref={row} className="flex w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        {stages.map((stage, index) => (
          <li
            key={stage.key}
            aria-current={current === stage.key ? "step" : undefined}
            className="relative flex w-28 min-w-0 shrink-0 snap-start flex-col items-start gap-2 py-3 pe-3 last:w-auto last:pe-0 sm:w-auto sm:flex-1 sm:shrink sm:last:flex-none"
          >
            <span aria-hidden className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-pill border-2 ${current === stage.key ? "border-focus bg-brand-subtle text-fg-brand" : visited.includes(stage.key) ? "border-success bg-success-subtle text-success" : "border-line bg-sunken text-fg-muted"}`}>{visited.includes(stage.key) && current !== stage.key ? "✓" : index + 1}</span>
            {index < stages.length - 1 ? <span aria-hidden className="absolute start-8 top-7 h-px w-[calc(100%-2rem)] bg-line" /> : null}
            <span className={`max-w-full whitespace-nowrap sm:whitespace-normal sm:break-words ${current === stage.key ? "font-semibold text-fg-brand" : "text-fg-muted"}`}>{stage.label}</span>
          </li>
        ))}
      </ol>
      {!stages.some((stage) => stage.key === current) ? (
        <div className="mt-3">{outcome}</div>
      ) : null}
    </section>
  );
}
