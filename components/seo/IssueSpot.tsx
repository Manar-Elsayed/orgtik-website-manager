"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { WarningCircle } from "@phosphor-icons/react";

// The field an SEO issue points at, when the editor was opened from that issue (SEO missing): the
// issue's name above it, scrolled into view. Otherwise the field as it is.
export function IssueSpot({ active, label, children }: { active: boolean; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    // The editor keeps laying out as its parts load (content above the field can arrive late), so for
    // a few seconds the field is brought back to the middle whenever it drifts out of view; scrolling
    // by hand stops it.
    const started = Date.now();
    const keepInView = () => {
      const box = ref.current?.getBoundingClientRect();
      if (box && (box.top < 0 || box.bottom > window.innerHeight)) ref.current?.scrollIntoView({ block: "center" });
    };
    const first = setTimeout(keepInView, 300);
    const every = setInterval(() => (Date.now() - started > 8000 ? stop() : keepInView()), 400);
    const stop = () => {
      clearTimeout(first);
      clearInterval(every);
    };
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    events.forEach((e) => window.addEventListener(e, stop, { once: true, passive: true }));
    return () => {
      stop();
      events.forEach((e) => window.removeEventListener(e, stop));
    };
  }, [active]);
  if (!active) return <>{children}</>;
  return (
    <div ref={ref} data-issue-spot className="flex min-w-0 flex-col gap-2">
      <p role="alert" className="flex items-center gap-1.5 text-body-sm font-semibold text-danger">
        <WarningCircle aria-hidden="true" weight="fill" className="size-4 shrink-0" />
        {label}
      </p>
      {children}
    </div>
  );
}
