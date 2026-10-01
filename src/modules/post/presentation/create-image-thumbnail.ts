import type { CreateThumbnailResult } from "@/modules/post/domain/thumbnail";

export async function createImageThumbnail(
  _file: File,
): Promise<CreateThumbnailResult> {
  throw new Error("未実装");
}
