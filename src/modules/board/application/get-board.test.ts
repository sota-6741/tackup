import { expect, test } from "vitest";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { makeCheckBoardAccess } from "./check-board-access";
import { makeGetBoard } from "./get-board";

async function setup() {
  const { repository, members } = makeInMemoryBoardRepository();
  const getBoard = makeGetBoard({
    boardRepository: repository,
    checkBoardAccess: makeCheckBoardAccess({ boardRepository: repository }),
  });
  const board = await repository.create({
    name: "中野のボード",
    isPublic: false,
  });
  return { getBoard, members, board };
}

test("admin のメンバーには掲示板を返す", async () => {
  const { getBoard, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "admin",
    createdAt: new Date(),
  });

  const result = await getBoard({ boardId: board.id, userId: "user-1" });

  expect(result).toEqual({ ok: true, board });
});

test("poster のメンバーにも掲示板を返す", async () => {
  const { getBoard, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "poster",
    createdAt: new Date(),
  });

  const result = await getBoard({ boardId: board.id, userId: "user-1" });

  expect(result).toEqual({ ok: true, board });
});

test("所属していないユーザーは board_not_found になる", async () => {
  const { getBoard, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "admin",
    createdAt: new Date(),
  });

  await expect(
    getBoard({ boardId: board.id, userId: "user-2" }),
  ).resolves.toEqual({ ok: false, reason: "board_not_found" });
});

test("存在しない掲示板は board_not_found になる", async () => {
  const { getBoard } = await setup();

  await expect(
    getBoard({ boardId: "missing-board", userId: "user-1" }),
  ).resolves.toEqual({ ok: false, reason: "board_not_found" });
});
