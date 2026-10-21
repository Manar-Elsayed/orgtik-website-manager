"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  ConfirmDialog,
  Select,
  toast,
  useFormatter,
} from "@orgtik/ui";
import { useCan } from "@/lib/permissions";
import {
  useModerateIdeaCommentMutation,
  type ApiError,
  type Idea,
  type IdeaComment,
} from "@/store/api";

export function IdeaComments({
  idea,
  onRefresh,
  disabled,
}: {
  idea: Idea;
  onRefresh: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Ideas.discussion"),
    common = useTranslations("Ideas");
  const can = useCan(),
    f = useFormatter();
  const [filter, setFilter] = useState("all");
  const [acting, setActing] = useState<{
    comment: IdeaComment;
    action: "approve" | "hide" | "delete" | "restore";
  } | null>(null);
  const [moderate, result] = useModerateIdeaCommentMutation();
  const comments = (idea.discussion ?? []).filter((comment) =>
    filter === "all" ? comment.status !== "deleted" : comment.status === filter,
  );
  const declining =
    acting?.action === "hide" && acting.comment.status === "pending";
  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-labelledby="visitor-comments"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="visitor-comments" className="font-display text-title-sm">
          {t("title")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={onRefresh}
          >
            {t("refresh")}
          </Button>
          <Select
            aria-label={t("status")}
            className="w-44"
            label={t("status")}
            value={filter}
            onValueChange={(value) => setFilter(value ?? "all")}
            options={["all", "pending", "approved", "hidden", "deleted"].map(
              (value) => ({
                value,
                label: t(value),
              }),
            )}
          />
        </div>
      </div>
      <p className="text-body-sm text-fg-muted">{t("help")}</p>
      {comments.length ? (
        <ol className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              data-comment-id={comment.id}
              className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-raised p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p dir="auto" className="break-words font-semibold">
                    {comment.author}
                  </p>
                  {comment.email ? (
                    <p
                      dir="ltr"
                      className="break-all text-start text-body-sm text-fg-muted"
                    >
                      {comment.email}
                    </p>
                  ) : null}
                  <p className="mt-1 text-caption text-fg-muted">
                    {f.date(comment.submittedAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <Badge
                  size="sm"
                  tone={
                    comment.status === "pending"
                      ? "warning"
                      : comment.status === "approved"
                        ? "success"
                        : "neutral"
                  }
                >
                  {t(comment.status)}
                </Badge>
              </div>
              <p
                dir="auto"
                className="whitespace-pre-wrap break-words text-body"
              >
                {comment.body}
              </p>
              {comment.reason ? (
                <p
                  dir="auto"
                  className="break-words text-body-sm text-fg-muted"
                >
                  {comment.reason}
                </p>
              ) : null}
              {can("marketing:edit") ? (
                <div className="flex flex-wrap gap-2">
                  {comment.status !== "approved" &&
                  comment.status !== "deleted" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={disabled || result.isLoading}
                      onClick={() => setActing({ comment, action: "approve" })}
                    >
                      {t("approve")}
                    </Button>
                  ) : null}
                  {comment.status !== "hidden" &&
                  comment.status !== "deleted" ? (
                    <Button
                      size="sm"
                      variant={
                        comment.status === "pending" ? "danger" : "warning"
                      }
                      disabled={disabled || result.isLoading}
                      onClick={() => setActing({ comment, action: "hide" })}
                    >
                      {t(comment.status === "pending" ? "decline" : "hide")}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant={
                      comment.status === "deleted" ? "secondary" : "danger"
                    }
                    disabled={disabled || result.isLoading}
                    onClick={() =>
                      setActing({
                        comment,
                        action:
                          comment.status === "deleted" ? "restore" : "delete",
                      })
                    }
                  >
                    {t(comment.status === "deleted" ? "restore" : "delete")}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-card border border-line p-4 text-body-sm text-fg-muted">
          {t("empty")}
        </p>
      )}
      {acting ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setActing(null)}
          title={t(
            acting.action === "delete"
              ? "deleteTitle"
              : acting.action === "restore"
                ? "restoreTitle"
                : declining
                  ? "declineTitle"
                  : acting.action === "approve"
                    ? "approveTitle"
                    : "hideTitle",
          )}
          impact={t(
            acting.action === "delete"
              ? "deleteImpact"
              : acting.action === "restore"
                ? "restoreImpact"
                : declining
                  ? "declineImpact"
                  : acting.action === "approve"
                    ? "approveImpact"
                    : "hideImpact",
          )}
          tone={
            declining || acting.action === "delete"
              ? "danger"
              : acting.action === "approve" || acting.action === "restore"
                ? "primary"
                : "warning"
          }
          confirmLabel={t(declining ? "decline" : acting.action)}
          reason={
            acting.action === "hide"
              ? { label: t("reason"), required: true }
              : undefined
          }
          onConfirm={async ({ reason }) => {
            try {
              await moderate({
                id: idea.id,
                commentId: acting.comment.id,
                version: acting.comment.version,
                action: acting.action,
                reason,
              }).unwrap();
              toast.success(t("saved"));
              setActing(null);
            } catch (error) {
              toast.error(
                common((error as ApiError).status === 412 ? "stale" : "failed"),
              );
              throw error;
            }
          }}
        />
      ) : null}
    </section>
  );
}
