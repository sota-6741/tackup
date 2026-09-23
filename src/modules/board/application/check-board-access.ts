import type { Role } from "@/modules/board/domain/board-member";
import { hasRole } from "@/modules/board/domain/board-member";
import type { BoardRepository } from "@/modules/board/domain/board-repository";

type Deps = { boardRepository: BoardRepository };

export type CheckBoardAccessInput = {
  boardId: string;
  userId: string;
  roles: readonly Role[];
};

/**
 * 掲示板に所属していない場合は、掲示板の存在を知られないよう forbidden ではなく board_not_found を返す。
 * 存在しない掲示板の場合も同じく board_not_found になる。
 */
export type CheckBoardAccessResult =
  | { ok: true }
  | { ok: false; reason: "board_not_found" | "forbidden" };

export function makeCheckBoardAccess({ boardRepository }: Deps) {
  return async function checkBoardAccess({
    boardId,
    userId,
    roles,
  }: CheckBoardAccessInput): Promise<CheckBoardAccessResult> {
    const member = await boardRepository.findMember(boardId, userId);
    if (!member) {
      return { ok: false, reason: "board_not_found" };
    }
    if (!hasRole(member, roles)) {
      return { ok: false, reason: "forbidden" };
    }
    return { ok: true };
  };
}
