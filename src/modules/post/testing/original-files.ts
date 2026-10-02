const encoder = new TextEncoder();

export async function makeImageFile({
  width,
  height,
  type,
}: {
  width: number;
  height: number;
  type: "image/jpeg" | "image/png" | "image/webp";
}): Promise<File> {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas を使えません");
  context.fillStyle = "#3b82f6";
  context.fillRect(0, 0, width, height);
  const blob = await canvas.convertToBlob({ type });
  return new File([blob], "image", { type });
}

/** ランダムな色の点で埋めた JPEG。圧縮が効かないので、辺の長さでファイルの大きさを調節できる。 */
export async function makeNoiseJpeg({
  width,
  height,
}: {
  width: number;
  height: number;
}): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas を使えません");
  const image = context.createImageData(width, height);
  for (let i = 0; i < image.data.length; i++) {
    image.data[i] = i % 4 === 3 ? 255 : Math.floor(Math.random() * 256);
  }
  context.putImageData(image, 0, 0);
  return canvas.convertToBlob({ type: "image/jpeg", quality: 1 });
}

/**
 * 1 ページだけの PDF を組み立てる。width・height はポイント（1/72 インチ）。
 * jpeg を渡すと、ページ全体にその画像を描く。渡さなければ四角を 1 つ描く。
 */
export async function makePdfFile({
  width,
  height,
  jpeg,
}: {
  width: number;
  height: number;
  jpeg?: { blob: Blob; width: number; height: number };
}): Promise<File> {
  const content = jpeg
    ? `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`
    : "0 0 1 rg 50 50 200 100 re f";
  const resources = jpeg ? "/XObject << /Im0 5 0 R >>" : "";

  const objects: (string | Uint8Array<ArrayBuffer>)[][] = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << ${resources} >> >>`,
    ],
    [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`],
  ];
  if (jpeg) {
    const bytes = new Uint8Array(await jpeg.blob.arrayBuffer());
    objects.push([
      `<< /Type /XObject /Subtype /Image /Width ${jpeg.width} /Height ${jpeg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,
      bytes,
      "\nendstream",
    ]);
  }

  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  const write = (part: string | Uint8Array<ArrayBuffer>) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    offset += bytes.length;
  };

  write("%PDF-1.7\n");
  const offsets = objects.map((parts, index) => {
    const start = offset;
    write(`${index + 1} 0 obj\n`);
    for (const part of parts) write(part);
    write("\nendobj\n");
    return start;
  });
  const xrefStart = offset;
  write(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const start of offsets) {
    write(`${String(start).padStart(10, "0")} 00000 n \n`);
  }
  write(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );

  return new File(chunks, "original.pdf", { type: "application/pdf" });
}
