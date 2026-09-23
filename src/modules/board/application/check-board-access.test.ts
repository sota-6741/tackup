import { expect, test } from "vitest";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { makeCheckBoardAccess } from "./check-board-access";

async function setup() {
  const { repository, members } = makeInMemoryBoardRepository();
  const checkBoardAccess = makeCheckBoardAccess({
    boardRepository: repository,
  });
  const board = await repository.create({
    name: "中野のボード",
    isPublic: false,
  });
  return { checkBoardAccess, repository, members, board };
}

test("許可されたロールを持つメンバーは ok になる", async () => {
  const { checkBoardAccess, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "admin",
    createdAt: new Date(),
  });

  await expect(
    checkBoardAccess({
      boardId: board.id,
      userId: "user-1",
      roles: ["admin"],
    }),
  ).resolves.toEqual({ ok: true });
});

test("許可されたロールが複数あるとき、いずれかを持てば ok になる", async () => {
  const { checkBoardAccess, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "poster",
    createdAt: new Date(),
  });

  await expect(
    checkBoardAccess({
      boardId: board.id,
      userId: "user-1",
      roles: ["admin", "poster"],
    }),
  ).resolves.toEqual({ ok: true });
});

test("許可されたロールを持たないメンバーは forbidden になる", async () => {
  const { checkBoardAccess, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "poster",
    createdAt: new Date(),
  });

  await expect(
    checkBoardAccess({
      boardId: board.id,
      userId: "user-1",
      roles: ["admin"],
    }),
  ).resolves.toEqual({ ok: false, reason: "forbidden" });
});

test("所属していないユーザーは board_not_found になる", async () => {
  const { checkBoardAccess, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "admin",
    createdAt: new Date(),
  });

  await expect(
    checkBoardAccess({
      boardId: board.id,
      userId: "user-2",
      roles: ["admin"],
    }),
  ).resolves.toEqual({ ok: false, reason: "board_not_found" });
});

test("別の掲示板で admin でも、この掲示板に所属していなければ board_not_found になる", async () => {
  const { checkBoardAccess, repository, members, board } = await setup();
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
    checkBoardAccess({
      boardId: board.id,
      userId: "user-1",
      roles: ["admin"],
    }),
  ).resolves.toEqual({ ok: false, reason: "board_not_found" });
});

test("存在しない掲示板の場合も board_not_found になる", async () => {
  const { checkBoardAccess } = await setup();

  await expect(
    checkBoardAccess({
      boardId: "missing-board",
      userId: "user-1",
      roles: ["admin", "poster"],
    }),
  ).resolves.toEqual({ ok: false, reason: "board_not_found" });
});
