import type { CreateThumbnailResult } from "@/modules/post/domain/thumbnail";

export async function createPdfThumbnail(
  _file: File,
): Promise<CreateThumbnailResult> {
  throw new Error("未実装");
}
