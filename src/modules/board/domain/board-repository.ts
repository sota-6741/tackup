import type { Board } from "./board";
import type { BoardMember } from "./board-member";

export type CreateBoardData = {
  name: string;
  isPublic: boolean;
  ownerId: string;
  inviteToken: string;
};

export interface BoardRepository {
  create(data: CreateBoardData): Promise<Board>;
  findById(boardId: string): Promise<Board | null>;
  findFirstByUserId(userId: string): Promise<Board | null>;
  findMember(boardId: string, userId: string): Promise<BoardMember | null>;
}
