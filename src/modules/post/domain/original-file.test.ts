import { expect, test } from "vitest";
import {
  ORIGINAL_CONTENT_TYPES,
  ORIGINAL_FILE_MAX_SIZE,
  parseOriginalFile,
} from "./original-file";

test.each(ORIGINAL_CONTENT_TYPES)("%s は受け入れる", (contentType) => {
  expect(parseOriginalFile({ contentType, size: 1000 })).toEqual({
    ok: true,
    contentType,
    size: 1000,
  });
});

test.each([
  ["SVG", "image/svg+xml"],
  ["大文字の形式", "IMAGE/PNG"],
  ["付加情報の付いた形式", "image/png; charset=utf-8"],
  ["空文字", ""],
])("%s は content_type_not_allowed になる", (_, contentType) => {
  expect(parseOriginalFile({ contentType, size: 1000 })).toEqual({
    ok: false,
    reason: "content_type_not_allowed",
  });
});

test("1 バイトは受け入れる", () => {
  expect(parseOriginalFile({ contentType: "image/png", size: 1 })).toEqual({
    ok: true,
    contentType: "image/png",
    size: 1,
  });
});

test.each([
  ["0 バイト", 0],
  ["負の数", -1],
  ["小数", 1.5],
  ["NaN", Number.NaN],
])("%s は size_invalid になる", (_, size) => {
  expect(parseOriginalFile({ contentType: "image/png", size })).toEqual({
    ok: false,
    reason: "size_invalid",
  });
});

test("上限ちょうどのサイズは受け入れる", () => {
  expect(
    parseOriginalFile({
      contentType: "image/png",
      size: ORIGINAL_FILE_MAX_SIZE,
    }),
  ).toEqual({
    ok: true,
    contentType: "image/png",
    size: ORIGINAL_FILE_MAX_SIZE,
  });
});

test("上限を 1 バイト超えると file_too_large になる", () => {
  expect(
    parseOriginalFile({
      contentType: "image/png",
      size: ORIGINAL_FILE_MAX_SIZE + 1,
    }),
  ).toEqual({ ok: false, reason: "file_too_large" });
});

test("形式とサイズの両方がだめなときは形式の理由を返す", () => {
  expect(parseOriginalFile({ contentType: "image/svg+xml", size: 0 })).toEqual({
    ok: false,
    reason: "content_type_not_allowed",
  });
});
