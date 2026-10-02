import { isOpenToPublic } from "@/modules/board/domain/board";
import type { BoardRepository } from "@/modules/board/domain/board-repository";
import type {
  ListPublishedPostsInput,
  PublishedPostsPage,
} from "./list-published-posts";

type Deps = {
  boardRepository: BoardRepository;
  listPublishedPosts: (
    input: ListPublishedPostsInput,
  ) => Promise<PublishedPostsPage>;
};

export type ListPublicBoardPostsInput = {
  inviteToken: string;
  cursor?: string;
};

/**
 * 招待リンクが存在しない・失効している・掲示板が非公開、のどれでも `board_not_found` を返す。
 * 掲示板があるかどうかを、招待リンクを持たない人に知らせないため。
 */
export type ListPublicBoardPostsResult =
  | ({ ok: true; boardName: string } & PublishedPostsPage)
  | { ok: false; reason: "board_not_found" };

/** 一般閲覧者向けの掲示板ボードの一覧。ログインは要らない。表示する掲示物は、メンバー向けと同じ（公開中のものだけ）。 */
export function makeListPublicBoardPosts({
  boardRepository,
  listPublishedPosts,
}: Deps) {
  return async function listPublicBoardPosts({
    inviteToken,
    cursor,
  }: ListPublicBoardPostsInput): Promise<ListPublicBoardPostsResult> {
    const board = await boardRepository.findByActiveInviteToken(inviteToken);
    if (!board || !isOpenToPublic(board)) {
      return { ok: false, reason: "board_not_found" };
    }

    const page = await listPublishedPosts({ boardId: board.id, cursor });
    return { ok: true, boardName: board.name, ...page };
  };
}
