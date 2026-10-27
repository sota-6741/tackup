import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "@/modules/board/application/check-board-access";
import { ROLES } from "@/modules/board/domain/board-member";
import type { BoardRepository } from "@/modules/board/domain/board-repository";
import {
  type OriginalContentType,
  parseOriginalFile,
} from "@/modules/post/domain/original-file";
import {
  BOARD_FILE_MAX_TOTAL_SIZE,
  BOARD_POST_MAX_COUNT,
  type Post,
  type PostTitleError,
  type PublishPeriodError,
  parsePostDescription,
  parsePostExternalUrl,
  parsePostTitle,
  parsePublishPeriod,
} from "@/modules/post/domain/post";
import type { PostRepository } from "@/modules/post/domain/post-repository";
import {
  parseThumbnailFile,
  parseThumbnailSize,
} from "@/modules/post/domain/thumbnail";
import { isUploadKeyOf, postFileKeys } from "@/modules/post/domain/upload-key";
import type { FileStorage } from "@/shared/domain/file-storage";
import type { UnitOfWork } from "@/shared/domain/unit-of-work";
import { verifyUploadedFile } from "./verify-uploaded-file";

type Deps = {
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  fileStorage: FileStorage;
  unitOfWork: UnitOfWork<{
    boardRepository: BoardRepository;
    postRepository: PostRepository;
  }>;
  generatePostId: () => string;
  generatePublicId: () => string;
};

export type RegisterPostInput = {
  boardId: string;
  userId: string;
  title: string;
  /** 空なら、説明文なし。 */
  description: string;
  /** 空なら、外部リンクなし。 */
  externalUrl: string;
  publishFrom: Date;
  expiresAt: Date | null;
  originalKey: string;
  thumbnailKey: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
};

export type RegisterPostResult =
  | { ok: true; post: Post }
  | {
      ok: false;
      reason:
        | "board_not_found"
        | "forbidden"
        | PostTitleError
        | PublishPeriodError
        | "description_too_long"
        | "external_url_invalid"
        | "file_invalid"
        | "post_limit_exceeded"
        | "storage_limit_exceeded";
    };

export function makeRegisterPost({
  checkBoardAccess,
  fileStorage,
  unitOfWork,
  generatePostId,
  generatePublicId,
}: Deps) {
  async function deleteAll(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => fileStorage.delete(key)));
  }

  return async function registerPost({
    boardId,
    userId,
    title,
    description,
    externalUrl,
    publishFrom,
    expiresAt,
    originalKey,
    thumbnailKey,
    thumbnailWidth,
    thumbnailHeight,
  }: RegisterPostInput): Promise<RegisterPostResult> {
    const access = await checkBoardAccess({ boardId, userId, roles: ROLES });
    if (!access.ok) return access;

    const postTitle = parsePostTitle(title);
    if (!postTitle.ok) return postTitle;
    const postDescription = parsePostDescription(description);
    if (!postDescription.ok) return postDescription;
    const postExternalUrl = parsePostExternalUrl(externalUrl);
    if (!postExternalUrl.ok) return postExternalUrl;
    const period = parsePublishPeriod({ publishFrom, expiresAt });
    if (!period.ok) return period;

    const thumbnailSize = parseThumbnailSize({
      width: thumbnailWidth,
      height: thumbnailHeight,
    });
    const pendingKeys = [originalKey, thumbnailKey];
    if (
      !thumbnailSize.ok ||
      originalKey === thumbnailKey ||
      !pendingKeys.every((key) => isUploadKeyOf({ key, boardId, userId }))
    ) {
      return { ok: false, reason: "file_invalid" };
    }

    const [original, thumbnail] = await Promise.all([
      verifyUploadedFile<OriginalContentType>({
        fileStorage,
        key: originalKey,
        parse: parseOriginalFile,
      }),
      verifyUploadedFile({
        fileStorage,
        key: thumbnailKey,
        parse: parseThumbnailFile,
      }),
    ]);
    if (!original || !thumbnail) {
      await deleteAll(pendingKeys);
      return { ok: false, reason: "file_invalid" };
    }

    const postId = generatePostId();
    const keys = postFileKeys({ boardId, postId });
    // 途中で失敗したら、正式な場所に置いたファイルを消す。Post から参照されないファイルを残さないため。
    const finalKeys = [keys.originalKey, keys.thumbnailKey];
    try {
      for (const { from, to, generation } of [
        {
          from: originalKey,
          to: keys.originalKey,
          generation: original.generation,
        },
        {
          from: thumbnailKey,
          to: keys.thumbnailKey,
          generation: thumbnail.generation,
        },
      ]) {
        const moved = await fileStorage.move({ from, to, generation });
        if (!moved) {
          await deleteAll([...pendingKeys, ...finalKeys]);
          return { ok: false, reason: "file_invalid" };
        }
      }

      const result = await unitOfWork.run<RegisterPostResult>(
        async ({ boardRepository, postRepository }) => {
          const board = await boardRepository.lockById(boardId);
          if (!board) return { ok: false, reason: "board_not_found" };

          const count = await postRepository.countActiveByBoardId(boardId);
          if (count >= BOARD_POST_MAX_COUNT) {
            return { ok: false, reason: "post_limit_exceeded" };
          }
          const used = await postRepository.sumFileSizeByBoardId(boardId);
          if (
            used + original.size + thumbnail.size >
            BOARD_FILE_MAX_TOTAL_SIZE
          ) {
            return { ok: false, reason: "storage_limit_exceeded" };
          }

          const post = await postRepository.create({
            id: postId,
            publicId: generatePublicId(),
            boardId,
            title: postTitle.title,
            description: postDescription.description,
            externalUrl: postExternalUrl.externalUrl,
            originalKey: keys.originalKey,
            originalContentType: original.contentType,
            originalSize: original.size,
            thumbnailKey: keys.thumbnailKey,
            thumbnailSize: thumbnail.size,
            thumbnailWidth: thumbnailSize.width,
            thumbnailHeight: thumbnailSize.height,
            publishFrom: period.publishFrom,
            expiresAt: period.expiresAt,
            status: "published",
          });
          return { ok: true, post };
        },
      );
      if (!result.ok) await deleteAll(finalKeys);
      return result;
    } catch (error) {
      await deleteAll(finalKeys).catch(() => {});
      throw error;
    }
  };
}
