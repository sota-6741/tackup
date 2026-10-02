import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "@/modules/board/application/check-board-access";
import { ROLES } from "@/modules/board/domain/board-member";
import {
  encodePostCursor,
  isRemovable,
  POST_PAGE_SIZE,
  parsePostCursor,
} from "@/modules/post/domain/post";
import {
  type PostDisplayState,
  postDisplayState,
} from "@/modules/post/domain/post-access";
import type { PostRepository } from "@/modules/post/domain/post-repository";
import type { FileStorage } from "@/shared/domain/file-storage";

type Deps = {
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  postRepository: PostRepository;
  fileStorage: FileStorage;
  now: () => Date;
};

export type ListLedgerPostsInput = {
  boardId: string;
  userId: string;
  /** 前のページの `nextCursor`。URL から来る値なので、形が合わなければ最初のページを返す。 */
  cursor?: string;
};

/** 画面に渡す形。内部の ID とストレージのキーは含めない。 */
export type LedgerPostView = {
  publicId: string;
  title: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  publishFrom: Date;
  /** 無期限なら `null`。 */
  expiresAt: Date | null;
  state: PostDisplayState;
  /** 撤去済みでなければ `null`。 */
  removedAt: Date | null;
  canRemove: boolean;
};

export type ListLedgerPostsResult =
  | {
      ok: true;
      posts: LedgerPostView[];
      /** 続きがなければ `null`。 */
      nextCursor: string | null;
      /** 続きのページか。`cursor` の形が合わずに最初のページを返したときは `false`。 */
      isContinuation: boolean;
    }
  | { ok: false; reason: "board_not_found" | "forbidden" };

/** 台帳。掲示板のすべての掲示物を、状態を付けて、掲示開始の新しい順に 1 ページ分返す。 */
export function makeListLedgerPosts({
  checkBoardAccess,
  postRepository,
  fileStorage,
  now,
}: Deps) {
  return async function listLedgerPosts({
    boardId,
    userId,
    cursor,
  }: ListLedgerPostsInput): Promise<ListLedgerPostsResult> {
    const access = await checkBoardAccess({ boardId, userId, roles: ROLES });
    if (!access.ok) return access;

    const current = now();
    const after = (cursor && parsePostCursor(cursor)) || undefined;
    // 続きがあるかを知るために、1 件多く取る。
    const found = await postRepository.findByBoardId({
      boardId,
      limit: POST_PAGE_SIZE + 1,
      after,
    });
    const page = found.slice(0, POST_PAGE_SIZE);
    const last = page.at(-1);

    const posts = await Promise.all(
      page.map(async (post) => ({
        publicId: post.publicId,
        title: post.title,
        thumbnailUrl: await fileStorage.createDownloadUrl(post.thumbnailKey),
        thumbnailWidth: post.thumbnailWidth,
        thumbnailHeight: post.thumbnailHeight,
        publishFrom: post.publishFrom,
        expiresAt: post.expiresAt,
        state: postDisplayState(post, current),
        removedAt: post.removedAt,
        canRemove: isRemovable(post),
      })),
    );
    return {
      ok: true,
      posts,
      nextCursor:
        found.length > POST_PAGE_SIZE && last
          ? encodePostCursor({ publishFrom: last.publishFrom, id: last.id })
          : null,
      isContinuation: after !== undefined,
    };
  };
}
