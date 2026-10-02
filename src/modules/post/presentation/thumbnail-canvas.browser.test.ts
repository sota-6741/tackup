import { expect, test } from "vitest";
import { createCanvas, encodeAsJpeg } from "./thumbnail-canvas";

async function pixelAt(blob: Blob, { x, y }: { x: number; y: number }) {
  const bitmap = await createImageBitmap(blob);
  const canvas = createCanvas({ width: bitmap.width, height: bitmap.height });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas を使えません");
  context.drawImage(bitmap, 0, 0);
  return [...context.getImageData(x, y, 1, 1).data];
}

test("JPEG に書き出すと、透明な部分は白になり、描いた部分は残る", async () => {
  const canvas = createCanvas({ width: 20, height: 10 });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas を使えません");
  context.fillStyle = "#000";
  context.fillRect(10, 0, 10, 10);

  const blob = await encodeAsJpeg(canvas);

  expect(blob.type).toBe("image/jpeg");
  const [whiteRed, whiteGreen, whiteBlue] = await pixelAt(blob, { x: 2, y: 5 });
  expect(Math.min(whiteRed, whiteGreen, whiteBlue)).toBeGreaterThan(240);
  const [blackRed, blackGreen, blackBlue] = await pixelAt(blob, {
    x: 17,
    y: 5,
  });
  expect(Math.max(blackRed, blackGreen, blackBlue)).toBeLessThan(15);
});
