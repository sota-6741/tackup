import type { Role } from "@/modules/board/domain/board-member";
import { hasRole } from "@/modules/board/domain/board-member";
import type { BoardRepository } from "@/modules/board/domain/board-repository";
import { ForbiddenError, NotFoundError } from "@/shared/domain/errors";

type Deps = { boardRepository: BoardRepository };

export type AssertBoardAccessInput = {
  boardId: string;
  userId: string;
  roles: readonly Role[];
};

/**
 * 掲示板に所属していない場合は、掲示板の存在を知られないよう ForbiddenError ではなく NotFoundError を投げる。
 * 存在しない掲示板の場合も同じく NotFoundError になる。
 */
export function makeAssertBoardAccess({ boardRepository }: Deps) {
  return async function assertBoardAccess({
    boardId,
    userId,
    roles,
  }: AssertBoardAccessInput): Promise<void> {
    const member = await boardRepository.findMember(boardId, userId);
    if (!member) {
      throw new NotFoundError("掲示板が見つかりません");
    }
    if (!hasRole(member, roles)) {
      throw new ForbiddenError("この操作を行う権限がありません");
    }
  };
}
