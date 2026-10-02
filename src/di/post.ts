import "server-only";
import { checkBoardAccess } from "@/di/board";
import { makeCreateUploadUrls } from "@/modules/post/application/create-upload-urls";
import { generateUploadKey } from "@/modules/post/infrastructure/generate-upload-key";
import { fileStorage } from "@/shared/infrastructure/storage";

export const createUploadUrls = makeCreateUploadUrls({
  checkBoardAccess,
  fileStorage,
  generateUploadKey,
});
