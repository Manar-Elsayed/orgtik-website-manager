"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Textarea,
  useFormatter,
} from "@orgtik/ui";
import { EditableNote } from "@/components/notes/EditableNote";
import { useCan } from "@/lib/permissions";
import { useMeQuery } from "@/store/api";
import { useStudio, useStudioAction, type ElementComment } from "@/lib/studio";
import { StudioFeedback, StudioState } from "./StudioUI";
export function ElementComments({
  entryId,
  anchor,
  locale,
  editable,
}: {
  entryId: string;
  anchor: string;
  locale: string;
  editable: boolean;
}) {
  const te = useTranslations("Editor"),
    t = useTranslations("WmV3"),
    f = useFormatter(),
    can = useCan(),
    me = useMeQuery(),
    resource = useStudio<ElementComment[]>("/studio/comments/" + entryId),
    action = useStudioAction(),
    [text, setText] = useState("");
  const rows = resource.data?.filter(
    (row) => row.anchor === anchor && row.locale === locale,
  );
  return (
    <section
      aria-labelledby="element-comments"
      className="mt-6 flex flex-col gap-4 border-t border-line pt-5"
    >
      <h2 id="element-comments" className="text-title-sm font-semibold">
        {t("elementComments")}
      </h2>
      <p className="text-body-sm text-fg-muted">
        {t("commentAnchor", { anchor, locale })}
      </p>
      <StudioFeedback action={action} onRetry={resource.reload} />
      {!rows ? (
        <StudioState resource={resource} />
      ) : rows.length ? (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-raised p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-body-sm font-semibold">
                  {row.author.name || t("formerStaff")}
                </span>
                <Badge tone={row.resolved ? "success" : "neutral"}>
                  {t(row.resolved ? "resolved" : "open")}
                </Badge>
              </div>
              <EditableNote
                text={row.text}
                editedAt={row.editedAt}
                maxLength={2000}
                editable={
                  editable &&
                  (row.author.key === me.data?.user.key ||
                    can("content:approve"))
                }
                disabled={action.busy || Boolean(action.pending)}
                onSave={(text) =>
                  action
                    .run("/studio/comments/" + row.id + "/edit", {
                      text,
                      version: row.version,
                    })
                    .then(resource.reload)
                }
                onDelete={() =>
                  action
                    .run("/studio/comments/" + row.id + "/delete", {
                      version: row.version,
                    })
                    .then(resource.reload)
                }
              />
              <span className="text-caption text-fg-muted">
                {f.date(row.at, { dateStyle: "medium", timeStyle: "short" })}
              </span>
              {editable &&
              (row.author.key === me.data?.user.key ||
                can("content:approve")) ? (
                <Button
                  className="self-start"
                  size="sm"
                  variant="ghost"
                  disabled={action.busy || Boolean(action.pending)}
                  onClick={() =>
                    void action
                      .run("/studio/comments/" + row.id + "/resolve", {
                        resolved: !row.resolved,
                        version: row.version,
                      })
                      .then(resource.reload)
                      .catch(() => {})
                  }
                >
                  {t(row.resolved ? "reopenComment" : "resolveComment")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState size="compact" title={t("noComments")} />
      )}{" "}
      {editable ? (
        <form
          className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-raised p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void action
              .run("/studio/comments", { entryId, anchor, locale, text })
              .then(() => {
                setText("");
                return resource.reload();
              })
              .catch(() => {});
          }}
        >
          <Field label={t("commentText")}>
            <Textarea
              value={text}
              maxLength={2000}
              onChange={(event) => setText(event.target.value)}
              dir="auto"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {text ? (
              <Button
                type="button"
                variant="secondary"
                disabled={action.busy || Boolean(action.pending)}
                onClick={() => setText("")}
              >
                {te("cancel")}
              </Button>
            ) : null}
            <Button
              type="submit"
              className="self-start"
              loading={action.busy}
              disabled={!text.trim() || Boolean(action.pending)}
            >
              {t("postComment")}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
