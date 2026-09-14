import { expect, test } from "vitest";
import { user } from "@/modules/auth/infrastructure/schema";
import { testDb } from "@/shared/testing/test-db";
import { makeDrizzleBoardRepository } from "./drizzle-board-repository";
import { boardMember, inviteToken } from "./schema";

const repository = makeDrizzleBoardRepository(testDb);

async function insertUser(id: string) {
  const now = new Date();
  await testDb.insert(user).values({
    id,
    name: id,
    email: `${id}@example.com`,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  });
}

test("掲示板を作成すると、DB が振った ID と日時を含めて返す", async () => {
  const board = await repository.create({
    name: "中野のボード",
    isPublic: true,
  });

  expect(board).toMatchObject({ name: "中野のボード", isPublic: true });
  expect(board.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(board.createdAt).toBeInstanceOf(Date);
  expect(await repository.findById(board.id)).toEqual(board);
});

test("存在しない掲示板の ID で探すと null を返す", async () => {
  const found = await repository.findById(
    "00000000-0000-0000-0000-000000000000",
  );

  expect(found).toBeNull();
});

test("UUID 形式でない ID で探すと、エラーにならず null を返す", async () => {
  expect(await repository.findById("missing-board")).toBeNull();
  expect(await repository.findMember("missing-board", "user-1")).toBeNull();
});

test("メンバーを追加すると、ロール付きで取得できる", async () => {
  await insertUser("user-1");
  const board = await repository.create({ name: "A", isPublic: false });

  await repository.addMember({
    boardId: board.id,
    userId: "user-1",
    role: "poster",
  });

  expect(await repository.findMember(board.id, "user-1")).toMatchObject({
    boardId: board.id,
    userId: "user-1",
    role: "poster",
  });
});

test("所属していないユーザーのメンバー情報は null を返す", async () => {
  const board = await repository.create({ name: "A", isPublic: false });

  expect(await repository.findMember(board.id, "user-1")).toBeNull();
});

test("同じユーザーを同じ掲示板に2回追加するとエラーになる", async () => {
  await insertUser("user-1");
  const board = await repository.create({ name: "A", isPublic: false });
  const member = {
    boardId: board.id,
    userId: "user-1",
    role: "admin",
  } as const;
  await repository.addMember(member);

  await expect(repository.addMember(member)).rejects.toThrow();
});

test("所属する掲示板を、所属した日時の新しい順に返す", async () => {
  await insertUser("user-1");
  const boardA = await repository.create({ name: "A", isPublic: false });
  const boardB = await repository.create({ name: "B", isPublic: false });
  await testDb.insert(boardMember).values([
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
  ]);

  const boards = await repository.findAllByUserId("user-1");

  expect(boards.map((board) => board.name)).toEqual(["A", "B"]);
});

test("所属する掲示板がなければ空の配列を返す", async () => {
  expect(await repository.findAllByUserId("user-1")).toEqual([]);
});

test("招待リンクを追加すると、有効な状態で保存される", async () => {
  const board = await repository.create({ name: "A", isPublic: false });

  await repository.addInviteToken({ boardId: board.id, token: "token-1" });

  const tokens = await testDb.select().from(inviteToken);
  expect(tokens).toHaveLength(1);
  expect(tokens[0]).toMatchObject({
    boardId: board.id,
    token: "token-1",
    revokedAt: null,
  });
});

test("同じ掲示板に有効な招待リンクを2つ追加するとエラーになる", async () => {
  const board = await repository.create({ name: "A", isPublic: false });
  await repository.addInviteToken({ boardId: board.id, token: "token-1" });

  await expect(
    repository.addInviteToken({ boardId: board.id, token: "token-2" }),
  ).rejects.toThrow();
});
