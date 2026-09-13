export const ROLES = ["admin", "poster"] as const;
export type Role = (typeof ROLES)[number];

export type BoardMember = {
  boardId: string;
  userId: string;
  role: Role;
  createdAt: Date;
};

export function hasRole(member: BoardMember, roles: readonly Role[]): boolean {
  return roles.includes(member.role);
}
