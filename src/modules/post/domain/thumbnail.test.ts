import { expect, test } from "vitest";
import {
  parseThumbnailFile,
  THUMBNAIL_CONTENT_TYPES,
  THUMBNAIL_MAX_SIZE,
} from "./thumbnail";

test.each(THUMBNAIL_CONTENT_TYPES)("%s は受け入れる", (contentType) => {
  expect(parseThumbnailFile({ contentType, size: THUMBNAIL_MAX_SIZE })).toEqual(
    { ok: true, contentType, size: THUMBNAIL_MAX_SIZE },
  );
});

test.each([
  ["PNG", { contentType: "image/png", size: 1000 }],
  ["PDF", { contentType: "application/pdf", size: 1000 }],
  ["0 バイト", { contentType: "image/webp", size: 0 }],
  ["小数のサイズ", { contentType: "image/webp", size: 1.5 }],
  [
    "上限を超えるサイズ",
    { contentType: "image/webp", size: THUMBNAIL_MAX_SIZE + 1 },
  ],
])("%s は thumbnail_invalid になる", (_, file) => {
  expect(parseThumbnailFile(file)).toEqual({
    ok: false,
    reason: "thumbnail_invalid",
  });
});
