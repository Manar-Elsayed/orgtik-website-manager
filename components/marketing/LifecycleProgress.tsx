"use client";
import type { ReactNode } from "react";
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
  return (
    <section
      aria-label={label}
      className="w-full min-w-0 rounded-card border border-line bg-raised p-4"
    >
      <ol className="flex w-full flex-col sm:flex-row">
        {stages.map((stage, index) => (
          <li
            key={stage.key}
            aria-current={current === stage.key ? "step" : undefined}
            className="relative flex min-w-0 items-center gap-3 py-3 sm:flex-1 sm:flex-col sm:items-start sm:gap-2 sm:pe-3 sm:last:flex-none sm:last:pe-0"
          >
            <span aria-hidden className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-pill border-2 ${current === stage.key ? "border-focus bg-brand-subtle text-fg-brand" : visited.includes(stage.key) ? "border-success bg-success-subtle text-success" : "border-line bg-sunken text-fg-muted"}`}>{visited.includes(stage.key) && current !== stage.key ? "✓" : index + 1}</span>
            {index < stages.length - 1 ? <span aria-hidden className="absolute start-4 top-10 h-6 w-px bg-line sm:start-8 sm:top-7 sm:h-px sm:w-[calc(100%-2rem)]" /> : null}
            <span className={`max-w-full break-words ${current === stage.key ? "font-semibold text-fg-brand" : "text-fg-muted"}`}>{stage.label}</span>
          </li>
        ))}
      </ol>
      {!stages.some((stage) => stage.key === current) ? (
        <div className="mt-3">{outcome}</div>
      ) : null}
    </section>
  );
}
