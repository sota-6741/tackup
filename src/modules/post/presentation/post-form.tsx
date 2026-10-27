"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { POST_TITLE_MAX_LENGTH } from "@/modules/post/domain/post";
import { Button } from "@/shared/presentation/components/ui/button";
import { createUploadUrlsAction, registerPostAction } from "./actions";
import { toDatetimeLocalValue } from "./datetime-local";
import {
  OriginalFileField,
  type Thumbnail,
  useOriginalFile,
} from "./original-file-field";
import {
  EMPTY_POST_FIELD_VALUES,
  type ParsedPostFields,
  PostFields,
  parsePostFields,
} from "./post-fields";
import { UPLOAD_FAILED_MESSAGE, uploadFile } from "./upload-file";

function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").slice(0, POST_TITLE_MAX_LENGTH);
}

export function PostForm({ boardId }: { boardId: string }) {
  const [fields, setFields] = useState(EMPTY_POST_FIELD_VALUES);
  const { original, handleFileChange } = useOriginalFile({
    onReady: (file) =>
      setFields((current) => ({
        ...current,
        title: current.title || titleFromFileName(file.name),
      })),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // サーバーとブラウザでタイムゾーンが違うので、今の日時はブラウザで描画したあとに入れる。
  useEffect(() => {
    setFields((current) => ({
      ...current,
      publishFrom: toDatetimeLocalValue(new Date()),
    }));
  }, []);

  async function submit({
    file,
    thumbnail,
    parsed,
  }: {
    file: File;
    thumbnail: Thumbnail;
    parsed: ParsedPostFields;
  }) {
    const urls = await createUploadUrlsAction({
      boardId,
      original: { contentType: file.type, size: file.size },
      thumbnail: {
        contentType: thumbnail.contentType,
        size: thumbnail.blob.size,
      },
    });
    if (!urls.ok) {
      setError(urls.error);
      return;
    }

    const uploaded = await Promise.all([
      uploadFile({ target: urls.original, body: file }),
      uploadFile({ target: urls.thumbnail, body: thumbnail.blob }),
    ]);
    if (uploaded.includes(false)) {
      setError(UPLOAD_FAILED_MESSAGE);
      return;
    }

    const result = await registerPostAction({
      boardId,
      title: parsed.title,
      description: parsed.description,
      externalUrl: parsed.externalUrl,
      publishFrom: parsed.publishFromIso,
      expiresAt: parsed.expiresAtIso,
      originalKey: urls.original.key,
      thumbnailKey: urls.thumbnail.key,
      thumbnailWidth: thumbnail.width,
      thumbnailHeight: thumbnail.height,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/boards/${boardId}`);
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (original.status !== "ready") {
      setError("ファイルを選んでください。");
      return;
    }
    const parsed = parsePostFields(fields);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setError(null);
    const { file, thumbnail } = original;
    startTransition(() => submit({ file, thumbnail, parsed: parsed.fields }));
  }

  const busy = pending || original.status === "generating";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <OriginalFileField
        id="post-original"
        label={
          <>
            ファイル <span className="text-muted-foreground">*</span>
          </>
        }
        original={original}
        onChange={handleFileChange}
        disabled={busy}
      />

      <PostFields values={fields} onChange={setFields} />

      <div className="flex flex-col items-end gap-3">
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {pending ? "登録中…" : "登録する"}
        </Button>
      </div>
    </form>
  );
}
