import type { Board } from "./board";
import type { BoardMember, Role } from "./board-member";

export type CreateBoardData = {
  name: string;
  isPublic: boolean;
};

export type AddMemberData = {
  boardId: string;
  userId: string;
  role: Role;
};

export type AddInviteTokenData = {
  boardId: string;
  token: string;
};

export interface BoardRepository {
  create(data: CreateBoardData): Promise<Board>;
  addMember(data: AddMemberData): Promise<void>;
  addInviteToken(data: AddInviteTokenData): Promise<void>;
  findById(boardId: string): Promise<Board | null>;
  /** 掲示板を作った順ではなく、所属した日時（BoardMember.createdAt）の新しい順に返す。 */
  findAllByUserId(userId: string): Promise<Board[]>;
  findMember(boardId: string, userId: string): Promise<BoardMember | null>;
}
