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

export function makeAssertBoardAccess({ boardRepository }: Deps) {
  return async function assertBoardAccess(
    input: AssertBoardAccessInput,
  ): Promise<void> {
    const member = await boardRepository.findMember(
      input.boardId,
      input.userId,
    );
    if (!member) {
      throw new NotFoundError("掲示板が見つかりません");
    }
    if (!hasRole(member, input.roles)) {
      throw new ForbiddenError("この操作を行う権限がありません");
    }
  };
}
