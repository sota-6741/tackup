import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "@/modules/board/application/check-board-access";
import { ROLES } from "@/modules/board/domain/board-member";
import {
  type OriginalFileError,
  parseOriginalFile,
} from "@/modules/post/domain/original-file";
import {
  BOARD_FILE_MAX_TOTAL_SIZE,
  BOARD_POST_MAX_COUNT,
} from "@/modules/post/domain/post";
import type { PostRepository } from "@/modules/post/domain/post-repository";
import { parseThumbnailFile } from "@/modules/post/domain/thumbnail";
import type { FileStorage } from "@/shared/domain/file-storage";

type Deps = {
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  fileStorage: FileStorage;
  postRepository: PostRepository;
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
        | "thumbnail_invalid"
        | "post_limit_exceeded"
        | "storage_limit_exceeded";
    };

/** 掲示物の数と容量は、ここではロックせずに確かめる。無駄なアップロードを早く止めるためで、上限を守るのは掲示物の登録（`registerPost`）。 */
export function makeCreateUploadUrls({
  checkBoardAccess,
  fileStorage,
  postRepository,
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

    const count = await postRepository.countActiveByBoardId(boardId);
    if (count >= BOARD_POST_MAX_COUNT) {
      return { ok: false, reason: "post_limit_exceeded" };
    }
    const used = await postRepository.sumFileSizeByBoardId(boardId);
    if (
      used + originalFile.size + thumbnailFile.size >
      BOARD_FILE_MAX_TOTAL_SIZE
    ) {
      return { ok: false, reason: "storage_limit_exceeded" };
    }

    const [originalTarget, thumbnailTarget] = await Promise.all([
      createTarget({ boardId, userId, file: originalFile }),
      createTarget({ boardId, userId, file: thumbnailFile }),
    ]);
    return { ok: true, original: originalTarget, thumbnail: thumbnailTarget };
  };
}
