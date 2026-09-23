import type { Board, BoardNameError } from "@/modules/board/domain/board";
import { parseBoardName } from "@/modules/board/domain/board";
import type { BoardRepository } from "@/modules/board/domain/board-repository";
import type { UnitOfWork } from "@/shared/domain/unit-of-work";

export type CreateBoardInput = {
  name: string;
  isPublic: boolean;
  userId: string;
};

export type CreateBoardResult =
  | { ok: true; board: Board }
  | { ok: false; reason: BoardNameError };

type Deps = {
  unitOfWork: UnitOfWork<{ boardRepository: BoardRepository }>;
  generateInviteToken: () => string;
};

export function makeCreateBoard({ unitOfWork, generateInviteToken }: Deps) {
  return async function createBoard({
    name,
    isPublic,
    userId,
  }: CreateBoardInput): Promise<CreateBoardResult> {
    const boardName = parseBoardName(name);
    if (!boardName.ok) return boardName;

    return unitOfWork.run(async ({ boardRepository }) => {
      const board = await boardRepository.create({
        name: boardName.name,
        isPublic,
      });
      await boardRepository.addMember({
        boardId: board.id,
        userId,
        role: "admin",
      });
      await boardRepository.addInviteToken({
        boardId: board.id,
        token: generateInviteToken(),
      });
      return { ok: true, board };
    });
  };
}
