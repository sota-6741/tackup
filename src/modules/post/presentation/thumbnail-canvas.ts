import "client-only";
import type { CreateThumbnailResult } from "@/modules/post/domain/thumbnail";

export const THUMBNAIL_LONG_SIDE = 800;
const THUMBNAIL_TYPE = "image/webp";
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

export async function encodeThumbnail(
  canvas: HTMLCanvasElement,
): Promise<CreateThumbnailResult> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, THUMBNAIL_TYPE, THUMBNAIL_QUALITY),
  );
  if (!blob) throw new Error("canvas を画像にできませんでした");
  return { ok: true, blob, width: canvas.width, height: canvas.height };
}
