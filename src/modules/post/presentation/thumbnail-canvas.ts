import "client-only";
import type {
  CreateThumbnailResult,
  ThumbnailContentType,
} from "@/modules/post/domain/thumbnail";

const THUMBNAIL_QUALITY = 0.8;

export function createCanvas({
  width,
  height,
}: {
  width: number;
  height: number;
}): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/** 書き出せない形式を頼むと、ブラウザはエラーにせず PNG を返す。返ってきた `Blob` の種類で確かめる。 */
async function encode(
  canvas: HTMLCanvasElement,
  type: ThumbnailContentType,
): Promise<Blob | null> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, THUMBNAIL_QUALITY),
  );
  if (!blob) throw new Error("canvas を画像にできませんでした");
  return blob.type === type ? blob : null;
}

/** JPEG は透明を持てず、透明な部分が黒になるので、白い背景に重ねる。 */
export function flattenOnWhite(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = createCanvas({ width: source.width, height: source.height });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas を使えません");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0);
  return canvas;
}

export async function encodeAsJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await encode(flattenOnWhite(canvas), "image/jpeg");
  if (!blob) throw new Error("canvas を JPEG にできませんでした");
  return blob;
}

/** WebP で書き出す。WebP に書き出せないブラウザでは JPEG にする。 */
export async function encodeThumbnail(
  canvas: HTMLCanvasElement,
): Promise<CreateThumbnailResult> {
  const { width, height } = canvas;
  const webp = await encode(canvas, "image/webp");
  if (webp) {
    return { ok: true, blob: webp, contentType: "image/webp", width, height };
  }
  const jpeg = await encodeAsJpeg(canvas);
  return { ok: true, blob: jpeg, contentType: "image/jpeg", width, height };
}
