import { expect, test } from "vitest";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import type { CreatePostData } from "@/modules/post/domain/post-repository";
import { makeInMemoryPostRepository } from "@/modules/post/testing/in-memory-post-repository";
import { makeInMemoryFileStorage } from "@/shared/testing/in-memory-file-storage";
import { makeFindAccessiblePost } from "./find-accessible-post";
import { makeGetPostDetail } from "./get-post-detail";
import { makeGetPostFileUrl } from "./get-post-file-url";

const NOW = new Date("2026-10-15T00:00:00Z");
const STORAGE = "https://storage.example.com";

async function setup({
  isPublic,
  post: overrides = {},
}: {
  isPublic: boolean;
  post?: Partial<CreatePostData>;
}) {
  const { repository: boardRepository, members } =
    makeInMemoryBoardRepository();
  const { repository: postRepository } = makeInMemoryPostRepository();
  const { fileStorage } = makeInMemoryFileStorage();
  const board = await boardRepository.create({
    name: "中野のボード",
    isPublic,
  });
  members.push({
    boardId: board.id,
    userId: "member",
    role: "poster",
    createdAt: new Date(),
  });
  const post = await postRepository.create({
    id: "post-1",
    publicId: "public-1",
    boardId: board.id,
    title: "夏祭りのお知らせ",
    description: "雨天中止です",
    externalUrl: "https://example.com/festival",
    originalKey: "boards/board-1/posts/post-1/original",
    originalContentType: "application/pdf",
    originalSize: 1000,
    thumbnailKey: "boards/board-1/posts/post-1/thumbnail",
    thumbnailSize: 100,
    thumbnailWidth: 565,
    thumbnailHeight: 800,
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-11-01T00:00:00Z"),
    status: "published",
    ...overrides,
  });
  const findAccessiblePost = makeFindAccessiblePost({
    postRepository,
    boardRepository,
    now: () => NOW,
  });
  return {
    getPostDetail: makeGetPostDetail({ findAccessiblePost, fileStorage }),
    getPostFileUrl: makeGetPostFileUrl({ findAccessiblePost, fileStorage }),
    board,
    post,
  };
}

test("公開掲示板の公開中の掲示物は、ログインしていない人にも詳細を返す。内部の ID とキーは含めない", async () => {
  const { getPostDetail } = await setup({ isPublic: true });

  const result = await getPostDetail({ publicId: "public-1", userId: null });

  expect(result).toEqual({
    ok: true,
    post: {
      publicId: "public-1",
      title: "夏祭りのお知らせ",
      description: "雨天中止です",
      externalUrl: "https://example.com/festival",
      publishFrom: new Date("2026-10-01T00:00:00Z"),
      expiresAt: new Date("2026-11-01T00:00:00Z"),
      state: "published",
      isPdf: true,
      image: {
        url: `${STORAGE}/boards/board-1/posts/post-1/thumbnail`,
        width: 565,
        height: 800,
      },
      boardId: null,
    },
  });
});

test("原本が画像なら、サムネイルではなく原本を表示用の画像にする", async () => {
  const { getPostDetail } = await setup({
    isPublic: true,
    post: { originalContentType: "image/png" },
  });

  const result = await getPostDetail({ publicId: "public-1", userId: null });

  expect(result).toMatchObject({
    ok: true,
    post: {
      isPdf: false,
      image: { url: `${STORAGE}/boards/board-1/posts/post-1/original` },
    },
  });
});

test("メンバーには、掲示板へ戻るための掲示板の ID も返す", async () => {
  const { getPostDetail, board } = await setup({ isPublic: true });

  const result = await getPostDetail({
    publicId: "public-1",
    userId: "member",
  });

  expect(result).toMatchObject({ ok: true, post: { boardId: board.id } });
});

test("期限切れの掲示物は、メンバーには状態を付けて返し、それ以外の人には post_not_found を返す", async () => {
  const { getPostDetail } = await setup({
    isPublic: true,
    post: { expiresAt: new Date("2026-10-10T00:00:00Z") },
  });

  expect(
    await getPostDetail({ publicId: "public-1", userId: "member" }),
  ).toMatchObject({ ok: true, post: { state: "expired" } });
  for (const userId of ["stranger", null]) {
    expect(await getPostDetail({ publicId: "public-1", userId })).toEqual({
      ok: false,
      reason: "post_not_found",
    });
  }
});

test("非公開の掲示板の掲示物は、メンバーだけに返す。ログインしていない人にはログインを求める", async () => {
  const { getPostDetail } = await setup({ isPublic: false });

  expect(
    (await getPostDetail({ publicId: "public-1", userId: "member" })).ok,
  ).toBe(true);
  expect(
    await getPostDetail({ publicId: "public-1", userId: "stranger" }),
  ).toEqual({ ok: false, reason: "post_not_found" });
  expect(await getPostDetail({ publicId: "public-1", userId: null })).toEqual({
    ok: false,
    reason: "sign_in_required",
  });
});

test("存在しない掲示物は、ログインしていなくても post_not_found になる", async () => {
  const { getPostDetail } = await setup({ isPublic: false });

  expect(await getPostDetail({ publicId: "unknown", userId: null })).toEqual({
    ok: false,
    reason: "post_not_found",
  });
});

test("原本を開く URL と、タイトルを付けたファイル名で保存する URL を返す", async () => {
  const { getPostFileUrl } = await setup({ isPublic: true });
  const input = { publicId: "public-1", userId: null };

  expect(await getPostFileUrl({ ...input, mode: "open" })).toEqual({
    ok: true,
    url: `${STORAGE}/boards/board-1/posts/post-1/original`,
  });
  expect(await getPostFileUrl({ ...input, mode: "save" })).toEqual({
    ok: true,
    url: `${STORAGE}/boards/board-1/posts/post-1/original?save=${encodeURIComponent("夏祭りのお知らせ.pdf")}`,
  });
});

test("見られない人には、原本の URL を発行しない", async () => {
  const { getPostFileUrl } = await setup({ isPublic: false });

  expect(
    await getPostFileUrl({
      publicId: "public-1",
      userId: "stranger",
      mode: "open",
    }),
  ).toEqual({ ok: false, reason: "post_not_found" });
  expect(
    await getPostFileUrl({ publicId: "public-1", userId: null, mode: "save" }),
  ).toEqual({ ok: false, reason: "sign_in_required" });
});
