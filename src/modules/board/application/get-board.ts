import type { Board } from "@/modules/board/domain/board";
import { ROLES } from "@/modules/board/domain/board-member";
import type { BoardRepository } from "@/modules/board/domain/board-repository";
import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "./check-board-access";

type Deps = {
  boardRepository: BoardRepository;
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
};

export type GetBoardInput = { boardId: string; userId: string };

export type GetBoardResult =
  | { ok: true; board: Board }
  | { ok: false; reason: "board_not_found" | "forbidden" };

export function makeGetBoard({ boardRepository, checkBoardAccess }: Deps) {
  return async function getBoard({
    boardId,
    userId,
  }: GetBoardInput): Promise<GetBoardResult> {
    const access = await checkBoardAccess({ boardId, userId, roles: ROLES });
    if (!access.ok) return access;

    const board = await boardRepository.findById(boardId);
    if (!board) {
      return { ok: false, reason: "board_not_found" };
    }
    return { ok: true, board };
  };
}
