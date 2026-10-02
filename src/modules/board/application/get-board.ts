import type { Board } from "@/modules/board/domain/board";
import { ROLES, type Role } from "@/modules/board/domain/board-member";
import type { BoardRepository } from "@/modules/board/domain/board-repository";
import { buildInviteUrl } from "@/modules/board/domain/invite-token";
import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "./check-board-access";

type Deps = {
  boardRepository: BoardRepository;
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  appBaseUrl: string;
};

export type GetBoardInput = { boardId: string; userId: string };

/** `inviteUrl` は、非公開の掲示板では招待リンクで閲覧できないため `null` になる。 */
export type GetBoardResult =
  | { ok: true; board: Board; role: Role; inviteUrl: string | null }
  | { ok: false; reason: "board_not_found" | "forbidden" };

export function makeGetBoard({
  boardRepository,
  checkBoardAccess,
  appBaseUrl,
}: Deps) {
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
    const role = access.member.role;
    if (!board.isPublic) {
      return { ok: true, board, role, inviteUrl: null };
    }

    const inviteToken = await boardRepository.findActiveInviteToken(boardId);
    if (!inviteToken) {
      throw new Error(`公開掲示板に有効な招待リンクがありません: ${boardId}`);
    }
    const inviteUrl = buildInviteUrl({
      baseUrl: appBaseUrl,
      token: inviteToken.token,
    });
    return { ok: true, board, role, inviteUrl };
  };
}
