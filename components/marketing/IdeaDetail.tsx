"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { LoadingState, ErrorState, EmptyState, Textarea, Button, ConfirmDialog, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, StatusBadge, TagInput, toast, useFormatter, useStatusLabel } from "@orgtik/ui";


import { useCan } from "@/lib/permissions";
import { LifecycleProgress } from "./LifecycleProgress";
import { IdeaComments } from "./IdeaComments";
import { IdeaNotes } from "./IdeaNotes";
import { IDEA_CATEGORIES, IdeaTags } from "./IdeaTags";
import { useIdeaQuery, useEditIdeaMutation } from "@/store/api";
import {
  statusOf,
  useIdeasQuery,
  useModerateIdeaMutation,
  useEraseIdeaMutation,
  type ApiError,
  type Idea,
  type IdeaAction,
  type IdeaStatus,
} from "@/store/api";

// The tabs: what needs a decision first, then the public lifecycle, then everything closed.
// What can be done from each status (status matrix roadmap_idea). The first one is the main action.
export const NEXT: Partial<Record<IdeaStatus, IdeaAction[]>> = {
  pending: ["publish", "merge", "decline", "hide"],
  open: ["plan", "merge", "decline", "hide"],
  planned: ["start", "hide"],
  in_progress: ["ship", "hide"],
  shipped: ["hide"],
};
const VISIBLE: IdeaStatus[] = ["open", "planned", "in_progress", "shipped"];

/** One action on one idea, with what it asks for: a reason, a link, or the idea to merge into. */
export function ActionDialog({
  idea,
  action,
  onClose,
}: {
  idea: Idea;
  action: IdeaAction;
  onClose: () => void;
}) {
  const t = useTranslations("Ideas");
  const [moderate] = useModerateIdeaMutation();
  const others = useIdeasQuery({ pageSize: 100 }, { skip: action !== "merge" });
  const [into, setInto] = useState<string | null>(null);
  const run = (extra: { reason?: string; link?: string; into?: string } = {}) =>
    moderate({ id: idea.id, version: idea.version, action, ...extra })
      .unwrap()
      .then(() => {
        toast.success(t(`done.${action}`));
        onClose();
      })
      .catch((e: ApiError) => {
        if (e.status === 412) toast.error(t("stale"));
        else if (e.fieldErrors?.link) toast.error(t("errorLink"));
        else toast.error(t("failed"));
        throw e;
      });

  if (action === "merge") {
    const targets = (others.data?.items ?? []).filter(
      (x) => x.id !== idea.id && VISIBLE.includes(x.status),
    );
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t("mergeTitle")}</DialogTitle>
            <DialogDescription>
              {t("mergeImpact", { votes: idea.votes })}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label={t("mergeInto")}>
              <Select
                value={into}
                onValueChange={setInto}
                placeholder={t("mergePick")}
                options={targets.map((x) => ({
                  value: x.id,
                  label: <span dir="auto">{x.title}</span>,
                }))}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button
              disabled={!into}
              onClick={() => into && run({ into }).catch(() => {})}
            >
              {t("actions.merge")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  const asks =
    action === "ship"
      ? { label: t("shipLink"), required: true, placeholder: "/software" }
      : action === "decline" || action === "hide"
        ? { label: t(`reason.${action}`), required: true }
        : undefined;
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      tone={action === "decline" ? "danger" : action === "hide" ? "warning" : "primary"}
      title={t(`confirm.${action}`, { title: idea.title })}
      impact={t(`impact.${action}`)}
      reason={asks}
      confirmLabel={t(`actions.${action}`)}
      onConfirm={({ reason }) =>
        run(action === "ship" ? { link: reason } : asks ? { reason } : {})
      }
    />
  );
}

export function IdeaDetailContent({
  idea,
  onClose,
}: {
  idea: Idea;
  onClose: () => void;
}) {
  const t = useTranslations("Ideas");
  const ti = useTranslations("Improvements");
  const te = useTranslations("Editor");
  const statusLabel = useStatusLabel();
  const [editing, setEditing] = useState(useSearchParams().get("edit") === "1");
  const [fields, setFields] = useState({
    title: idea.title,
    body: idea.body,
    tags: idea.tags,
    category: idea.category,
  });
  const [save, saving] = useEditIdeaMutation();
  const [acting, setActing] = useState<IdeaAction | null>(null);
  const f = useFormatter();
  const can = useCan();
  const [erase] = useEraseIdeaMutation();
  const tagsInvalid = fields.tags.length > 10 || fields.tags.some(tag => tag.trim().length > 100);
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-5">
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 lg:flex-nowrap">
          <div className="min-w-0 lg:min-w-60 lg:flex-1">
            <h1 className="mb-3 font-display text-title-lg [overflow-wrap:anywhere]">
              <span dir="auto">{idea.title}</span>
            </h1>
            <div>
              <span className="inline-flex flex-wrap items-center gap-2">
                <StatusBadge
                  entity="roadmap_idea"
                  state={idea.status}
                  size="sm"
                />
                <span>{t("colCategory")}: {t(`categories.${idea.category ?? "unassigned"}`)}</span>
                <IdeaTags tags={idea.tags} empty={t("noTags")} />
              </span>
            </div>
          </div>
          {can("marketing:edit") ? (
            <div className="flex flex-wrap items-center gap-2 lg:min-w-0 lg:justify-end">
              <Button
                variant="secondary"
                disabled={saving.isLoading}
                onClick={() => {
                  setFields({
                    title: idea.title,
                    body: idea.body,
                    tags: idea.tags,
                    category: idea.category,
                  });
                  setEditing((value) => !value);
                }}
              >
                {editing ? t("cancel") : ti("edit")}
              </Button>
              {(NEXT[idea.status] ?? []).map((action) => (
                <Button
                  key={action}
                  variant={
                    action === "decline"
                      ? "danger"
                      : action === "hide" ? "warning"
                      : "secondary"
                  }
                  disabled={editing || saving.isLoading}
                  onClick={() => setActing(action)}
                >
                  {t(`actions.${action}`)}
                </Button>
              ))}
            </div>
          ) : null}
        </header>
        <div className="flex flex-col gap-5">
          <LifecycleProgress
            label={t("history")}
            current={idea.status}
            visited={idea.history.flatMap((event) =>
              event.to ? [event.to] : [],
            )}
            stages={(
              ["pending", "open", "planned", "in_progress", "shipped"] as const
            ).map((key) => ({
              key,
              label:
                key === "open"
                  ? ti("opened")
                  : statusLabel("roadmap_idea", key),
            }))}
            outcome={<StatusBadge entity="roadmap_idea" state={idea.status} />}
          />
          {editing && can("marketing:edit") ? (
            <fieldset disabled={saving.isLoading} className="flex min-w-0 flex-col gap-4 rounded-card border border-line bg-raised p-4 sm:p-5">
              <Field label={t("colIdea")}>
                <Input
                  maxLength={180}
                  value={fields.title}
                  onChange={(event) =>
                    setFields((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={ti("description")}>
                <Textarea
                  maxLength={5000}
                  rows={5}
                  value={fields.body}
                  onChange={(event) =>
                    setFields((previous) => ({
                      ...previous,
                      body: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={t("colCategory")} description={t("categoryHelp")}>
                <Select aria-label={t("colCategory")} value={fields.category ?? "unassigned"} onValueChange={value => setFields(previous => ({ ...previous, category: value === "unassigned" ? null : value as Idea["category"] }))} options={[{ value: "unassigned", label: t("categories.unassigned") }, ...IDEA_CATEGORIES.map(value => ({ value, label: t(`categories.${value}`) }))]} />
              </Field>
              <Field label={t("colTags")} description={t("tagsHelp")} error={tagsInvalid ? t("tagsError") : undefined}>
                <div className="min-w-0 [&_li]:max-w-full [&_li_span]:min-w-0 [&_li_span]:break-words">
                  <TagInput label={t("colTags")} value={fields.tags} max={10} disabled={saving.isLoading} placeholder={t("tagsPlaceholder")} onChange={tags => setFields(previous => ({ ...previous, tags }))} />
                </div>
              </Field>
              <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={saving.isLoading} onClick={() => { setFields({title: idea.title, body: idea.body, tags: idea.tags, category: idea.category}); setEditing(false); }}>{t("cancel")}</Button>
              <Button
                className="self-start"
                loading={saving.isLoading}
                disabled={tagsInvalid}
                onClick={async () => {
                  try {
                    await save({
                      id: idea.id,
                      version: idea.version,
                      ...fields,
                    }).unwrap();
                    setEditing(false);
                    toast.success(te("saved"));
                  } catch (error) {
                    toast.error(
                      t(statusOf(error) === 412 ? "stale" : "failed"),
                    );
                  }
                }}
              >
                {ti("saveChanges")}
              </Button>
              </div>
            </fieldset>
          ) : null}
          {acting ? (
            <ActionDialog
              idea={idea}
              action={acting}
              onClose={() => setActing(null)}
            />
          ) : null}
          <p dir="auto" className="text-body text-fg">
            {idea.body}
          </p>
          <p className="text-body-sm text-fg-muted">
            {t("counts", { votes: idea.votes, comments: idea.comments })}
          </p>
          {idea.source ? (
            <p className="text-body-sm text-fg-muted">
              {t("source")}:{" "}
              <bdi>
                {idea.source === "website" ? t("sourceWebsite") : idea.source}
              </bdi>
            </p>
          ) : null}
          {idea.submitter ? (
            <section
              className="flex flex-col gap-2"
              aria-labelledby="idea-submitter"
            >
              <h3 id="idea-submitter" className="text-label">
                {t("submitter")}
              </h3>
              {idea.submitter.erased ? (
                <p>{t("erased")}</p>
              ) : (
                <>
                  <p dir="auto">{idea.submitter.name}</p>
                  <p dir="ltr" className="break-words text-start">
                    {idea.submitter.email}
                  </p>
                  {idea.submitter.masked ? (
                    <p className="text-body-sm text-fg-muted">{t("masked")}</p>
                  ) : null}
                  {can("leads:pii") ? (
                    <ConfirmDialog
                      tone="danger"
                      trigger={
                        <Button size="sm" variant="danger">
                          {t("erase")}
                        </Button>
                      }
                      title={t("eraseTitle")}
                      impact={t("eraseImpact")}
                      confirmLabel={t("erase")}
                      onConfirm={() =>
                        erase({ id: idea.id, version: idea.version })
                          .unwrap()
                          .then(() => {
                            toast.success(t("erased"));
                            onClose();
                          })
                          .catch((error: ApiError) => {
                            toast.error(
                              t(error.status === 412 ? "stale" : "failed"),
                            );
                            throw error;
                          })
                      }
                    />
                  ) : null}
                </>
              )}
            </section>
          ) : null}
          <IdeaComments idea={idea} onRefresh={onClose} disabled={editing || saving.isLoading} />
          <IdeaNotes idea={idea} disabled={editing || saving.isLoading} />
          {idea.commentPreview?.length ? (
            <section
              className="flex flex-col gap-2"
              aria-labelledby="idea-comments"
            >
              <h3 id="idea-comments" className="text-label">
                {t("sampleComments")}
              </h3>
              <ol className="flex flex-col gap-3">
                {idea.commentPreview.map((comment) => (
                  <li
                    key={comment.id}
                    className="rounded-field border border-line p-3"
                  >
                    <p dir="auto" className="text-label">
                      {comment.author}
                    </p>
                    <p dir="auto" className="mt-1 text-body-sm">
                      {comment.body}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {idea.reason ? (
            <p className="text-body-sm text-fg">
              <span className="font-semibold">{t("reasonLabel")}:</span>{" "}
              <span dir="auto">{idea.reason}</span>
            </p>
          ) : null}
          {idea.link ? (
            <p className="text-body-sm text-fg">
              <span className="font-semibold">{t("shipLink")}:</span>{" "}
              <span dir="ltr">{idea.link}</span>
            </p>
          ) : null}
          {idea.mergedInto ? (
            <p className="text-body-sm text-fg">
              <span className="font-semibold">{t("mergedInto")}:</span>{" "}
              <span dir="ltr">{idea.mergedInto}</span>
            </p>
          ) : null}
          <section
            aria-labelledby="idea-history"
            className="flex flex-col gap-2"
          >
            <h3 id="idea-history" className="text-label text-fg">
              {t("history")}
            </h3>
            <ol className="flex flex-col gap-2">
              {idea.history.map((h, i) => (
                <li
                  key={i}
                  className="border-b border-line pb-2 text-body-sm last:border-0"
                >
                  <span className="text-fg">{t(`log.${h.action}`)}</span>
                  <span className="text-fg-muted">
                    {" "}
                    ·{" "}
                    {f.date(h.at, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · <bdi dir="auto">{h.by.name ?? t("visitor")}</bdi>
                  </span>
                  {h.reason ? (
                    <span dir="auto" className="block text-fg-muted">
                      {h.reason}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

export function IdeaDetail({ id }: { id: string }) {
  const query = useIdeaQuery(id, { refetchOnMountOrArgChange: true });
  const t = useTranslations("Ideas");
  if (query.isLoading) return <LoadingState rows={5} />;
  if (statusOf(query.error) === 404) return <EmptyState title={t("noMatch")} />;
  if (!query.data || query.error) return <ErrorState onRetry={query.refetch} />;
  return (
    <IdeaDetailContent
      key={id}
      idea={query.data}
      onClose={() => query.refetch()}
    />
  );
}
