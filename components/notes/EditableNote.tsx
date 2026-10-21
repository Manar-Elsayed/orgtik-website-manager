"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  ConfirmDialog,
  Field,
  Textarea,
  useFormatter,
} from "@orgtik/ui";

export function EditableNote({
  text,
  editable,
  disabled,
  maxLength = 5000,
  editedAt,
  onSave,
  onDelete,
}: {
  text: string;
  editable: boolean;
  disabled?: boolean;
  maxLength?: number;
  editedAt?: string;
  onSave: (text: string) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const t = useTranslations("Notes"),
    f = useFormatter();
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(text);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const failure = (reason: unknown) =>
    reason &&
    typeof reason === "object" &&
    "status" in reason &&
    reason.status === 412
      ? t("stale")
      : t("failed");
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {editing && editable ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || disabled || !draft.trim()) return;
            setBusy(true);
            setError("");
            try {
              await onSave(draft.trim());
              setEditing(false);
            } catch (reason) {
              setError(failure(reason));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label={t("editText")}>
            <Textarea
              autoFocus
              dir="auto"
              rows={3}
              maxLength={maxLength}
              value={draft}
              disabled={busy || disabled}
              onChange={(event) => setDraft(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              loading={busy}
              disabled={disabled || !draft.trim() || draft.trim() === text}
            >
              {t("save")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setError("");
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p
            dir="auto"
            className="whitespace-pre-wrap break-words text-body-sm text-fg"
          >
            {text}
          </p>
          {editedAt ? (
            <p className="text-caption text-fg-muted">
              {t("edited", {
                at: f.date(editedAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </p>
          ) : null}
          {editable ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={disabled || busy}
                onClick={() => {
                  setDraft(text);
                  setEditing(true);
                  setError("");
                }}
              >
                {t("edit")}
              </Button>
              <ConfirmDialog
                tone="danger"
                title={t("deleteTitle")}
                impact={t("deleteImpact")}
                confirmLabel={t("delete")}
                trigger={
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={disabled || busy}
                  >
                    {t("delete")}
                  </Button>
                }
                onConfirm={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await onDelete();
                  } catch (reason) {
                    setError(failure(reason));
                    throw reason;
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </div>
          ) : null}
        </>
      )}
      {error ? (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
