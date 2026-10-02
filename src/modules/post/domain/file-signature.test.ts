import { expect, test } from "vitest";
import { detectContentType, FILE_SIGNATURE_LENGTH } from "./file-signature";

function bytes(...values: (number | string)[]): Uint8Array {
  return Uint8Array.from(
    values.flatMap((value) =>
      typeof value === "string"
        ? [...value].map((char) => char.charCodeAt(0))
        : [value],
    ),
  );
}

test.each([
  ["application/pdf", bytes("%PDF-1.7\n%")],
  ["image/jpeg", bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, "JFIF")],
  ["image/png", bytes(0x89, "PNG\r\n", 0x1a, "\n", 0, 0, 0, 0x0d)],
  ["image/webp", bytes("RIFF", 0x24, 0, 0, 0, "WEBP")],
])("%s の先頭のバイトを見分ける", (contentType, head) => {
  expect(head.length).toBeLessThanOrEqual(FILE_SIGNATURE_LENGTH);
  expect(detectContentType(head)).toBe(contentType);
});

test.each([
  ["SVG", bytes("<svg xmlns=")],
  ["HTML", bytes("<!doctype ht")],
  ["WebP ではない RIFF（WAV）", bytes("RIFF", 0x24, 0, 0, 0, "WAVE")],
  ["先頭に空白のある PDF", bytes(" %PDF-1.7")],
  ["形式を見分けるには短すぎるバイト", bytes("RIFF")],
  ["空", bytes()],
])("%s は null になる", (_, head) => {
  expect(detectContentType(head)).toBeNull();
});
