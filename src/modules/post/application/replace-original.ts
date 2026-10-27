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
  isEditable,
} from "@/modules/post/domain/post";
import type { PostRepository } from "@/modules/post/domain/post-repository";
import {
  parseThumbnailFile,
  parseThumbnailSize,
} from "@/modules/post/domain/thumbnail";
import { isUploadKeyOf, postFileKeys } from "@/modules/post/domain/upload-key";
import type { FileStorage } from "@/shared/domain/file-storage";
import type { Logger } from "@/shared/domain/logger";
import type { UnitOfWork } from "@/shared/domain/unit-of-work";
import { verifyUploadedFile } from "./verify-uploaded-file";

type Deps = {
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  fileStorage: FileStorage;
  postRepository: PostRepository;
  unitOfWork: UnitOfWork<{
    boardRepository: BoardRepository;
    postRepository: PostRepository;
  }>;
  generateRevision: () => string;
  logger: Logger;
};

export type ReplaceOriginalInput = {
  publicId: string;
  userId: string;
  originalKey: string;
  thumbnailKey: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
};

/** `post_not_found` は、掲示物がない・メンバーでない、のどちらか。掲示物があるかどうかを知らせないため、区別しない。 */
export type ReplaceOriginalResult =
  | { ok: true; boardId: string }
  | {
      ok: false;
      reason:
        | "post_not_found"
        | "post_not_editable"
        | "file_invalid"
        | "storage_limit_exceeded";
    };

type ReplaceFilesResult =
  | { ok: true; previousKeys: string[] }
  | Extract<ReplaceOriginalResult, { ok: false }>;

/**
 * 原本とサムネイルを差し替える。新しいファイルは今のファイルと別のキーに移し、DB を書き換えたあとで今のファイルを消す。
 * 途中で失敗しても、掲示物は今のファイルを指したままになる。
 */
export function makeReplaceOriginal({
  checkBoardAccess,
  fileStorage,
  postRepository,
  unitOfWork,
  generateRevision,
  logger,
}: Deps) {
  async function deleteAll(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => fileStorage.delete(key)));
  }

  /**
   * どこからも参照されないファイルを消す。消せなくても差し替えの結果は変えず、残ったキーをログに出す。
   * 消し直す仕組みはまだないので、ログを見て手で消す。
   */
  async function deleteUnreferenced(keys: string[]): Promise<void> {
    await deleteAll(keys).catch((error: unknown) => {
      logger.error("参照されないファイルを消せませんでした", {
        error,
        fields: { operation: "replaceOriginal", keys },
      });
    });
  }

  return async function replaceOriginal({
    publicId,
    userId,
    originalKey,
    thumbnailKey,
    thumbnailWidth,
    thumbnailHeight,
  }: ReplaceOriginalInput): Promise<ReplaceOriginalResult> {
    const post = await postRepository.findByPublicId(publicId);
    if (!post) return { ok: false, reason: "post_not_found" };
    const { boardId } = post;
    const access = await checkBoardAccess({ boardId, userId, roles: ROLES });
    if (!access.ok) return { ok: false, reason: "post_not_found" };
    if (!isEditable(post)) return { ok: false, reason: "post_not_editable" };

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

    const keys = postFileKeys({
      boardId,
      postId: post.id,
      revision: generateRevision(),
    });
    // 途中で失敗したら、新しく置いたファイルを消す。掲示物から参照されないファイルを残さないため。
    const newKeys = [keys.originalKey, keys.thumbnailKey];
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
          await deleteAll([...pendingKeys, ...newKeys]);
          return { ok: false, reason: "file_invalid" };
        }
      }

      const result = await unitOfWork.run<ReplaceFilesResult>(
        async ({ boardRepository, postRepository }) => {
          const board = await boardRepository.lockById(boardId);
          if (!board) return { ok: false, reason: "post_not_found" };

          // ロックを取ったあとで読み直す。同時に差し替えられていても、消すのは今の掲示物が指すファイルになる。
          const current = await postRepository.findByPublicId(publicId);
          if (!current) return { ok: false, reason: "post_not_found" };
          if (!isEditable(current)) {
            return { ok: false, reason: "post_not_editable" };
          }
          const used = await postRepository.sumFileSizeByBoardId(boardId);
          if (
            used -
              current.originalSize -
              current.thumbnailSize +
              original.size +
              thumbnail.size >
            BOARD_FILE_MAX_TOTAL_SIZE
          ) {
            return { ok: false, reason: "storage_limit_exceeded" };
          }

          const previousKeys = [current.originalKey, current.thumbnailKey];
          const replaced = await postRepository.replaceFiles({
            id: current.id,
            originalKey: keys.originalKey,
            originalContentType: original.contentType,
            originalSize: original.size,
            thumbnailKey: keys.thumbnailKey,
            thumbnailSize: thumbnail.size,
            thumbnailWidth: thumbnailSize.width,
            thumbnailHeight: thumbnailSize.height,
          });
          if (!replaced) return { ok: false, reason: "post_not_editable" };
          return { ok: true, previousKeys };
        },
      );
      if (!result.ok) {
        await deleteUnreferenced(newKeys);
        return result;
      }
      // 掲示物はもう新しいファイルを指しているので、消すのに失敗しても差し替えは成功として扱う。
      await deleteUnreferenced(result.previousKeys);
      return { ok: true, boardId };
    } catch (error) {
      await deleteUnreferenced(newKeys);
      throw error;
    }
  };
}
