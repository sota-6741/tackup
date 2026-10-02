"use client";

import { useEffect, useState } from "react";
import {
  ORIGINAL_CONTENT_TYPES,
  ORIGINAL_FILE_MAX_SIZE,
  type OriginalFileError,
  parseOriginalFile,
} from "@/modules/post/domain/original-file";
import type { ThumbnailError } from "@/modules/post/domain/thumbnail";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import { createThumbnail } from "./create-thumbnail";

const MAX_SIZE_MB = ORIGINAL_FILE_MAX_SIZE / 1024 / 1024;

const ERROR_MESSAGES: Record<OriginalFileError | ThumbnailError, string> = {
  content_type_not_allowed: "PDF・JPEG・PNG・WebP のファイルを選んでください。",
  size_invalid: "空のファイルは選べません。",
  file_too_large: `${MAX_SIZE_MB}MB 以下のファイルを選んでください。`,
  pdf_unreadable: "PDF を読み込めませんでした。",
  image_unreadable: "画像を読み込めませんでした。",
};

type State =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "error"; message: string }
  | {
      status: "done";
      url: string;
      width: number;
      height: number;
      size: number;
      elapsedMs: number;
    };

/** ステップ 3 の動作確認用。ステップ 4 で掲示物登録のフォームに育てる。 */
export function ThumbnailPreview() {
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    if (state.status !== "done") return;
    return () => URL.revokeObjectURL(state.url);
  }, [state]);

  /** イベントハンドラーの中の例外は error.tsx に届かないので、描画の中で投げ直す。 */
  function throwInRender(error: unknown): never {
    setState(() => {
      throw error;
    });
    throw error;
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const original = parseOriginalFile({
      contentType: file.type,
      size: file.size,
    });
    if (!original.ok) {
      setState({ status: "error", message: ERROR_MESSAGES[original.reason] });
      return;
    }

    setState({ status: "generating" });
    const startedAt = performance.now();
    const result = await createThumbnail({
      file,
      contentType: original.contentType,
    }).catch(throwInRender);
    if (!result.ok) {
      setState({ status: "error", message: ERROR_MESSAGES[result.reason] });
      return;
    }
    setState({
      status: "done",
      url: URL.createObjectURL(result.blob),
      width: result.width,
      height: result.height,
      size: result.blob.size,
      elapsedMs: Math.round(performance.now() - startedAt),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="original-file">原本</Label>
        <Input
          id="original-file"
          type="file"
          accept={ORIGINAL_CONTENT_TYPES.join(",")}
          onChange={handleChange}
          disabled={state.status === "generating"}
          aria-describedby="original-file-message"
        />
        {state.status === "error" ? (
          <p
            id="original-file-message"
            role="alert"
            className="text-destructive text-sm"
          >
            {state.message}
          </p>
        ) : (
          <p
            id="original-file-message"
            className="text-muted-foreground text-sm"
          >
            PDF・JPEG・PNG・WebP（{MAX_SIZE_MB}MB まで）
          </p>
        )}
      </div>

      {state.status === "generating" && (
        <p className="text-muted-foreground text-sm">サムネイルを作成中…</p>
      )}

      {state.status === "done" && (
        <figure className="flex flex-col gap-2">
          {/* biome-ignore lint/performance/noImgElement: blob: の URL は next/image で最適化できない */}
          <img
            src={state.url}
            alt="サムネイル"
            width={state.width}
            height={state.height}
            className="h-auto max-w-full rounded-md border"
          />
          <figcaption className="text-muted-foreground text-sm">
            {state.width}×{state.height}・{Math.round(state.size / 1024)}KB・
            {state.elapsedMs}ms
          </figcaption>
        </figure>
      )}
    </div>
  );
}
