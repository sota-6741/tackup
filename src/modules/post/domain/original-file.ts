export const ORIGINAL_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type OriginalContentType = (typeof ORIGINAL_CONTENT_TYPES)[number];

export const ORIGINAL_FILE_MAX_SIZE = 20 * 1024 * 1024;

export type OriginalFileError =
  | "content_type_not_allowed"
  | "size_invalid"
  | "file_too_large";

export type ParseOriginalFileResult =
  | { ok: true; contentType: OriginalContentType; size: number }
  | { ok: false; reason: OriginalFileError };

function isOriginalContentType(value: string): value is OriginalContentType {
  return (ORIGINAL_CONTENT_TYPES as readonly string[]).includes(value);
}

export function parseOriginalFile({
  contentType,
  size,
}: {
  contentType: string;
  size: number;
}): ParseOriginalFileResult {
  if (!isOriginalContentType(contentType)) {
    return { ok: false, reason: "content_type_not_allowed" };
  }
  if (!Number.isInteger(size) || size <= 0) {
    return { ok: false, reason: "size_invalid" };
  }
  if (size > ORIGINAL_FILE_MAX_SIZE) {
    return { ok: false, reason: "file_too_large" };
  }
  return { ok: true, contentType, size };
}
