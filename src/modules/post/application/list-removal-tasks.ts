import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "@/modules/board/application/check-board-access";
import { ROLES } from "@/modules/board/domain/board-member";
import {
  encodeRemovalCursor,
  POST_PAGE_SIZE,
  parseRemovalCursor,
} from "@/modules/post/domain/post";
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

export type ListRemovalTasksInput = {
  boardId: string;
  userId: string;
  /** 前のページの `nextCursor`。URL から来る値なので、形が合わなければ最初のページを返す。 */
  cursor?: string;
};

/** 画面に渡す形。内部の ID とストレージのキーは含めない。 */
export type RemovalTaskView = {
  publicId: string;
  title: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  expiresAt: Date;
};

export type ListRemovalTasksResult =
  | {
      ok: true;
      tasks: RemovalTaskView[];
      /** 続きがなければ `null`。 */
      nextCursor: string | null;
      /** 続きのページか。`cursor` の形が合わずに最初のページを返したときは `false`。 */
      isContinuation: boolean;
      /** 期限切れを判定した時刻。期限超過時間は、この時刻から数える。 */
      now: Date;
    }
  | { ok: false; reason: "board_not_found" | "forbidden" };

/** 掲示終了を過ぎたのに、まだ撤去済みになっていない掲示物を、古い順に 1 ページ分返す。 */
export function makeListRemovalTasks({
  checkBoardAccess,
  postRepository,
  fileStorage,
  now,
}: Deps) {
  return async function listRemovalTasks({
    boardId,
    userId,
    cursor,
  }: ListRemovalTasksInput): Promise<ListRemovalTasksResult> {
    const access = await checkBoardAccess({ boardId, userId, roles: ROLES });
    if (!access.ok) return access;

    const current = now();
    const after = (cursor && parseRemovalCursor(cursor)) || undefined;
    // 続きがあるかを知るために、1 件多く取る。
    const found = await postRepository.findExpired({
      boardId,
      now: current,
      limit: POST_PAGE_SIZE + 1,
      after,
    });
    const page = found.slice(0, POST_PAGE_SIZE);
    const last = page.at(-1);

    const tasks = await Promise.all(
      page.map(async (post) => ({
        publicId: post.publicId,
        title: post.title,
        thumbnailUrl: await fileStorage.createDownloadUrl(post.thumbnailKey),
        thumbnailWidth: post.thumbnailWidth,
        thumbnailHeight: post.thumbnailHeight,
        expiresAt: post.expiresAt,
      })),
    );
    return {
      ok: true,
      tasks,
      nextCursor:
        found.length > POST_PAGE_SIZE && last
          ? encodeRemovalCursor({ expiresAt: last.expiresAt, id: last.id })
          : null,
      isContinuation: after !== undefined,
      now: current,
    };
  };
}
