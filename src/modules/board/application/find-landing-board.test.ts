import { expect, test } from "vitest";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { makeFindLandingBoard } from "./find-landing-board";

async function setup() {
  const { repository, members } = makeInMemoryBoardRepository();
  const findLandingBoard = makeFindLandingBoard({
    boardRepository: repository,
  });
  const olderBoard = await repository.create({
    name: "古い",
    isPublic: false,
  });
  const newestBoard = await repository.create({
    name: "新しい",
    isPublic: false,
  });
  const otherBoard = await repository.create({
    name: "他人の",
    isPublic: false,
  });
  members.push(
    {
      boardId: olderBoard.id,
      userId: "user-1",
      role: "admin",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
    {
      boardId: newestBoard.id,
      userId: "user-1",
      role: "poster",
      createdAt: new Date("2026-02-01T00:00:00Z"),
    },
    {
      boardId: otherBoard.id,
      userId: "user-2",
      role: "admin",
      createdAt: new Date("2026-03-01T00:00:00Z"),
    },
  );
  return { findLandingBoard, olderBoard, newestBoard, otherBoard };
}

test("最後に開いた掲示板に所属していれば、その掲示板を返す", async () => {
  const { findLandingBoard, olderBoard } = await setup();

  const board = await findLandingBoard({
    userId: "user-1",
    lastBoardId: olderBoard.id,
  });

  expect(board).toEqual(olderBoard);
});

test("最後に開いた掲示板の記録がなければ、所属した日時が最も新しい掲示板を返す", async () => {
  const { findLandingBoard, newestBoard } = await setup();

  const board = await findLandingBoard({ userId: "user-1" });

  expect(board).toEqual(newestBoard);
});

test("最後に開いた掲示板に所属していなければ、所属した日時が最も新しい掲示板を返す", async () => {
  const { findLandingBoard, newestBoard, otherBoard } = await setup();

  const board = await findLandingBoard({
    userId: "user-1",
    lastBoardId: otherBoard.id,
  });

  expect(board).toEqual(newestBoard);
});

test("所属する掲示板がなければ null を返す", async () => {
  const { findLandingBoard, olderBoard } = await setup();

  const board = await findLandingBoard({
    userId: "user-3",
    lastBoardId: olderBoard.id,
  });

  expect(board).toBeNull();
});
