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
  isEditable,
} from "@/modules/post/domain/post";
import type { PostRepository } from "@/modules/post/domain/post-repository";
import { parseThumbnailFile } from "@/modules/post/domain/thumbnail";
import type { FileStorage } from "@/shared/domain/file-storage";
import { createUploadTarget, type UploadTarget } from "./create-upload-urls";

type Deps = {
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  fileStorage: FileStorage;
  postRepository: PostRepository;
  generateUploadKey: (owner: { boardId: string; userId: string }) => string;
};

type DeclaredFile = { contentType: string; size: number };

export type CreateReplacementUploadUrlsInput = {
  publicId: string;
  userId: string;
  original: DeclaredFile;
  thumbnail: DeclaredFile;
};

/** `post_not_found` は、掲示物がない・メンバーでない、のどちらか。掲示物があるかどうかを知らせないため、区別しない。 */
export type CreateReplacementUploadUrlsResult =
  | { ok: true; original: UploadTarget; thumbnail: UploadTarget }
  | {
      ok: false;
      reason:
        | "post_not_found"
        | "post_not_editable"
        | OriginalFileError
        | "thumbnail_invalid"
        | "storage_limit_exceeded";
    };

/**
 * 原本を差し替えるためのアップロード先。差し替えでは掲示物の数は増えないので、数の上限は見ない。
 * 容量は、ここではロックせずに「今の合計 − 今のファイル + 新しいファイル」で確かめる。上限を守るのは差し替え（`replaceOriginal`）。
 */
export function makeCreateReplacementUploadUrls({
  checkBoardAccess,
  fileStorage,
  postRepository,
  generateUploadKey,
}: Deps) {
  return async function createReplacementUploadUrls({
    publicId,
    userId,
    original,
    thumbnail,
  }: CreateReplacementUploadUrlsInput): Promise<CreateReplacementUploadUrlsResult> {
    const post = await postRepository.findByPublicId(publicId);
    if (!post) return { ok: false, reason: "post_not_found" };
    const { boardId } = post;
    const access = await checkBoardAccess({ boardId, userId, roles: ROLES });
    if (!access.ok) return { ok: false, reason: "post_not_found" };
    if (!isEditable(post)) return { ok: false, reason: "post_not_editable" };

    const originalFile = parseOriginalFile(original);
    if (!originalFile.ok) return originalFile;
    const thumbnailFile = parseThumbnailFile(thumbnail);
    if (!thumbnailFile.ok) return thumbnailFile;

    const used = await postRepository.sumFileSizeByBoardId(boardId);
    const current = post.originalSize + post.thumbnailSize;
    if (
      used - current + originalFile.size + thumbnailFile.size >
      BOARD_FILE_MAX_TOTAL_SIZE
    ) {
      return { ok: false, reason: "storage_limit_exceeded" };
    }

    const [originalTarget, thumbnailTarget] = await Promise.all(
      [originalFile, thumbnailFile].map((file) =>
        createUploadTarget({
          fileStorage,
          generateUploadKey,
          boardId,
          userId,
          file,
        }),
      ),
    );
    return { ok: true, original: originalTarget, thumbnail: thumbnailTarget };
  };
}
