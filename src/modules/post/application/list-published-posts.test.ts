import { expect, test } from "vitest";
import { POST_PAGE_SIZE } from "@/modules/post/domain/post";
import type { CreatePostData } from "@/modules/post/domain/post-repository";
import { makeInMemoryPostRepository } from "@/modules/post/testing/in-memory-post-repository";
import { makeInMemoryFileStorage } from "@/shared/testing/in-memory-file-storage";
import { makeListPublishedPosts } from "./list-published-posts";

const NOW = new Date("2026-10-15T00:00:00Z");

function setup() {
  const { repository, posts } = makeInMemoryPostRepository();
  const { fileStorage } = makeInMemoryFileStorage();
  const listPublishedPosts = makeListPublishedPosts({
    postRepository: repository,
    fileStorage,
    now: () => NOW,
  });

  async function addPost(overrides: Partial<CreatePostData> = {}) {
    const number = String(posts.length + 1).padStart(12, "0");
    const id = `00000000-0000-4000-8000-${number}`;
    return repository.create({
      id,
      publicId: `public-${number}`,
      boardId: "board-1",
      title: `掲示物 ${number}`,
      originalKey: `boards/board-1/posts/${id}/original`,
      originalContentType: "application/pdf",
      originalSize: 1000,
      thumbnailKey: `boards/board-1/posts/${id}/thumbnail`,
      thumbnailSize: 100,
      thumbnailWidth: 565,
      thumbnailHeight: 800,
      publishFrom: new Date("2026-10-01T00:00:00Z"),
      expiresAt: new Date("2026-11-01T00:00:00Z"),
      status: "published",
      ...overrides,
    });
  }

  return { listPublishedPosts, addPost };
}

test("公開中の掲示物を、画面に渡す形で返す。内部の ID とストレージのキーは含めない", async () => {
  const { listPublishedPosts, addPost } = setup();
  const post = await addPost({ title: "夏祭りのお知らせ" });

  const page = await listPublishedPosts({ boardId: "board-1" });

  expect(page).toEqual({
    posts: [
      {
        publicId: post.publicId,
        title: "夏祭りのお知らせ",
        thumbnailUrl: `https://storage.example.com/${post.thumbnailKey}`,
        thumbnailWidth: 565,
        thumbnailHeight: 800,
      },
    ],
    nextCursor: null,
  });
});

test("公開中でない掲示物と、ほかの掲示板の掲示物は返さない", async () => {
  const { listPublishedPosts, addPost } = setup();
  await addPost({ title: "公開中" });
  await addPost({ title: "無期限", expiresAt: null });
  await addPost({
    title: "掲示開始前",
    publishFrom: new Date("2026-10-20T00:00:00Z"),
  });
  await addPost({
    title: "期限切れ",
    expiresAt: new Date("2026-10-10T00:00:00Z"),
  });
  await addPost({ title: "撤去済み", status: "removed" });
  await addPost({ title: "ほかの掲示板", boardId: "board-2" });

  const page = await listPublishedPosts({ boardId: "board-1" });

  expect(page.posts.map((post) => post.title).sort()).toEqual([
    "公開中",
    "無期限",
  ]);
});

test("掲示開始の新しい順に返す", async () => {
  const { listPublishedPosts, addPost } = setup();
  await addPost({
    title: "古い",
    publishFrom: new Date("2026-10-01T00:00:00Z"),
  });
  await addPost({
    title: "新しい",
    publishFrom: new Date("2026-10-10T00:00:00Z"),
  });

  const page = await listPublishedPosts({ boardId: "board-1" });

  expect(page.posts.map((post) => post.title)).toEqual(["新しい", "古い"]);
});

test("1 ページの件数を超えると続きの位置を返し、それを渡すと残りを重複なく返す", async () => {
  const { listPublishedPosts, addPost } = setup();
  for (let i = 0; i < POST_PAGE_SIZE + 3; i++) await addPost();

  const first = await listPublishedPosts({ boardId: "board-1" });
  const second = await listPublishedPosts({
    boardId: "board-1",
    cursor: first.nextCursor ?? undefined,
  });

  expect(first.posts).toHaveLength(POST_PAGE_SIZE);
  expect(first.nextCursor).not.toBeNull();
  expect(second.posts).toHaveLength(3);
  expect(second.nextCursor).toBeNull();
  const publicIds = [...first.posts, ...second.posts].map(
    (post) => post.publicId,
  );
  expect(new Set(publicIds).size).toBe(POST_PAGE_SIZE + 3);
});

test("ちょうど 1 ページ分なら、続きの位置は返さない", async () => {
  const { listPublishedPosts, addPost } = setup();
  for (let i = 0; i < POST_PAGE_SIZE; i++) await addPost();

  const page = await listPublishedPosts({ boardId: "board-1" });

  expect(page.posts).toHaveLength(POST_PAGE_SIZE);
  expect(page.nextCursor).toBeNull();
});

test("続きの位置の形が合わなければ、最初のページを返す", async () => {
  const { listPublishedPosts, addPost } = setup();
  await addPost();

  const page = await listPublishedPosts({
    boardId: "board-1",
    cursor: "'; drop table post; --",
  });

  expect(page.posts).toHaveLength(1);
});
