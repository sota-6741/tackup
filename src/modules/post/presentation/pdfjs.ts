import "client-only";
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";

const PDFJS_BASE_URL = "/pdfjs/";

/** pdf.js はブラウザでしか動かないので、使うときに読み込む。ファイルは postinstall が public/pdfjs/ に置く。 */
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE_URL}pdf.worker.min.mjs`;
  return pdfjs;
}

/** 日本語など埋め込まれていないフォントの PDF で文字が欠けないよう、CMap と標準フォントの場所を渡す。 */
export const PDF_DOCUMENT_OPTIONS = {
  cMapUrl: `${PDFJS_BASE_URL}cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${PDFJS_BASE_URL}standard_fonts/`,
  wasmUrl: `${PDFJS_BASE_URL}wasm/`,
  iccUrl: `${PDFJS_BASE_URL}iccs/`,
} satisfies DocumentInitParameters;
