import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { makeDrizzleBoardRepository } from "@/modules/board/infrastructure/drizzle-board-repository";
import type { CreatePostData } from "@/modules/post/domain/post-repository";
import { DatabaseError } from "@/shared/infrastructure/database-error";
import { testDb } from "@/shared/testing/test-db";
import { makeDrizzlePostRepository } from "./drizzle-post-repository";

const repository = makeDrizzlePostRepository(testDb);
const boardRepository = makeDrizzleBoardRepository(testDb);

async function createBoard() {
  return boardRepository.create({ name: "中野のボード", isPublic: true });
}

function postData(
  boardId: string,
  overrides: Partial<CreatePostData> = {},
): CreatePostData {
  const id = randomUUID();
  return {
    id,
    publicId: `public-${id}`,
    boardId,
    title: "夏祭りのお知らせ",
    originalKey: `boards/${boardId}/posts/${id}/original`,
    originalContentType: "application/pdf",
    originalSize: 1000,
    thumbnailKey: `boards/${boardId}/posts/${id}/thumbnail`,
    thumbnailSize: 100,
    thumbnailWidth: 565,
    thumbnailHeight: 800,
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-11-01T00:00:00Z"),
    status: "published",
    ...overrides,
  };
}

test("掲示物を登録すると、渡した ID と DB が振った日時を含めて返す", async () => {
  const board = await createBoard();
  const data = postData(board.id);

  const post = await repository.create(data);

  expect(post).toMatchObject({
    ...data,
    description: null,
    externalUrl: null,
    removedAt: null,
    removedBy: null,
  });
  expect(post.createdAt).toBeInstanceOf(Date);
});

test("掲示終了が掲示開始より後でない掲示物は登録できない", async () => {
  const board = await createBoard();
  const data = postData(board.id, {
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-10-01T00:00:00Z"),
  });

  await expect(repository.create(data)).rejects.toBeInstanceOf(DatabaseError);
});

test.each([
  ["原本", { originalSize: 0 }],
  ["サムネイル", { thumbnailSize: -1 }],
])("%sのサイズが正の数でない掲示物は登録できない", async (_, overrides) => {
  const board = await createBoard();

  await expect(
    repository.create(postData(board.id, overrides)),
  ).rejects.toBeInstanceOf(DatabaseError);
});

test("同じ publicId の掲示物は登録できない", async () => {
  const board = await createBoard();
  await repository.create(postData(board.id, { publicId: "same" }));

  await expect(
    repository.create(postData(board.id, { publicId: "same" })),
  ).rejects.toBeInstanceOf(DatabaseError);
});

test("掲示物の数は、撤去済みを除き、ほかの掲示板を含めずに数える", async () => {
  const board = await createBoard();
  const other = await createBoard();
  await repository.create(postData(board.id));
  await repository.create(postData(board.id, { status: "draft" }));
  await repository.create(postData(board.id, { status: "removed" }));
  await repository.create(postData(other.id));

  expect(await repository.countActiveByBoardId(board.id)).toBe(2);
});

test("ファイルのサイズは、原本とサムネイルを足し、撤去済みも含めて合計する", async () => {
  const board = await createBoard();
  const other = await createBoard();
  await repository.create(
    postData(board.id, { originalSize: 1000, thumbnailSize: 100 }),
  );
  await repository.create(
    postData(board.id, {
      originalSize: 20,
      thumbnailSize: 3,
      status: "removed",
    }),
  );
  await repository.create(postData(other.id, { originalSize: 5000 }));

  expect(await repository.sumFileSizeByBoardId(board.id)).toBe(1123);
});

test("合計が 32 ビットの整数に収まらなくても、正しく合計する", async () => {
  const board = await createBoard();
  const size = 3 * 1024 * 1024 * 1024;
  await repository.create(postData(board.id, { originalSize: size }));
  await repository.create(postData(board.id, { originalSize: size }));

  expect(await repository.sumFileSizeByBoardId(board.id)).toBe(size * 2 + 200);
});

test("掲示物のない掲示板では、数も合計も 0 になる", async () => {
  const board = await createBoard();

  expect(await repository.countActiveByBoardId(board.id)).toBe(0);
  expect(await repository.sumFileSizeByBoardId(board.id)).toBe(0);
});
