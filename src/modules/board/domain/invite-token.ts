export type InviteToken = {
  id: string;
  boardId: string;
  token: string;
  revokedAt: Date | null;
  createdAt: Date;
};
