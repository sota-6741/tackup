import "client-only";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { CreateThumbnailResult } from "@/modules/post/domain/thumbnail";
import { loadPdfjs, PDF_DOCUMENT_OPTIONS } from "./pdfjs";
import {
  createCanvas,
  encodeThumbnail,
  THUMBNAIL_LONG_SIDE,
} from "./thumbnail-canvas";

/** PDF は拡大しても粗くならないので、小さいページも長辺が 800px になるよう拡大する。 */
async function renderFirstPage(
  pdf: PDFDocumentProxy,
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(1);
  const size = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({
    scale: THUMBNAIL_LONG_SIDE / Math.max(size.width, size.height),
  });
  const canvas = createCanvas({
    width: viewport.width,
    height: viewport.height,
  });
  await page.render({ canvas, viewport }).promise;
  return canvas;
}

/** PDF として開けても 1 ページ目が壊れていると、pdf.js は UnknownErrorException を投げる。このクラスは公開されていないので、名前で見分ける。 */
export async function createPdfThumbnail(
  file: File,
): Promise<CreateThumbnailResult> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({
    ...PDF_DOCUMENT_OPTIONS,
    data: await file.arrayBuffer(),
  });

  try {
    const pdf = await loadingTask.promise;
    const canvas = await renderFirstPage(pdf);
    return await encodeThumbnail(canvas);
  } catch (error) {
    if (
      error instanceof pdfjs.InvalidPDFException ||
      error instanceof pdfjs.PasswordException ||
      (error instanceof Error && error.name === "UnknownErrorException")
    ) {
      return { ok: false, reason: "pdf_unreadable" };
    }
    throw error;
  } finally {
    await loadingTask.destroy();
  }
}
