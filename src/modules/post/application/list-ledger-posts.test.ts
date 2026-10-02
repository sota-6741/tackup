import { expect, test } from "vitest";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { POST_PAGE_SIZE } from "@/modules/post/domain/post";
import type { CreatePostData } from "@/modules/post/domain/post-repository";
import { makeInMemoryPostRepository } from "@/modules/post/testing/in-memory-post-repository";
import { makeInMemoryFileStorage } from "@/shared/testing/in-memory-file-storage";
import { makeListLedgerPosts } from "./list-ledger-posts";

const NOW = new Date("2026-10-15T00:00:00Z");
const STORAGE = "https://storage.example.com";

async function setup() {
  const { repository: boardRepository, members } =
    makeInMemoryBoardRepository();
  const { repository: postRepository, posts } = makeInMemoryPostRepository();
  const { fileStorage } = makeInMemoryFileStorage();
  const board = await boardRepository.create({
    name: "中野のボード",
    isPublic: false,
  });
  members.push({
    boardId: board.id,
    userId: "member",
    role: "poster",
    createdAt: new Date(),
  });
  let count = 0;
  const createPost = (overrides: Partial<CreatePostData> = {}) => {
    count += 1;
    const id = `00000000-0000-4000-8000-${String(count).padStart(12, "0")}`;
    return postRepository.create({
      id,
      publicId: `public-${count}`,
      boardId: board.id,
      title: `掲示物 ${count}`,
      description: null,
      externalUrl: null,
      originalKey: `posts/${id}/original`,
      originalContentType: "application/pdf",
      originalSize: 1000,
      thumbnailKey: `posts/${id}/thumbnail`,
      thumbnailSize: 100,
      thumbnailWidth: 565,
      thumbnailHeight: 800,
      publishFrom: new Date("2026-10-01T00:00:00Z"),
      expiresAt: new Date("2026-11-01T00:00:00Z"),
      status: "published",
      ...overrides,
    });
  };
  const listLedgerPosts = makeListLedgerPosts({
    checkBoardAccess: makeCheckBoardAccess({ boardRepository }),
    postRepository,
    fileStorage,
    now: () => NOW,
  });
  return { listLedgerPosts, createPost, board, posts };
}

test("すべての状態の掲示物を、状態を付けて掲示開始の新しい順に返す。内部の ID とキーは含めない", async () => {
  const { listLedgerPosts, createPost, board, posts } = await setup();
  const published = await createPost({
    publishFrom: new Date("2026-10-05T00:00:00Z"),
  });
  await createPost({ publishFrom: new Date("2026-10-20T00:00:00Z") });
  await createPost({ expiresAt: new Date("2026-10-10T00:00:00Z") });
  await createPost({
    publishFrom: new Date("2026-09-01T00:00:00Z"),
    status: "draft",
  });
  await createPost({
    publishFrom: new Date("2026-08-01T00:00:00Z"),
    expiresAt: null,
  });
  await createPost({
    publishFrom: new Date("2026-07-01T00:00:00Z"),
    status: "removed",
  });
  Object.assign(posts[5], { removedAt: new Date("2026-07-10T00:00:00Z") });

  const result = await listLedgerPosts({ boardId: board.id, userId: "member" });
  if (!result.ok) throw new Error("台帳を取れない");

  expect(
    result.posts.map((post) => [post.title, post.state, post.canRemove]),
  ).toEqual([
    ["掲示物 2", "upcoming", true],
    ["掲示物 1", "published", true],
    ["掲示物 3", "expired", true],
    ["掲示物 4", "draft", false],
    ["掲示物 5", "published", true],
    ["掲示物 6", "removed", false],
  ]);
  expect(result.posts[1]).toEqual({
    publicId: "public-1",
    title: "掲示物 1",
    thumbnailUrl: `${STORAGE}/${published.thumbnailKey}`,
    thumbnailWidth: 565,
    thumbnailHeight: 800,
    publishFrom: new Date("2026-10-05T00:00:00Z"),
    expiresAt: new Date("2026-11-01T00:00:00Z"),
    state: "published",
    removedAt: null,
    canRemove: true,
  });
  expect(result.posts[4].expiresAt).toBeNull();
  expect(result.posts[5].removedAt).toEqual(new Date("2026-07-10T00:00:00Z"));
  expect(result.nextCursor).toBeNull();
});

test("1 ページを超えるときは、続きの位置を返し、続きを重複も抜けもなく取れる", async () => {
  const { listLedgerPosts, createPost, board } = await setup();
  for (let index = 0; index < POST_PAGE_SIZE + 2; index += 1) {
    await createPost({ status: index % 2 === 0 ? "removed" : "published" });
  }
  const input = { boardId: board.id, userId: "member" };

  const first = await listLedgerPosts(input);
  if (!first.ok || !first.nextCursor) throw new Error("続きがない");
  const second = await listLedgerPosts({ ...input, cursor: first.nextCursor });
  if (!second.ok) throw new Error("続きを取れない");

  expect(first.posts).toHaveLength(POST_PAGE_SIZE);
  expect(second.posts).toHaveLength(2);
  expect(second.isContinuation).toBe(true);
  const publicIds = [...first.posts, ...second.posts].map(
    (post) => post.publicId,
  );
  expect(new Set(publicIds).size).toBe(POST_PAGE_SIZE + 2);
});

test("メンバーでない人には、掲示板がないときと同じ結果を返す", async () => {
  const { listLedgerPosts, createPost, board } = await setup();
  await createPost();

  expect(
    await listLedgerPosts({ boardId: board.id, userId: "stranger" }),
  ).toEqual({ ok: false, reason: "board_not_found" });
});
