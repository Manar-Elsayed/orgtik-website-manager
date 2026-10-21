"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Textarea, useFormatter } from "@orgtik/ui";
import { useCan } from "@/lib/permissions";
import { EditableNote } from "@/components/notes/EditableNote";
import {
  statusOf,
  useNoteIdeaMutation,
  useEditIdeaNoteMutation,
  useDeleteIdeaNoteMutation,
  type Idea,
} from "@/store/api";

export function IdeaNotes({
  idea,
  disabled,
}: {
  idea: Idea;
  disabled?: boolean;
}) {
  const t = useTranslations("Notes"),
    f = useFormatter(),
    can = useCan();
  const [text, setText] = useState(""),
    [error, setError] = useState("");
  const [add, adding] = useNoteIdeaMutation(),
    [edit, editing] = useEditIdeaNoteMutation(),
    [remove, removing] = useDeleteIdeaNoteMutation();
  const busy =
    disabled || adding.isLoading || editing.isLoading || removing.isLoading;
  return (
    <section aria-labelledby="idea-notes" className="flex flex-col gap-3">
      <div>
        <h3 id="idea-notes" className="text-label">
          {t("title")}
        </h3>
        <p className="mt-1 text-body-sm text-fg-muted">{t("private")}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {(idea.notes ?? []).map((note) => (
          <li key={note.id} className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-raised p-4">
            <p className="text-caption text-fg-muted">
              <bdi>{note.by.name}</bdi> ·{" "}
              {f.date(note.at, { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <EditableNote
              text={note.text}
              editedAt={note.editedAt}
              editable={can("marketing:edit")}
              disabled={busy}
              onSave={(text) =>
                edit({
                  id: idea.id,
                  version: idea.version,
                  noteId: note.id,
                  text,
                }).unwrap()
              }
              onDelete={() =>
                remove({
                  id: idea.id,
                  version: idea.version,
                  noteId: note.id,
                }).unwrap()
              }
            />
          </li>
        ))}
      </ol>
      {!idea.notes?.length ? (
        <p className="text-body-sm text-fg-muted">{t("empty")}</p>
      ) : null}
      {can("marketing:edit") ? (
        <form
          className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-raised p-4 sm:p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !text.trim()) return;
            setError("");
            try {
              await add({ id: idea.id, version: idea.version, text }).unwrap();
              setText("");
            } catch (reason) {
              setError(t(statusOf(reason) === 412 ? "stale" : "failed"));
            }
          }}
        >
          <Field label={t("new")}>
            <Textarea
              dir="auto"
              rows={3}
              maxLength={5000}
              value={text}
              disabled={busy}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {text || error ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setText("");
                  setError("");
                }}
              >
                {t("cancel")}
              </Button>
            ) : null}
            <Button
              type="submit"
              size="sm"
              loading={adding.isLoading}
              disabled={busy || !text.trim()}
            >
              {t("add")}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-body-sm text-danger">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
