export type ThumbnailError = "pdf_unreadable" | "image_unreadable";

export type CreateThumbnailResult =
  | { ok: true; blob: Blob; width: number; height: number }
  | { ok: false; reason: ThumbnailError };
