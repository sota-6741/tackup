import { expect, test } from "vitest";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { ForbiddenError, NotFoundError } from "@/shared/domain/errors";
import { makeAssertBoardAccess } from "./assert-board-access";

async function setup() {
  const { repository, members } = makeInMemoryBoardRepository();
  const assertBoardAccess = makeAssertBoardAccess({
    boardRepository: repository,
  });
  const board = await repository.create({
    name: "中野のボード",
    isPublic: false,
  });
  return { assertBoardAccess, repository, members, board };
}

test("許可されたロールを持つメンバーはエラーにならない", async () => {
  const { assertBoardAccess, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "admin",
    createdAt: new Date(),
  });

  await expect(
    assertBoardAccess({
      boardId: board.id,
      userId: "user-1",
      roles: ["admin"],
    }),
  ).resolves.toBeUndefined();
});

test("許可されたロールが複数あるとき、いずれかを持てばエラーにならない", async () => {
  const { assertBoardAccess, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "poster",
    createdAt: new Date(),
  });

  await expect(
    assertBoardAccess({
      boardId: board.id,
      userId: "user-1",
      roles: ["admin", "poster"],
    }),
  ).resolves.toBeUndefined();
});

test("許可されたロールを持たないメンバーは ForbiddenError になる", async () => {
  const { assertBoardAccess, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "poster",
    createdAt: new Date(),
  });

  await expect(
    assertBoardAccess({
      boardId: board.id,
      userId: "user-1",
      roles: ["admin"],
    }),
  ).rejects.toThrow(ForbiddenError);
});

test("所属していないユーザーは NotFoundError になる", async () => {
  const { assertBoardAccess, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "admin",
    createdAt: new Date(),
  });

  await expect(
    assertBoardAccess({
      boardId: board.id,
      userId: "user-2",
      roles: ["admin"],
    }),
  ).rejects.toThrow(NotFoundError);
});

test("別の掲示板で admin でも、この掲示板に所属していなければ NotFoundError になる", async () => {
  const { assertBoardAccess, repository, members, board } = await setup();
  const otherBoard = await repository.create({
    name: "別のボード",
    isPublic: false,
  });
  members.push({
    boardId: otherBoard.id,
    userId: "user-1",
    role: "admin",
    createdAt: new Date(),
  });

  await expect(
    assertBoardAccess({
      boardId: board.id,
      userId: "user-1",
      roles: ["admin"],
    }),
  ).rejects.toThrow(NotFoundError);
});

test("存在しない掲示板の場合も NotFoundError になる", async () => {
  const { assertBoardAccess } = await setup();

  await expect(
    assertBoardAccess({
      boardId: "missing-board",
      userId: "user-1",
      roles: ["admin", "poster"],
    }),
  ).rejects.toThrow(NotFoundError);
});
