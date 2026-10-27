import { useEffect, useState } from "react";
import {
  ORIGINAL_CONTENT_TYPES,
  ORIGINAL_FILE_MAX_SIZE,
  type OriginalFileError,
  parseOriginalFile,
} from "@/modules/post/domain/original-file";
import type {
  CreateThumbnailResult,
  ThumbnailError,
} from "@/modules/post/domain/thumbnail";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import { createThumbnail } from "./create-thumbnail";

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

export type Thumbnail = Extract<CreateThumbnailResult, { ok: true }>;

export type OriginalFile =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "error"; message: string }
  | { status: "ready"; file: File; thumbnail: Thumbnail; previewUrl: string };

/** 選んだファイルを確かめ、サムネイルを作る。`onReady` は、サムネイルができたときに呼ぶ。 */
export function useOriginalFile({
  onReady,
}: {
  onReady?: (file: File) => void;
} = {}) {
  const [original, setOriginal] = useState<OriginalFile>({ status: "idle" });

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
    onReady?.(file);
  }

  function reset() {
    setOriginal({ status: "idle" });
  }

  return { original, handleFileChange, reset };
}

export function OriginalFileField({
  id,
  label,
  original,
  onChange,
  disabled,
}: {
  id: string;
  label: React.ReactNode;
  original: OriginalFile;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) {
  const messageId = `${id}-message`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="file"
        accept={ORIGINAL_CONTENT_TYPES.join(",")}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={original.status === "error" ? true : undefined}
        aria-describedby={messageId}
      />
      {original.status === "error" ? (
        <p id={messageId} role="alert" className="text-destructive text-sm">
          {original.message}
        </p>
      ) : (
        <p id={messageId} className="text-muted-foreground text-sm">
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
  );
}
