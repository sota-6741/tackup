import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "@/modules/board/application/check-board-access";
import { ROLES } from "@/modules/board/domain/board-member";
import {
  type OriginalFileError,
  parseOriginalFile,
} from "@/modules/post/domain/original-file";
import type { FileStorage } from "@/shared/domain/file-storage";

type Deps = {
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  fileStorage: FileStorage;
  generateUploadKey: () => string;
};

export type CreateOriginalUploadUrlInput = {
  boardId: string;
  userId: string;
  contentType: string;
  size: number;
};

export type CreateOriginalUploadUrlResult =
  | {
      ok: true;
      uploadUrl: string;
      uploadHeaders: Record<string, string>;
      key: string;
    }
  | { ok: false; reason: "board_not_found" | "forbidden" | OriginalFileError };

export function makeCreateOriginalUploadUrl({
  checkBoardAccess,
  fileStorage,
  generateUploadKey,
}: Deps) {
  return async function createOriginalUploadUrl({
    boardId,
    userId,
    contentType,
    size,
  }: CreateOriginalUploadUrlInput): Promise<CreateOriginalUploadUrlResult> {
    const access = await checkBoardAccess({ boardId, userId, roles: ROLES });
    if (!access.ok) return access;

    const file = parseOriginalFile({ contentType, size });
    if (!file.ok) return file;

    const key = generateUploadKey();
    const { url, headers } = await fileStorage.createUploadUrl({
      key,
      contentType: file.contentType,
      size: file.size,
    });
    return { ok: true, uploadUrl: url, uploadHeaders: headers, key };
  };
}
