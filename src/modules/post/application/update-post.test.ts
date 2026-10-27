import { expect, test } from "vitest";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import type { CreatePostData } from "@/modules/post/domain/post-repository";
import { makeInMemoryPostRepository } from "@/modules/post/testing/in-memory-post-repository";
import { makeInMemoryFileStorage } from "@/shared/testing/in-memory-file-storage";
import { makeGetEditablePost } from "./get-editable-post";
import { makeUpdatePost, type UpdatePostInput } from "./update-post";

async function setup(overrides: Partial<CreatePostData> = {}) {
  const { repository: boardRepository, members } =
    makeInMemoryBoardRepository();
  const { repository: postRepository, posts } = makeInMemoryPostRepository();
  const { fileStorage } = makeInMemoryFileStorage();
  const board = await boardRepository.create({
    name: "中野のボード",
    isPublic: true,
  });
  const otherBoard = await boardRepository.create({
    name: "別の掲示板",
    isPublic: true,
  });
  members.push({
    boardId: board.id,
    userId: "member",
    role: "poster",
    createdAt: new Date(),
  });
  await postRepository.create({
    id: "post-1",
    publicId: "public-1",
    boardId: board.id,
    title: "夏祭りのお知らせ",
    description: "雨天中止です",
    externalUrl: null,
    originalKey: "posts/post-1/original",
    originalContentType: "application/pdf",
    originalSize: 1000,
    thumbnailKey: "posts/post-1/thumbnail",
    thumbnailSize: 100,
    thumbnailWidth: 565,
    thumbnailHeight: 800,
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-11-01T00:00:00Z"),
    status: "published",
    ...overrides,
  });
  const checkBoardAccess = makeCheckBoardAccess({ boardRepository });
  return {
    updatePost: makeUpdatePost({ checkBoardAccess, postRepository }),
    getEditablePost: makeGetEditablePost({
      checkBoardAccess,
      postRepository,
      fileStorage,
    }),
    board,
    otherBoard,
    post: posts[0],
  };
}

const input: UpdatePostInput = {
  publicId: "public-1",
  userId: "member",
  title: "  夏祭りのお知らせ（雨天延期）  ",
  description: "",
  externalUrl: "https://example.com/festival",
  publishFrom: new Date("2026-10-02T00:00:00Z"),
  expiresAt: null,
};

test("メンバーは、タイトル・説明文・外部リンク・掲示期間を書き換えられる。決まりは登録と同じ", async () => {
  const { updatePost, board, post } = await setup();

  const result = await updatePost(input);

  expect(result).toEqual({ ok: true, boardId: board.id });
  expect(post).toMatchObject({
    title: "夏祭りのお知らせ（雨天延期）",
    description: null,
    externalUrl: "https://example.com/festival",
    publishFrom: new Date("2026-10-02T00:00:00Z"),
    expiresAt: null,
    status: "published",
  });
});

test.each([
  [{ title: " " }, "title_empty"],
  [{ externalUrl: "javascript:alert(1)" }, "external_url_invalid"],
  [
    {
      publishFrom: new Date("2026-10-02T00:00:00Z"),
      expiresAt: new Date("2026-10-01T00:00:00Z"),
    },
    "expires_before_publish",
  ],
] as const)(
  "入力が決まりに合わなければ書き換えない（%o）",
  async (change, reason) => {
    const { updatePost, post } = await setup();

    const result = await updatePost({ ...input, ...change });

    expect(result).toEqual({ ok: false, reason });
    expect(post.title).toBe("夏祭りのお知らせ");
  },
);

test("撤去済みの掲示物は編集できない", async () => {
  const { updatePost, getEditablePost, board, post } = await setup({
    status: "removed",
  });

  expect(await updatePost(input)).toEqual({
    ok: false,
    reason: "post_not_editable",
  });
  expect(
    await getEditablePost({
      boardId: board.id,
      publicId: "public-1",
      userId: "member",
    }),
  ).toEqual({ ok: false, reason: "post_not_found" });
  expect(post.title).toBe("夏祭りのお知らせ");
});

test("下書きの掲示物は編集できる", async () => {
  const { updatePost } = await setup({ status: "draft" });

  expect((await updatePost(input)).ok).toBe(true);
});

test("メンバーでない人は編集できず、掲示物がないときと同じ結果になる", async () => {
  const { updatePost, getEditablePost, board, post } = await setup();

  expect(await updatePost({ ...input, userId: "stranger" })).toEqual({
    ok: false,
    reason: "post_not_found",
  });
  expect(
    await getEditablePost({
      boardId: board.id,
      publicId: "public-1",
      userId: "stranger",
    }),
  ).toEqual({ ok: false, reason: "post_not_found" });
  expect(post.title).toBe("夏祭りのお知らせ");
});

test("編集の画面には今の値を返す。URL の掲示板が違えば、見つからないとして扱う", async () => {
  const { getEditablePost, board, otherBoard } = await setup();

  expect(
    await getEditablePost({
      boardId: board.id,
      publicId: "public-1",
      userId: "member",
    }),
  ).toEqual({
    ok: true,
    post: {
      publicId: "public-1",
      boardId: board.id,
      title: "夏祭りのお知らせ",
      description: "雨天中止です",
      externalUrl: null,
      publishFrom: new Date("2026-10-01T00:00:00Z"),
      expiresAt: new Date("2026-11-01T00:00:00Z"),
      thumbnailUrl: "https://storage.example.com/posts/post-1/thumbnail",
      thumbnailWidth: 565,
      thumbnailHeight: 800,
    },
  });
  expect(
    await getEditablePost({
      boardId: otherBoard.id,
      publicId: "public-1",
      userId: "member",
    }),
  ).toEqual({ ok: false, reason: "post_not_found" });
});
