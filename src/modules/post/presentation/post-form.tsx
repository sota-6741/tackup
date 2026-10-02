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
import { datetimeLocalToIso, toDatetimeLocalValue } from "./datetime-local";
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
  const [title, setTitle] = useState("");
  const [publishFrom, setPublishFrom] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // サーバーとブラウザでタイムゾーンが違うので、今の日時はブラウザで描画したあとに入れる。
  useEffect(() => {
    setPublishFrom(toDatetimeLocalValue(new Date()));
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
    setTitle((current) => current || titleFromFileName(file.name));
  }

  async function submit({
    file,
    thumbnail,
  }: {
    file: File;
    thumbnail: Thumbnail;
  }) {
    const publishFromIso = datetimeLocalToIso(publishFrom);
    const expiresAtIso = datetimeLocalToIso(expiresAt);
    if (!publishFromIso || !expiresAtIso) {
      setError("掲示開始と掲示終了の日時を入力してください。");
      return;
    }

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
      title,
      publishFrom: publishFromIso,
      expiresAt: expiresAtIso,
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (original.status !== "ready") {
      setError("原本のファイルを選んでください。");
      return;
    }
    setError(null);
    startTransition(() => submit(original));
  }

  const busy = pending || original.status === "generating";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Label htmlFor="post-original">
          原本 <span className="text-muted-foreground">*</span>
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="post-title">
          タイトル <span className="text-muted-foreground">*</span>
        </Label>
        <Input
          id="post-title"
          required
          maxLength={POST_TITLE_MAX_LENGTH}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-describedby="post-title-message"
        />
        <p id="post-title-message" className="text-muted-foreground text-sm">
          {POST_TITLE_MAX_LENGTH}文字以内
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="post-publish-from">
            掲示開始 <span className="text-muted-foreground">*</span>
          </Label>
          <Input
            id="post-publish-from"
            type="datetime-local"
            required
            value={publishFrom}
            onChange={(event) => setPublishFrom(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="post-expires-at">
            掲示終了 <span className="text-muted-foreground">*</span>
          </Label>
          <Input
            id="post-expires-at"
            type="datetime-local"
            required
            min={publishFrom}
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </div>
      </div>

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
