import { expect, test } from "vitest";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { ValidationError } from "@/shared/domain/errors";
import { makeInMemoryUnitOfWork } from "@/shared/testing/in-memory-unit-of-work";
import { makeCreateBoard } from "./create-board";

function setup() {
  const { repository, boards, inviteTokens } = makeInMemoryBoardRepository();
  const createBoard = makeCreateBoard({
    unitOfWork: makeInMemoryUnitOfWork({ boardRepository: repository }),
    generateInviteToken: () => "test-token",
  });
  return { createBoard, repository, boards, inviteTokens };
}

test("掲示板を作成して返す", async () => {
  const { createBoard, boards } = setup();

  const board = await createBoard({
    name: "  中野のボード  ",
    isPublic: true,
    userId: "user-1",
  });

  expect(board).toMatchObject({ name: "中野のボード", isPublic: true });
  expect(boards).toEqual([board]);
});

test("作成者が admin として登録される", async () => {
  const { createBoard, repository } = setup();

  const board = await createBoard({
    name: "中野のボード",
    isPublic: false,
    userId: "user-1",
  });

  const member = await repository.findMember(board.id, "user-1");
  expect(member?.role).toBe("admin");
});

test("招待リンクが1件発行される", async () => {
  const { createBoard, inviteTokens } = setup();

  const board = await createBoard({
    name: "中野のボード",
    isPublic: false,
    userId: "user-1",
  });

  expect(inviteTokens).toHaveLength(1);
  expect(inviteTokens[0]).toMatchObject({
    boardId: board.id,
    token: "test-token",
  });
});

test("掲示板名が不正なときはエラーになり、何も保存されない", async () => {
  const { createBoard, boards, inviteTokens } = setup();

  await expect(
    createBoard({ name: "   ", isPublic: false, userId: "user-1" }),
  ).rejects.toThrow(ValidationError);
  expect(boards).toHaveLength(0);
  expect(inviteTokens).toHaveLength(0);
});
