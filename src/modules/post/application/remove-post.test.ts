import { expect, test } from "vitest";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import type { CreatePostData } from "@/modules/post/domain/post-repository";
import { makeInMemoryPostRepository } from "@/modules/post/testing/in-memory-post-repository";
import { makeRemovePost } from "./remove-post";

const NOW = new Date("2026-10-15T00:00:00Z");

async function setup(overrides: Partial<CreatePostData> = {}) {
  const { repository: boardRepository, members } =
    makeInMemoryBoardRepository();
  const { repository: postRepository, posts } = makeInMemoryPostRepository();
  const board = await boardRepository.create({
    name: "中野のボード",
    isPublic: true,
  });
  for (const userId of ["member", "another-member"]) {
    members.push({
      boardId: board.id,
      userId,
      role: "poster",
      createdAt: new Date(),
    });
  }
  await postRepository.create({
    id: "post-1",
    publicId: "public-1",
    boardId: board.id,
    title: "夏祭りのお知らせ",
    description: null,
    externalUrl: null,
    originalKey: "posts/post-1/original",
    originalContentType: "application/pdf",
    originalSize: 1000,
    thumbnailKey: "posts/post-1/thumbnail",
    thumbnailSize: 100,
    thumbnailWidth: 565,
    thumbnailHeight: 800,
    publishFrom: new Date("2026-09-01T00:00:00Z"),
    expiresAt: new Date("2026-10-01T00:00:00Z"),
    status: "published",
    ...overrides,
  });
  const removePost = makeRemovePost({
    checkBoardAccess: makeCheckBoardAccess({ boardRepository }),
    postRepository,
    now: () => NOW,
  });
  return { removePost, board, post: posts[0] };
}

test("メンバーが期限切れの掲示物を撤去済みにすると、状態・日時・撤去した人が記録される", async () => {
  const { removePost, board, post } = await setup();

  const result = await removePost({ publicId: "public-1", userId: "member" });

  expect(result).toEqual({ ok: true, boardId: board.id });
  expect(post).toMatchObject({
    status: "removed",
    removedAt: NOW,
    removedBy: "member",
  });
});

test.each([
  ["無期限", { expiresAt: null }],
  ["掲示期間の中", { expiresAt: new Date("2026-11-01T00:00:00Z") }],
])("%sの掲示物も、撤去済みにできる", async (_, overrides) => {
  const { removePost, post } = await setup(overrides);

  const result = await removePost({ publicId: "public-1", userId: "member" });

  expect(result.ok).toBe(true);
  expect(post.status).toBe("removed");
});

test("すでに撤去済みの掲示物は、最初の記録を変えずに成功を返す", async () => {
  const { removePost, post } = await setup();
  await removePost({ publicId: "public-1", userId: "member" });

  const result = await removePost({
    publicId: "public-1",
    userId: "another-member",
  });

  expect(result.ok).toBe(true);
  expect(post).toMatchObject({ removedAt: NOW, removedBy: "member" });
});

test("下書きの掲示物は、撤去済みにできない", async () => {
  const { removePost, post } = await setup({ status: "draft" });

  const result = await removePost({ publicId: "public-1", userId: "member" });

  expect(result).toEqual({ ok: false, reason: "post_not_removable" });
  expect(post.status).toBe("draft");
});

test("メンバーでない人は撤去済みにできず、掲示物がないときと同じ結果になる", async () => {
  const { removePost, post } = await setup();

  expect(
    await removePost({ publicId: "public-1", userId: "stranger" }),
  ).toEqual({ ok: false, reason: "post_not_found" });
  expect(await removePost({ publicId: "unknown", userId: "member" })).toEqual({
    ok: false,
    reason: "post_not_found",
  });
  expect(post.status).toBe("published");
});
