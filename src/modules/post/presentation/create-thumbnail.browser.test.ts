import { describe, expect, test } from "vitest";
import { THUMBNAIL_MAX_SIZE } from "@/modules/post/domain/thumbnail";
import {
  makeImageFile,
  makeNoiseJpeg,
  makePdfFile,
} from "@/modules/post/testing/original-files";
import { createThumbnail } from "./create-thumbnail";

const LARGE_FILE_TIMEOUT_MS = 30_000;

async function expectThumbnailOf(
  result: Awaited<ReturnType<typeof createThumbnail>>,
  { width, height }: { width: number; height: number },
) {
  if (!result.ok) throw new Error(`サムネイルを作れなかった: ${result.reason}`);
  expect(result.width).toBe(width);
  expect(result.height).toBe(height);
  expect(result.contentType).toBe("image/webp");
  expect(result.blob.type).toBe("image/webp");
  expect(result.blob.size).toBeLessThanOrEqual(THUMBNAIL_MAX_SIZE);

  const bitmap = await createImageBitmap(result.blob);
  expect(bitmap.width).toBe(width);
  expect(bitmap.height).toBe(height);
}

describe("PDF", () => {
  test("1 ページ目を描画して、長辺が 800px のサムネイルを作る", async () => {
    const file = await makePdfFile({ width: 595, height: 842 });

    const result = await createThumbnail({
      file,
      contentType: "application/pdf",
    });

    await expectThumbnailOf(result, { width: 565, height: 800 });
  });

  test("PDF として読めないファイルは pdf_unreadable を返す", async () => {
    const file = new File(["PDF ではない"], "broken.pdf", {
      type: "application/pdf",
    });

    const result = await createThumbnail({
      file,
      contentType: "application/pdf",
    });

    expect(result).toEqual({ ok: false, reason: "pdf_unreadable" });
  });

  test("1 ページ目が壊れている PDF は pdf_unreadable を返す", async () => {
    const pdf = await makePdfFile({ width: 595, height: 842 });
    const withoutPage = (await pdf.text()).replace(
      "/Kids [3 0 R]",
      "/Kids [9 0 R]",
    );
    const file = new File([withoutPage], "broken-page.pdf", {
      type: "application/pdf",
    });

    const result = await createThumbnail({
      file,
      contentType: "application/pdf",
    });

    expect(result).toEqual({ ok: false, reason: "pdf_unreadable" });
  });

  test(
    "10MB 程度の PDF から 3 秒以内にサムネイルを作る",
    async () => {
      const jpeg = await makeNoiseJpeg({ width: 1900, height: 1900 });
      const file = await makePdfFile({
        width: 842,
        height: 595,
        jpeg: { blob: jpeg, width: 1900, height: 1900 },
      });
      expect(file.size).toBeGreaterThan(9 * 1024 * 1024);

      const startedAt = performance.now();
      const result = await createThumbnail({
        file,
        contentType: "application/pdf",
      });

      expect(performance.now() - startedAt).toBeLessThan(3000);
      await expectThumbnailOf(result, { width: 800, height: 565 });
    },
    LARGE_FILE_TIMEOUT_MS,
  );
});

describe("画像", () => {
  test.each(["image/jpeg", "image/png", "image/webp"] as const)(
    "%s を長辺が 800px になるよう縮小する",
    async (type) => {
      const file = await makeImageFile({ width: 3000, height: 2000, type });

      const result = await createThumbnail({ file, contentType: type });

      await expectThumbnailOf(result, { width: 800, height: 533 });
    },
  );

  test("長辺が 800px より小さい画像は拡大しない", async () => {
    const file = await makeImageFile({
      width: 400,
      height: 300,
      type: "image/png",
    });

    const result = await createThumbnail({ file, contentType: "image/png" });

    await expectThumbnailOf(result, { width: 400, height: 300 });
  });

  test("画像として読めないファイルは image_unreadable を返す", async () => {
    const file = new File(["画像ではない"], "broken.png", {
      type: "image/png",
    });

    const result = await createThumbnail({ file, contentType: "image/png" });

    expect(result).toEqual({ ok: false, reason: "image_unreadable" });
  });

  test(
    "10MB 程度の画像から 3 秒以内にサムネイルを作る",
    async () => {
      const jpeg = await makeNoiseJpeg({ width: 1900, height: 1900 });
      const file = new File([jpeg], "large.jpg", { type: "image/jpeg" });
      expect(file.size).toBeGreaterThan(9 * 1024 * 1024);

      const startedAt = performance.now();
      const result = await createThumbnail({ file, contentType: "image/jpeg" });

      expect(performance.now() - startedAt).toBeLessThan(3000);
      await expectThumbnailOf(result, { width: 800, height: 800 });
    },
    LARGE_FILE_TIMEOUT_MS,
  );
});
