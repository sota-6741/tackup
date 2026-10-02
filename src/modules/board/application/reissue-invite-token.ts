import type { BoardRepository } from "@/modules/board/domain/board-repository";
import { buildInviteUrl } from "@/modules/board/domain/invite-token";
import type { UnitOfWork } from "@/shared/domain/unit-of-work";
import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "./check-board-access";

type Deps = {
  unitOfWork: UnitOfWork<{ boardRepository: BoardRepository }>;
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  generateInviteToken: () => string;
  appBaseUrl: string;
};

export type ReissueInviteTokenInput = { boardId: string; userId: string };

export type ReissueInviteTokenResult =
  | { ok: true; inviteUrl: string }
  | {
      ok: false;
      reason: "board_not_found" | "forbidden" | "board_not_public";
    };

/**
 * 再発行できるのは公開掲示板だけ。非公開の掲示板の以前のリンクを無効にしたいときは、公開に戻してから再発行する。
 * 同時に再発行されると、後の方は有効な招待リンクの一意の索引に違反して想定外のエラーになる。
 */
export function makeReissueInviteToken({
  unitOfWork,
  checkBoardAccess,
  generateInviteToken,
  appBaseUrl,
}: Deps) {
  return async function reissueInviteToken({
    boardId,
    userId,
  }: ReissueInviteTokenInput): Promise<ReissueInviteTokenResult> {
    const access = await checkBoardAccess({
      boardId,
      userId,
      roles: ["admin"],
    });
    if (!access.ok) return access;

    const token = generateInviteToken();
    return unitOfWork.run(async ({ boardRepository }) => {
      const board = await boardRepository.findById(boardId);
      if (!board) return { ok: false, reason: "board_not_found" };
      if (!board.isPublic) return { ok: false, reason: "board_not_public" };

      // 有効な招待リンクは掲示板ごとに1つまで（一意の索引）なので、失効させてから追加する。
      await boardRepository.revokeActiveInviteToken(boardId);
      await boardRepository.addInviteToken({ boardId, token });
      return {
        ok: true,
        inviteUrl: buildInviteUrl({ baseUrl: appBaseUrl, token }),
      };
    });
  };
}
