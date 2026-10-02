import { randomUUID } from "node:crypto";
import { uploadKeyPrefix } from "@/modules/post/domain/upload-key";

export function generateUploadKey({
  boardId,
  userId,
}: {
  boardId: string;
  userId: string;
}): string {
  return `${uploadKeyPrefix({ boardId, userId })}${randomUUID()}`;
}
