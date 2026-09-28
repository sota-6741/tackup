import { expect, test } from "vitest";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { makeCheckBoardAccess } from "./check-board-access";
import { makeGetBoard } from "./get-board";

async function setup({ isPublic = false }: { isPublic?: boolean } = {}) {
  const { repository, members, inviteTokens } = makeInMemoryBoardRepository();
  const getBoard = makeGetBoard({
    boardRepository: repository,
    checkBoardAccess: makeCheckBoardAccess({ boardRepository: repository }),
    appBaseUrl: "https://tackup.example.com",
  });
  const board = await repository.create({ name: "中野のボード", isPublic });
  return { getBoard, repository, members, inviteTokens, board };
}

test("admin のメンバーには掲示板とロールを返す", async () => {
  const { getBoard, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "admin",
    createdAt: new Date(),
  });

  const result = await getBoard({ boardId: board.id, userId: "user-1" });

  expect(result).toEqual({ ok: true, board, role: "admin", inviteUrl: null });
});

test("poster のメンバーにも掲示板とロールを返す", async () => {
  const { getBoard, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "poster",
    createdAt: new Date(),
  });

  const result = await getBoard({ boardId: board.id, userId: "user-1" });

  expect(result).toEqual({ ok: true, board, role: "poster", inviteUrl: null });
});

test("公開掲示板では、有効な招待リンクの URL を返す", async () => {
  const { getBoard, repository, members, inviteTokens, board } = await setup({
    isPublic: true,
  });
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "poster",
    createdAt: new Date(),
  });
  inviteTokens.push({
    id: "invite-token-old",
    boardId: board.id,
    token: "token-old",
    revokedAt: new Date(),
    createdAt: new Date(),
  });
  await repository.addInviteToken({ boardId: board.id, token: "token-new" });

  const result = await getBoard({ boardId: board.id, userId: "user-1" });

  expect(result).toMatchObject({
    ok: true,
    inviteUrl: "https://tackup.example.com/b/token-new",
  });
});

test("非公開掲示板では、招待リンクがあっても URL を返さない", async () => {
  const { getBoard, repository, members, board } = await setup();
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "admin",
    createdAt: new Date(),
  });
  await repository.addInviteToken({ boardId: board.id, token: "token-1" });

  const result = await getBoard({ boardId: board.id, userId: "user-1" });

  expect(result).toMatchObject({ ok: true, inviteUrl: null });
});

test("公開掲示板に有効な招待リンクがないときは、想定外のエラーにする", async () => {
  const { getBoard, members, board } = await setup({ isPublic: true });
  members.push({
    boardId: board.id,
    userId: "user-1",
    role: "admin",
    createdAt: new Date(),
  });

  await expect(
    getBoard({ boardId: board.id, userId: "user-1" }),
  ).rejects.toThrow();
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
