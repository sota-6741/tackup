import type { Board } from "@/modules/board/domain/board";
import type { BoardRepository } from "@/modules/board/domain/board-repository";

export type FindLandingBoardInput = {
  userId: string;
  lastBoardId?: string;
};

type Deps = {
  boardRepository: BoardRepository;
};

/**
 * lastBoardId は利用者が書き換えられる Cookie の値なので、所属している掲示板の中からだけ選ぶ。
 * 所属していない ID の場合は、所属した日時が最も新しい掲示板を返す。
 */
export function makeFindLandingBoard({ boardRepository }: Deps) {
  return async function findLandingBoard({
    userId,
    lastBoardId,
  }: FindLandingBoardInput): Promise<Board | null> {
    const boards = await boardRepository.findAllByUserId(userId);

    const lastBoard = boards.find((board) => board.id === lastBoardId);
    if (lastBoard) return lastBoard;

    return boards[0] ?? null;
  };
}
