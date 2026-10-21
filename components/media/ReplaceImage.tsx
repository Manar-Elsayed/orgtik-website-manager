"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, FileField, toast } from "@orgtik/ui";
import { useReplaceMediaMutation, type ApiError, type MediaItem } from "@/store/api";

export function ReplaceImage({ media, disabled }: { media: MediaItem; disabled: boolean }) {
  const t = useTranslations("Media");
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>();
  const [replace, replacing] = useReplaceMediaMutation();
  const submit = async () => {
    if (!files[0]) return;
    setError(undefined);
    try {
      await replace({id:media.id, version:media.version, file:files[0]}).unwrap();
      setOpen(false);
      setFiles([]);
      toast.success(t("replaced"));
    } catch (reason) {
      const failure = reason as ApiError;
      setError(failure.status === 412 ? t("stale") : failure.status === 422 ? t("replaceInvalid") : t("failed"));
    }
  };
  return (
    <Dialog open={open} onOpenChange={next => {
      if (replacing.isLoading) return;
      setOpen(next);
      if (!next) { setFiles([]); setError(undefined); }
    }}>
      <Button variant="secondary" startIcon={<ArrowsClockwise />} disabled={disabled} title={disabled ? t("replaceSaveFirst") : undefined} onClick={() => setOpen(true)}>
        {t("replaceImage")}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("replaceImage")}</DialogTitle>
          <DialogDescription>{t("replaceBody")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <p className="break-all text-body-sm font-semibold text-fg" dir="ltr">{media.file}</p>
          <FileField label={t("file")} value={files} onChange={next => { setFiles(next); setError(undefined); }} accept="image/png,image/jpeg,image/webp" maxSize={15 * 1024 * 1024} maxFiles={1} multiple={false} disabled={replacing.isLoading} />
          <p className="text-body-sm text-fg-muted">{t("replaceImpact", {count:media.usage})}</p>
          {error ? <p role="alert" className="text-body-sm text-danger">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" disabled={replacing.isLoading} onClick={() => { setOpen(false); setFiles([]); setError(undefined); }}>{t("cancel")}</Button>
          <Button disabled={!files.length} loading={replacing.isLoading} onClick={submit}>{t("replaceImage")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
