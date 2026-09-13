import { expect, test } from "vitest";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { makeListMyBoards } from "./list-my-boards";

function setup() {
  const { repository, members } = makeInMemoryBoardRepository();
  const listMyBoards = makeListMyBoards({ boardRepository: repository });
  return { listMyBoards, repository, members };
}

test("所属する掲示板を、所属した日時の古い順に返す", async () => {
  const { listMyBoards, repository, members } = setup();
  const boardA = await repository.create({ name: "A", isPublic: false });
  const boardB = await repository.create({ name: "B", isPublic: false });
  members.push(
    {
      boardId: boardA.id,
      userId: "user-1",
      role: "poster",
      createdAt: new Date("2026-02-01T00:00:00Z"),
    },
    {
      boardId: boardB.id,
      userId: "user-1",
      role: "admin",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
  );

  const boards = await listMyBoards("user-1");

  expect(boards).toEqual([boardB, boardA]);
});

test("所属していない掲示板は含まれない", async () => {
  const { listMyBoards, repository, members } = setup();
  const myBoard = await repository.create({ name: "自分の", isPublic: false });
  const otherBoard = await repository.create({
    name: "他人の",
    isPublic: false,
  });
  members.push(
    {
      boardId: myBoard.id,
      userId: "user-1",
      role: "admin",
      createdAt: new Date(),
    },
    {
      boardId: otherBoard.id,
      userId: "user-2",
      role: "admin",
      createdAt: new Date(),
    },
  );

  const boards = await listMyBoards("user-1");

  expect(boards).toEqual([myBoard]);
});

test("所属する掲示板がなければ空の配列を返す", async () => {
  const { listMyBoards } = setup();

  const boards = await listMyBoards("user-1");

  expect(boards).toEqual([]);
});
