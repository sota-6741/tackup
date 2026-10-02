import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { makeDrizzleBoardRepository } from "@/modules/board/infrastructure/drizzle-board-repository";
import { DatabaseError } from "@/shared/infrastructure/database-error";
import { testDb } from "@/shared/testing/test-db";
import { makeDrizzlePostRepository } from "./drizzle-post-repository";
import { makeDrizzleViewLogRepository } from "./drizzle-view-log-repository";
import { viewLog } from "./schema";

const repository = makeDrizzleViewLogRepository(testDb);

async function createPost() {
  const board = await makeDrizzleBoardRepository(testDb).create({
    name: "中野のボード",
    isPublic: true,
  });
  const id = randomUUID();
  return makeDrizzlePostRepository(testDb).create({
    id,
    publicId: `public-${id}`,
    boardId: board.id,
    title: "夏祭りのお知らせ",
    description: null,
    externalUrl: null,
    originalKey: `boards/${board.id}/posts/${id}/original`,
    originalContentType: "application/pdf",
    originalSize: 1000,
    thumbnailKey: `boards/${board.id}/posts/${id}/thumbnail`,
    thumbnailSize: 100,
    thumbnailWidth: 565,
    thumbnailHeight: 800,
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: null,
    status: "published",
  });
}

test("閲覧を記録すると、掲示物ごとに 1 件ずつ、日時を付けて残る", async () => {
  const post = await createPost();
  const other = await createPost();

  await repository.record(post.id);
  await repository.record(post.id);
  await repository.record(other.id);

  const logs = await testDb
    .select()
    .from(viewLog)
    .where(eq(viewLog.postId, post.id));
  expect(logs).toHaveLength(2);
  expect(new Set(logs.map((log) => log.id)).size).toBe(2);
  expect(logs[0].createdAt).toBeInstanceOf(Date);
});

test("存在しない掲示物の閲覧は記録できず、DatabaseError になる", async () => {
  await expect(repository.record(randomUUID())).rejects.toBeInstanceOf(
    DatabaseError,
  );
});
