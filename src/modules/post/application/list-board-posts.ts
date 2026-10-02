import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "@/modules/board/application/check-board-access";
import { ROLES } from "@/modules/board/domain/board-member";
import type {
  ListPublishedPostsInput,
  PublishedPostsPage,
} from "./list-published-posts";

type Deps = {
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  listPublishedPosts: (
    input: ListPublishedPostsInput,
  ) => Promise<PublishedPostsPage>;
};

export type ListBoardPostsInput = {
  boardId: string;
  userId: string;
  cursor?: string;
};

export type ListBoardPostsResult =
  | ({ ok: true } & PublishedPostsPage)
  | { ok: false; reason: "board_not_found" | "forbidden" };

/** メンバー向けの掲示板ボードの一覧。表示する掲示物は、一般閲覧者向けと同じ（公開中のものだけ）。 */
export function makeListBoardPosts({
  checkBoardAccess,
  listPublishedPosts,
}: Deps) {
  return async function listBoardPosts({
    boardId,
    userId,
    cursor,
  }: ListBoardPostsInput): Promise<ListBoardPostsResult> {
    const access = await checkBoardAccess({ boardId, userId, roles: ROLES });
    if (!access.ok) return access;

    const page = await listPublishedPosts({ boardId, cursor });
    return { ok: true, ...page };
  };
}
