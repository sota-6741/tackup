import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "@/modules/board/application/check-board-access";
import { ROLES } from "@/modules/board/domain/board-member";
import {
  type OriginalFileError,
  parseOriginalFile,
} from "@/modules/post/domain/original-file";
import { parseThumbnailFile } from "@/modules/post/domain/thumbnail";
import type { FileStorage } from "@/shared/domain/file-storage";

type Deps = {
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  fileStorage: FileStorage;
  generateUploadKey: (owner: { boardId: string; userId: string }) => string;
};

type DeclaredFile = { contentType: string; size: number };

export type CreateUploadUrlsInput = {
  boardId: string;
  userId: string;
  original: DeclaredFile;
  thumbnail: DeclaredFile;
};

export type UploadTarget = {
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  key: string;
};

export type CreateUploadUrlsResult =
  | { ok: true; original: UploadTarget; thumbnail: UploadTarget }
  | {
      ok: false;
      reason:
        | "board_not_found"
        | "forbidden"
        | OriginalFileError
        | "thumbnail_invalid";
    };

export function makeCreateUploadUrls({
  checkBoardAccess,
  fileStorage,
  generateUploadKey,
}: Deps) {
  async function createTarget({
    boardId,
    userId,
    file,
  }: {
    boardId: string;
    userId: string;
    file: DeclaredFile;
  }): Promise<UploadTarget> {
    const key = generateUploadKey({ boardId, userId });
    const { url, headers } = await fileStorage.createUploadUrl({
      key,
      contentType: file.contentType,
      size: file.size,
    });
    return { uploadUrl: url, uploadHeaders: headers, key };
  }

  return async function createUploadUrls({
    boardId,
    userId,
    original,
    thumbnail,
  }: CreateUploadUrlsInput): Promise<CreateUploadUrlsResult> {
    const access = await checkBoardAccess({ boardId, userId, roles: ROLES });
    if (!access.ok) return access;

    const originalFile = parseOriginalFile(original);
    if (!originalFile.ok) return originalFile;
    const thumbnailFile = parseThumbnailFile(thumbnail);
    if (!thumbnailFile.ok) return thumbnailFile;

    const [originalTarget, thumbnailTarget] = await Promise.all([
      createTarget({ boardId, userId, file: originalFile }),
      createTarget({ boardId, userId, file: thumbnailFile }),
    ]);
    return { ok: true, original: originalTarget, thumbnail: thumbnailTarget };
  };
}
