"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ORIGINAL_CONTENT_TYPES,
  ORIGINAL_FILE_MAX_SIZE,
  type OriginalFileError,
  parseOriginalFile,
} from "@/modules/post/domain/original-file";
import { POST_TITLE_MAX_LENGTH } from "@/modules/post/domain/post";
import type {
  CreateThumbnailResult,
  ThumbnailError,
} from "@/modules/post/domain/thumbnail";
import { Button } from "@/shared/presentation/components/ui/button";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import { createUploadUrlsAction, registerPostAction } from "./actions";
import { createThumbnail } from "./create-thumbnail";
import { toDatetimeLocalValue } from "./datetime-local";
import {
  EMPTY_POST_FIELD_VALUES,
  type ParsedPostFields,
  PostFields,
  parsePostFields,
} from "./post-fields";
import { uploadFile } from "./upload-file";

const MAX_SIZE_MB = ORIGINAL_FILE_MAX_SIZE / 1024 / 1024;

const FILE_ERROR_MESSAGES: Record<OriginalFileError | ThumbnailError, string> =
  {
    content_type_not_allowed:
      "PDF・JPEG・PNG・WebP のファイルを選んでください。",
    size_invalid: "空のファイルは選べません。",
    file_too_large: `${MAX_SIZE_MB}MB 以下のファイルを選んでください。`,
    pdf_unreadable: "PDF を読み込めませんでした。",
    image_unreadable: "画像を読み込めませんでした。",
  };

const UPLOAD_FAILED =
  "アップロードできませんでした。通信の状態を確かめて、もう一度お試しください。";

type Thumbnail = Extract<CreateThumbnailResult, { ok: true }>;

type Original =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "error"; message: string }
  | { status: "ready"; file: File; thumbnail: Thumbnail; previewUrl: string };

function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").slice(0, POST_TITLE_MAX_LENGTH);
}

export function PostForm({ boardId }: { boardId: string }) {
  const [original, setOriginal] = useState<Original>({ status: "idle" });
  const [fields, setFields] = useState(EMPTY_POST_FIELD_VALUES);
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

  useEffect(() => {
    if (original.status !== "ready") return;
    return () => URL.revokeObjectURL(original.previewUrl);
  }, [original]);

  /** イベントハンドラーの中の例外は error.tsx に届かないので、描画の中で投げ直す。 */
  function throwInRender(error: unknown): never {
    setOriginal(() => {
      throw error;
    });
    throw error;
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const parsed = parseOriginalFile({
      contentType: file.type,
      size: file.size,
    });
    if (!parsed.ok) {
      setOriginal({
        status: "error",
        message: FILE_ERROR_MESSAGES[parsed.reason],
      });
      return;
    }

    setOriginal({ status: "generating" });
    const thumbnail = await createThumbnail({
      file,
      contentType: parsed.contentType,
    }).catch(throwInRender);
    if (!thumbnail.ok) {
      setOriginal({
        status: "error",
        message: FILE_ERROR_MESSAGES[thumbnail.reason],
      });
      return;
    }
    setOriginal({
      status: "ready",
      file,
      thumbnail,
      previewUrl: URL.createObjectURL(thumbnail.blob),
    });
    setFields((current) => ({
      ...current,
      title: current.title || titleFromFileName(file.name),
    }));
  }

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
      setError(UPLOAD_FAILED);
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="post-original">
          ファイル <span className="text-muted-foreground">*</span>
        </Label>
        <Input
          id="post-original"
          type="file"
          accept={ORIGINAL_CONTENT_TYPES.join(",")}
          onChange={handleFileChange}
          disabled={busy}
          aria-invalid={original.status === "error" ? true : undefined}
          aria-describedby="post-original-message"
        />
        {original.status === "error" ? (
          <p
            id="post-original-message"
            role="alert"
            className="text-destructive text-sm"
          >
            {original.message}
          </p>
        ) : (
          <p
            id="post-original-message"
            className="text-muted-foreground text-sm"
          >
            {original.status === "generating"
              ? "サムネイルを作成中…"
              : `PDF・JPEG・PNG・WebP（${MAX_SIZE_MB}MB まで）`}
          </p>
        )}
        {original.status === "ready" && (
          // biome-ignore lint/performance/noImgElement: blob: の URL は next/image で最適化できない
          <img
            src={original.previewUrl}
            alt="サムネイル"
            width={original.thumbnail.width}
            height={original.thumbnail.height}
            className="h-auto max-h-80 w-auto max-w-full self-start rounded-md border"
          />
        )}
      </div>

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
