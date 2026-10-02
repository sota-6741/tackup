import "client-only";
import type { CreateThumbnailResult } from "@/modules/post/domain/thumbnail";
import {
  createCanvas,
  encodeThumbnail,
  THUMBNAIL_LONG_SIDE,
} from "./thumbnail-canvas";

async function drawScaled(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    THUMBNAIL_LONG_SIDE / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = createCanvas({
    width: bitmap.width * scale,
    height: bitmap.height * scale,
  });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas を使えません");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export async function createImageThumbnail(
  file: File,
): Promise<CreateThumbnailResult> {
  try {
    const canvas = await drawScaled(file);
    return await encodeThumbnail(canvas);
  } catch (error) {
    if (error instanceof DOMException && error.name === "InvalidStateError") {
      return { ok: false, reason: "image_unreadable" };
    }
    throw error;
  }
}
