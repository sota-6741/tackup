"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  createReplacementUploadUrlsAction,
  replaceOriginalAction,
} from "./actions";
import {
  OriginalFileField,
  type Thumbnail,
  useOriginalFile,
} from "./original-file-field";
import { UPLOAD_FAILED_MESSAGE, uploadFile } from "./upload-file";

type Message = { kind: "error" | "done"; text: string };

/** 項目の編集とは別に保存する。失敗の種類が混ざらないように、1 回の保存にまとめない。 */
export function ReplaceOriginalForm({ publicId }: { publicId: string }) {
  const { original, handleFileChange, reset } = useOriginalFile();
  const [message, setMessage] = useState<Message | null>(null);
  // 差し替えたあとに、選んだファイルを入力欄から消すために作り直す。
  const [inputKey, setInputKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function replace({
    file,
    thumbnail,
  }: {
    file: File;
    thumbnail: Thumbnail;
  }) {
    const urls = await createReplacementUploadUrlsAction({
      publicId,
      original: { contentType: file.type, size: file.size },
      thumbnail: {
        contentType: thumbnail.contentType,
        size: thumbnail.blob.size,
      },
    });
    if (!urls.ok) {
      setMessage({ kind: "error", text: urls.error });
      return;
    }

    const uploaded = await Promise.all([
      uploadFile({ target: urls.original, body: file }),
      uploadFile({ target: urls.thumbnail, body: thumbnail.blob }),
    ]);
    if (uploaded.includes(false)) {
      setMessage({ kind: "error", text: UPLOAD_FAILED_MESSAGE });
      return;
    }

    const result = await replaceOriginalAction({
      publicId,
      originalKey: urls.original.key,
      thumbnailKey: urls.thumbnail.key,
      thumbnailWidth: thumbnail.width,
      thumbnailHeight: thumbnail.height,
    });
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    reset();
    setInputKey((current) => current + 1);
    setMessage({ kind: "done", text: "ファイルを差し替えました。" });
    router.refresh();
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (original.status !== "ready") {
      setMessage({ kind: "error", text: "ファイルを選んでください。" });
      return;
    }
    setMessage(null);
    const { file, thumbnail } = original;
    startTransition(() => replace({ file, thumbnail }));
  }

  // 前の結果を残すと、選び直したファイルまで差し替え済みに見えるので消す。
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setMessage(null);
    handleFileChange(event);
  }

  const busy = pending || original.status === "generating";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <OriginalFileField
        key={inputKey}
        id="replace-original"
        label="新しいファイル"
        original={original}
        onChange={handleChange}
        disabled={busy}
      />
      <div className="flex flex-col items-end gap-3">
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={
              message.kind === "error"
                ? "text-destructive text-sm"
                : "text-muted-foreground text-sm"
            }
          >
            {message.text}
          </p>
        )}
        <Button type="submit" variant="outline" disabled={busy}>
          {pending ? "差し替え中…" : "ファイルを差し替える"}
        </Button>
      </div>
    </form>
  );
}
