import type { Board } from "@/modules/board/domain/board";
import { ROLES } from "@/modules/board/domain/board-member";
import type { BoardRepository } from "@/modules/board/domain/board-repository";
import { NotFoundError } from "@/shared/domain/errors";
import type { AssertBoardAccessInput } from "./assert-board-access";

type Deps = {
  boardRepository: BoardRepository;
  assertBoardAccess: (input: AssertBoardAccessInput) => Promise<void>;
};

export type GetBoardInput = { boardId: string; userId: string };

export function makeGetBoard({ boardRepository, assertBoardAccess }: Deps) {
  return async function getBoard({
    boardId,
    userId,
  }: GetBoardInput): Promise<Board> {
    await assertBoardAccess({ boardId, userId, roles: ROLES });

    const board = await boardRepository.findById(boardId);
    if (!board) {
      throw new NotFoundError("掲示板が見つかりません");
    }
    return board;
  };
}
