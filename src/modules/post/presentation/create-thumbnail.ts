import type { OriginalContentType } from "@/modules/post/domain/original-file";
import type { CreateThumbnailResult } from "@/modules/post/domain/thumbnail";
import { createImageThumbnail } from "./create-image-thumbnail";
import { createPdfThumbnail } from "./create-pdf-thumbnail";

export function createThumbnail({
  file,
  contentType,
}: {
  file: File;
  contentType: OriginalContentType;
}): Promise<CreateThumbnailResult> {
  if (contentType === "application/pdf") return createPdfThumbnail(file);
  return createImageThumbnail(file);
}
