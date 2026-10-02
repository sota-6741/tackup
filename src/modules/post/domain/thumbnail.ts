export const THUMBNAIL_LONG_SIDE = 800;

/** WebP に書き出せないブラウザでは JPEG で作る。 */
export const THUMBNAIL_CONTENT_TYPES = ["image/webp", "image/jpeg"] as const;

export type ThumbnailContentType = (typeof THUMBNAIL_CONTENT_TYPES)[number];

export const THUMBNAIL_MAX_SIZE = 2 * 1024 * 1024;

export type ThumbnailError = "pdf_unreadable" | "image_unreadable";

export type CreateThumbnailResult =
  | {
      ok: true;
      blob: Blob;
      contentType: ThumbnailContentType;
      width: number;
      height: number;
    }
  | { ok: false; reason: ThumbnailError };

export type ParseThumbnailFileResult =
  | { ok: true; contentType: ThumbnailContentType; size: number }
  | { ok: false; reason: "thumbnail_invalid" };

function isThumbnailContentType(value: string): value is ThumbnailContentType {
  return (THUMBNAIL_CONTENT_TYPES as readonly string[]).includes(value);
}

/** サムネイルはアプリが作るので、形式やサイズが合わないのは利用者の間違いではない。理由は分けない。 */
export function parseThumbnailFile({
  contentType,
  size,
}: {
  contentType: string;
  size: number;
}): ParseThumbnailFileResult {
  if (
    !isThumbnailContentType(contentType) ||
    !Number.isInteger(size) ||
    size <= 0 ||
    size > THUMBNAIL_MAX_SIZE
  ) {
    return { ok: false, reason: "thumbnail_invalid" };
  }
  return { ok: true, contentType, size };
}

export type ParseThumbnailSizeResult =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: "thumbnail_invalid" };

function isSideLength(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= THUMBNAIL_LONG_SIDE;
}

/** 幅と高さはブラウザが申告する値で、サーバーは画像を開いて確かめない。一覧の縦横比が崩れないよう、取りうる範囲だけ確かめる。 */
export function parseThumbnailSize({
  width,
  height,
}: {
  width: number;
  height: number;
}): ParseThumbnailSizeResult {
  if (!isSideLength(width) || !isSideLength(height)) {
    return { ok: false, reason: "thumbnail_invalid" };
  }
  return { ok: true, width, height };
}
