import { checkBoardAccess } from "@/di/board";
import { makeCreateOriginalUploadUrl } from "@/modules/post/application/create-original-upload-url";
import { generateUploadKey } from "@/modules/post/infrastructure/generate-upload-key";
import { fileStorage } from "@/shared/infrastructure/storage";

export const createOriginalUploadUrl = makeCreateOriginalUploadUrl({
  checkBoardAccess,
  fileStorage,
  generateUploadKey,
});
