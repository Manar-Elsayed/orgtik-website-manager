"use client";

// The live website next to its settings: when it was last built, what it serves, which changes
// made here aren't on it yet, and Publish to site, which asks the host to rebuild it from what is
// published here. Nothing here claims a setting is live because it was saved: it reads the site.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowClockwise, ArrowSquareOut, CheckCircle, CloudArrowUp, Warning, WarningCircle } from "@phosphor-icons/react";
import { Badge, Button, Card, ConfirmDialog, cn, toast, useFormatter } from "@orgtik/ui";
import { useCan } from "@/lib/permissions";
import { useLazySiteLiveQuery, usePublishSiteMutation, useSiteLiveQuery, type ApiError, type SiteLive } from "@/store/api";

const POLL_MS = 10000;
const POLL_FOR_MS = 6 * 60000;

function Line({ tone, children }: { tone: "success" | "warning" | "danger" | "neutral"; children: React.ReactNode }) {
  const Icon = tone === "success" ? CheckCircle : tone === "danger" ? WarningCircle : Warning;
  return (
    <p role="status" className={cn("flex items-start gap-2 text-body-sm", tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-fg-muted")}>
      <Icon aria-hidden="true" weight="fill" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** What is waiting to go live, in words: "3 redirects, robots.txt and published content". */
function pendingParts(t: ReturnType<typeof useTranslations>, live: SiteLive) {
  const p = live.pending;
  if (!p) return [];
  return [
    p.redirects ? t("pendingRedirects", { count: p.redirects }) : null,
    p.robots ? t("pendingRobots") : null,
    p.settings ? t("pendingSettings") : null,
    p.content ? t("pendingContent") : null,
  ].filter(Boolean) as string[];
}

export function SitePublishCard({ focus }: { focus?: "redirects" | "indexing" }) {
  const t = useTranslations("Seo.live");
  const f = useFormatter();
  const can = useCan();
  const { data, isLoading, isFetching, error, refetch } = useSiteLiveQuery();
  const [checkFresh, fresh] = useLazySiteLiveQuery();
  const [publish] = usePublishSiteMutation();
  const [confirm, setConfirm] = useState(false);
  // While the host rebuilds: poll the site until its build is newer than the publish request.
  const [waitingSince, setWaitingSince] = useState<string | null>(null);
  const started = useRef(0);
  const live = (fresh.data ?? data) as SiteLive | undefined;
  useEffect(() => {
    if (!waitingSince) return;
    const timer = setInterval(async () => {
      const next = await checkFresh({ fresh: true }).unwrap().catch(() => null);
      if (next?.build?.builtAt && next.build.builtAt > waitingSince) {
        setWaitingSince(null);
        refetch();
        toast.success(t("published"));
      } else if (Date.now() - started.current > POLL_FOR_MS) {
        setWaitingSince(null);
        toast.error(t("slowBuild"));
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [waitingSince, checkFresh, refetch, t]);

  if (isLoading) return <Card className="text-body-sm text-fg-muted">{t("checking")}</Card>;
  if (error || !live) return <Card><Line tone="danger">{t("error")}</Line><Button size="sm" variant="secondary" className="mt-3" onClick={() => refetch()}>{t("checkAgain")}</Button></Card>;

  const parts = pendingParts(t, live);
  const mayPublish = can("site:visibility");
  const builtAt = live.build?.builtAt;
  const status = !live.configured ? (
    <Line tone="neutral">{t("notConfigured")}</Line>
  ) : !live.reachable ? (
    <Line tone="danger">{t("unreachable", { url: live.url ?? "" })}</Line>
  ) : waitingSince ? (
    <Line tone="neutral">{t("rebuilding")}</Line>
  ) : !live.build ? (
    <Line tone="warning">{t("noBuildRecord")}</Line>
  ) : live.pending?.any ? (
    <Line tone="warning">{t("pending", { parts: parts.join(", ") })}</Line>
  ) : (
    <Line tone="success">{t("inSync")}</Line>
  );
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="flex items-center gap-2 font-display text-title-sm text-fg">
            <CloudArrowUp aria-hidden="true" className="size-5 text-fg-subtle" />
            {t("title")}
          </h2>
          <p className="text-body-sm text-fg-muted">{t(focus === "redirects" ? "helpRedirects" : "helpIndexing")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" startIcon={<ArrowClockwise />} loading={fresh.isFetching || isFetching} onClick={() => checkFresh({ fresh: true })}>
            {t("checkAgain")}
          </Button>
          {live.reachable && live.configured ? (
            <Button size="sm" variant={live.pending?.any ? "primary" : "secondary"} startIcon={<CloudArrowUp />} disabled={!mayPublish || !live.hookConfigured || Boolean(waitingSince)} onClick={() => setConfirm(true)}>
              {t("publish")}
            </Button>
          ) : null}
        </div>
      </div>
      {status}
      {live.reachable && live.configured ? (
        <dl className="grid gap-x-6 gap-y-1 text-body-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-fg-muted">{t("site")}</dt>
          <dd className="min-w-0 truncate">
            <a href={live.url ?? "#"} target="_blank" rel="noreferrer" dir="ltr" className="inline-flex items-center gap-1 text-fg-brand hover:underline">
              {live.url?.replace(/^https?:\/\//, "")}
              <ArrowSquareOut aria-hidden="true" className="size-3.5" />
              <span className="sr-only">{t("newTab")}</span>
            </a>
          </dd>
          <dt className="text-fg-muted">{t("lastBuild")}</dt>
          <dd>
            {builtAt ? f.date(builtAt, { dateStyle: "medium", timeStyle: "short" }) : t("unknown")}
            {live.build ? <Badge size="sm" tone={live.build.source === "cms" ? "success" : "neutral"} className="ms-2">{t(live.build.source === "cms" ? "sourceCms" : "sourcePackaged")}</Badge> : null}
          </dd>
          {live.lastPublish ? (
            <>
              <dt className="text-fg-muted">{t("lastPublish")}</dt>
              <dd>{t(live.lastPublish.ok ? "lastPublishOk" : "lastPublishFailed", { time: f.date(live.lastPublish.at, { dateStyle: "medium", timeStyle: "short" }), name: live.lastPublish.by.name ?? live.lastPublish.by.key })}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      {!live.hookConfigured && live.reachable ? <p className="text-caption text-fg-subtle">{t("noHook")}</p> : !mayPublish ? <p className="text-caption text-fg-subtle">{t("noPermission")}</p> : null}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="primary"
        title={t("confirmTitle")}
        impact={parts.length ? t("confirmImpact", { parts: parts.join(", ") }) : t("confirmImpactNone")}
        reason={{ label: t("reason") }}
        confirmLabel={t("publish")}
        onConfirm={({ reason }) =>
          publish({ reason })
            .unwrap()
            .then((record) => {
              started.current = Date.now();
              setWaitingSince(record?.at ?? new Date().toISOString());
              toast.success(t("requested"));
            })
            .catch((e: ApiError) => {
              toast.error(e.code === "hook_missing" ? t("noHook") : t("publishFailed"));
              throw e;
            })
        }
      />
    </Card>
  );
}
