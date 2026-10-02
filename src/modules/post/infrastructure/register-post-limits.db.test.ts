import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, expect, test } from "vitest";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import { makeDrizzleBoardRepository } from "@/modules/board/infrastructure/drizzle-board-repository";
import { makeRegisterPost } from "@/modules/post/application/register-post";
import {
  BOARD_FILE_MAX_TOTAL_SIZE,
  BOARD_POST_MAX_COUNT,
} from "@/modules/post/domain/post";
import type { CreatePostData } from "@/modules/post/domain/post-repository";
import { makeDrizzleUnitOfWork } from "@/shared/infrastructure/drizzle-unit-of-work";
import { makeInMemoryFileStorage } from "@/shared/testing/in-memory-file-storage";
import { TEST_DATABASE_URL, testDb } from "@/shared/testing/test-db";
import { makeDrizzlePostRepository } from "./drizzle-post-repository";
import { post } from "./schema";

// testDb は接続が 1 本で、同時に呼んでも順番に実行される。掲示板の行のロックが効くことを確かめるには、
// 別々の接続で 2 つのトランザクションを同時に走らせる必要がある。
const client = postgres(TEST_DATABASE_URL, { max: 4, onnotice: () => {} });
const db = drizzle(client);

afterAll(() => client.end());

const PDF = new TextEncoder().encode("%PDF-1.7 掲示物の原本");
const WEBP = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 サムネイル");
const USER_ID = "user-1";

function existingPost(
  boardId: string,
  overrides: Partial<CreatePostData> = {},
): CreatePostData {
  const id = randomUUID();
  return {
    id,
    publicId: id,
    boardId,
    title: "既存の掲示物",
    originalKey: `boards/${boardId}/posts/${id}/original`,
    originalContentType: "application/pdf",
    originalSize: 1,
    thumbnailKey: `boards/${boardId}/posts/${id}/thumbnail`,
    thumbnailSize: 1,
    thumbnailWidth: 800,
    thumbnailHeight: 800,
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-11-01T00:00:00Z"),
    status: "published",
    ...overrides,
  };
}

async function setup() {
  const boardRepository = makeDrizzleBoardRepository(db);
  const board = await boardRepository.create({
    name: "中野のボード",
    isPublic: true,
  });
  const { fileStorage, put } = makeInMemoryFileStorage();
  const registerPost = makeRegisterPost({
    // 所属の確認は、このテストで確かめたいことではないので通す。
    checkBoardAccess: makeCheckBoardAccess({
      boardRepository: {
        ...boardRepository,
        findMember: async (boardId, userId) => ({
          boardId,
          userId,
          role: "poster",
          createdAt: new Date(),
        }),
      },
    }),
    fileStorage,
    unitOfWork: makeDrizzleUnitOfWork(db, (executor) => ({
      boardRepository: makeDrizzleBoardRepository(executor),
      postRepository: makeDrizzlePostRepository(executor),
    })),
    generatePostId: randomUUID,
    generatePublicId: randomUUID,
  });

  /** 別々のファイルをアップロードした 2 人分の登録を、同時に走らせる。 */
  function registerTwoAtOnce() {
    const inputs = [1, 2].map(() => {
      const originalKey = `pending/${board.id}/${USER_ID}/${randomUUID()}`;
      const thumbnailKey = `pending/${board.id}/${USER_ID}/${randomUUID()}`;
      put({ key: originalKey, bytes: PDF, contentType: "application/pdf" });
      put({ key: thumbnailKey, bytes: WEBP, contentType: "image/webp" });
      return {
        boardId: board.id,
        userId: USER_ID,
        title: "夏祭りのお知らせ",
        publishFrom: new Date("2026-10-01T00:00:00Z"),
        expiresAt: new Date("2026-11-01T00:00:00Z"),
        originalKey,
        thumbnailKey,
        thumbnailWidth: 565,
        thumbnailHeight: 800,
      };
    });
    return Promise.all(inputs.map((input) => registerPost(input)));
  }

  return { board, registerTwoAtOnce };
}

test("上限まであと 1 件のときに同時に登録しても、掲示物の数は上限を超えない", async () => {
  const { board, registerTwoAtOnce } = await setup();
  await testDb
    .insert(post)
    .values(
      Array.from({ length: BOARD_POST_MAX_COUNT - 1 }, () =>
        existingPost(board.id),
      ),
    );

  const results = await registerTwoAtOnce();

  expect(results.filter((result) => result.ok)).toHaveLength(1);
  expect(results.find((result) => !result.ok)).toEqual({
    ok: false,
    reason: "post_limit_exceeded",
  });
  const repository = makeDrizzlePostRepository(testDb);
  expect(await repository.countActiveByBoardId(board.id)).toBe(
    BOARD_POST_MAX_COUNT,
  );
});

test("容量があと 1 件分のときに同時に登録しても、合計は上限を超えない", async () => {
  const { board, registerTwoAtOnce } = await setup();
  const oneRegistration = PDF.length + WEBP.length;
  await testDb.insert(post).values(
    existingPost(board.id, {
      originalSize: BOARD_FILE_MAX_TOTAL_SIZE - oneRegistration - 1,
      thumbnailSize: 1,
    }),
  );

  const results = await registerTwoAtOnce();

  expect(results.filter((result) => result.ok)).toHaveLength(1);
  expect(results.find((result) => !result.ok)).toEqual({
    ok: false,
    reason: "storage_limit_exceeded",
  });
  const repository = makeDrizzlePostRepository(testDb);
  expect(await repository.sumFileSizeByBoardId(board.id)).toBe(
    BOARD_FILE_MAX_TOTAL_SIZE,
  );
});
