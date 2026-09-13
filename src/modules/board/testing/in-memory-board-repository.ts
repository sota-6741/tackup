import type { Board } from "@/modules/board/domain/board";
import type { BoardMember } from "@/modules/board/domain/board-member";
import type {
  AddInviteTokenData,
  AddMemberData,
  BoardRepository,
  CreateBoardData,
} from "@/modules/board/domain/board-repository";
import type { InviteToken } from "@/modules/board/domain/invite-token";

export function makeInMemoryBoardRepository() {
  const boards: Board[] = [];
  const members: BoardMember[] = [];
  const inviteTokens: InviteToken[] = [];

  async function create(data: CreateBoardData): Promise<Board> {
    const now = new Date();
    const board: Board = {
      id: `board-${boards.length + 1}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    boards.push(board);
    return board;
  }

  async function addMember(data: AddMemberData): Promise<void> {
    members.push({ ...data, createdAt: new Date() });
  }

  async function addInviteToken(data: AddInviteTokenData): Promise<void> {
    inviteTokens.push({
      id: `invite-token-${inviteTokens.length + 1}`,
      ...data,
      revokedAt: null,
      createdAt: new Date(),
    });
  }

  async function findById(boardId: string): Promise<Board | null> {
    return boards.find((board) => board.id === boardId) ?? null;
  }

  async function findFirstByUserId(userId: string): Promise<Board | null> {
    const [first] = members
      .filter((member) => member.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (!first) return null;
    return findById(first.boardId);
  }

  async function findMember(
    boardId: string,
    userId: string,
  ): Promise<BoardMember | null> {
    return (
      members.find(
        (member) => member.boardId === boardId && member.userId === userId,
      ) ?? null
    );
  }

  const repository: BoardRepository = {
    create,
    addMember,
    addInviteToken,
    findById,
    findFirstByUserId,
    findMember,
  };

  return { repository, boards, members, inviteTokens };
}
