import { expect, test } from "vitest";
import type { BoardMember } from "./board-member";
import { hasRole } from "./board-member";

test('adminのメンバーに["admin"]を渡すとtrueを返す', () => {
  const member: BoardMember = {
    boardId: "board-1",
    userId: "user-1",
    role: "admin",
    createdAt: new Date(),
  };

  expect(hasRole(member, ["admin"])).toBe(true);
});

test('posterのメンバーに["admin"]を渡すとfalseを返す', () => {
  const member: BoardMember = {
    boardId: "board-1",
    userId: "user-1",
    role: "poster",
    createdAt: new Date(),
  };

  expect(hasRole(member, ["admin"])).toBe(false);
});
