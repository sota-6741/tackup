import { expect, test } from "vitest";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import type { Role } from "@/modules/board/domain/board-member";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import {
  BOARD_FILE_MAX_TOTAL_SIZE,
  BOARD_POST_MAX_COUNT,
} from "@/modules/post/domain/post";
import type { CreatePostData } from "@/modules/post/domain/post-repository";
import { makeInMemoryPostRepository } from "@/modules/post/testing/in-memory-post-repository";
import type { FileStorage } from "@/shared/domain/file-storage";
import { makeInMemoryFileStorage } from "@/shared/testing/in-memory-file-storage";
import { makeInMemoryUnitOfWork } from "@/shared/testing/in-memory-unit-of-work";
import { makeRegisterPost } from "./register-post";

type RegisterPostUnitOfWork = Parameters<
  typeof makeRegisterPost
>[0]["unitOfWork"];

const UUID_1 = "11111111-1111-4111-8111-111111111111";
const UUID_2 = "22222222-2222-4222-8222-222222222222";

const PDF = new TextEncoder().encode("%PDF-1.7 掲示物の原本");
const WEBP = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 サムネイル");
const HTML = new TextEncoder().encode("<html><script>alert(1)</script>");

async function setup({ role = "poster" }: { role?: Role } = {}) {
  const { repository: boardRepository, members } =
    makeInMemoryBoardRepository();
  const { repository: postRepository, posts } = makeInMemoryPostRepository();
  const { fileStorage, files, put } = makeInMemoryFileStorage();
  const board = await boardRepository.create({
    name: "中野のボード",
    isPublic: true,
  });
  members.push({
    boardId: board.id,
    userId: "user-1",
    role,
    createdAt: new Date(),
  });

  const originalKey = `pending/${board.id}/user-1/${UUID_1}`;
  const thumbnailKey = `pending/${board.id}/user-1/${UUID_2}`;
  put({ key: originalKey, bytes: PDF, contentType: "application/pdf" });
  put({ key: thumbnailKey, bytes: WEBP, contentType: "image/webp" });

  const unitOfWork: RegisterPostUnitOfWork = makeInMemoryUnitOfWork({
    boardRepository,
    postRepository,
  });

  function make(
    overrides: {
      fileStorage?: FileStorage;
      unitOfWork?: RegisterPostUnitOfWork;
    } = {},
  ) {
    return makeRegisterPost({
      checkBoardAccess: makeCheckBoardAccess({ boardRepository }),
      fileStorage: overrides.fileStorage ?? fileStorage,
      unitOfWork: overrides.unitOfWork ?? unitOfWork,
      generatePostId: () => "post-1",
      generatePublicId: () => "public-1",
    });
  }

  const input = {
    boardId: board.id,
    userId: "user-1",
    title: " 夏祭りのお知らせ ",
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-11-01T00:00:00Z"),
    originalKey,
    thumbnailKey,
    thumbnailWidth: 565,
    thumbnailHeight: 800,
  };

  async function addPost(overrides: Partial<CreatePostData>) {
    const id = `existing-${posts.length + 1}`;
    await postRepository.create({
      id,
      publicId: id,
      boardId: board.id,
      title: "既存の掲示物",
      originalKey: `boards/${board.id}/posts/${id}/original`,
      originalContentType: "application/pdf",
      originalSize: 1,
      thumbnailKey: `boards/${board.id}/posts/${id}/thumbnail`,
      thumbnailSize: 1,
      thumbnailWidth: 800,
      thumbnailHeight: 800,
      publishFrom: input.publishFrom,
      expiresAt: input.expiresAt,
      status: "published",
      ...overrides,
    });
  }

  const finalKeys = {
    originalKey: `boards/${board.id}/posts/post-1/original`,
    thumbnailKey: `boards/${board.id}/posts/post-1/thumbnail`,
  };

  return {
    registerPost: make(),
    make,
    input,
    board,
    posts,
    files,
    fileStorage,
    put,
    addPost,
    finalKeys,
  };
}

test.each<Role>(["admin", "poster"])(
  "%s は掲示物を登録でき、ファイルは正式な場所へ移る",
  async (role) => {
    const { registerPost, input, board, posts, files, finalKeys } = await setup(
      {
        role,
      },
    );

    const result = await registerPost(input);

    expect(result).toEqual({ ok: true, post: posts[0] });
    expect(posts[0]).toMatchObject({
      id: "post-1",
      publicId: "public-1",
      boardId: board.id,
      title: "夏祭りのお知らせ",
      originalKey: finalKeys.originalKey,
      originalContentType: "application/pdf",
      originalSize: PDF.length,
      thumbnailKey: finalKeys.thumbnailKey,
      thumbnailSize: WEBP.length,
      thumbnailWidth: 565,
      thumbnailHeight: 800,
      publishFrom: input.publishFrom,
      expiresAt: input.expiresAt,
      status: "published",
    });
    expect([...files.keys()].sort()).toEqual([
      finalKeys.originalKey,
      finalKeys.thumbnailKey,
    ]);
  },
);

test("所属していないユーザーは board_not_found になり、ファイルに触れない", async () => {
  const { registerPost, input, posts, files } = await setup();

  const result = await registerPost({ ...input, userId: "user-2" });

  expect(result).toEqual({ ok: false, reason: "board_not_found" });
  expect(posts).toEqual([]);
  expect([...files.keys()]).toEqual([input.originalKey, input.thumbnailKey]);
});

test.each([
  ["空のタイトル", { title: " " }, "title_empty"],
  ["長すぎるタイトル", { title: "あ".repeat(101) }, "title_too_long"],
  [
    "掲示開始より前の掲示終了",
    { expiresAt: new Date("2026-09-30T00:00:00Z") },
    "expires_before_publish",
  ],
  ["読めない日時", { publishFrom: new Date("invalid") }, "period_invalid"],
])("%s はその理由を返し、登録しない", async (_, overrides, reason) => {
  const { registerPost, input, posts } = await setup();

  const result = await registerPost({ ...input, ...overrides });

  expect(result).toEqual({ ok: false, reason });
  expect(posts).toEqual([]);
});

test.each([
  ["ほかの掲示板のキー", { originalKey: `pending/board-9/user-1/${UUID_1}` }],
  [
    "ほかのユーザーのキー",
    { thumbnailKey: `pending/board-1/user-2/${UUID_2}` },
  ],
  ["正式な場所のキー", { originalKey: "boards/board-1/posts/post-9/original" }],
  ["範囲の外のサムネイルの幅", { thumbnailWidth: 801 }],
  ["整数でないサムネイルの高さ", { thumbnailHeight: 1.5 }],
])("%s は file_invalid になり、ファイルに触れない", async (_, overrides) => {
  const { registerPost, input, posts, files } = await setup();

  const result = await registerPost({ ...input, ...overrides });

  expect(result).toEqual({ ok: false, reason: "file_invalid" });
  expect(posts).toEqual([]);
  expect(files.size).toBe(2);
});

test("原本とサムネイルに同じキーを渡すと file_invalid になる", async () => {
  const { registerPost, input, posts } = await setup();

  const result = await registerPost({
    ...input,
    thumbnailKey: input.originalKey,
  });

  expect(result).toEqual({ ok: false, reason: "file_invalid" });
  expect(posts).toEqual([]);
});

test.each([
  [
    "PDF と申告した HTML の原本",
    (key: { originalKey: string }) => ({
      key: key.originalKey,
      bytes: HTML,
      contentType: "application/pdf",
    }),
  ],
  [
    "許可しない形式（SVG）の原本",
    (key: { originalKey: string }) => ({
      key: key.originalKey,
      bytes: new TextEncoder().encode(
        "<svg xmlns='http://www.w3.org/2000/svg'/>",
      ),
      contentType: "image/svg+xml",
    }),
  ],
  [
    "WebP と申告した PDF のサムネイル",
    (key: { thumbnailKey: string }) => ({
      key: key.thumbnailKey,
      bytes: PDF,
      contentType: "image/webp",
    }),
  ],
  [
    "サムネイルに許可しない形式（PDF）",
    (key: { thumbnailKey: string }) => ({
      key: key.thumbnailKey,
      bytes: PDF,
      contentType: "application/pdf",
    }),
  ],
])("%s は file_invalid になり、両方のファイルを消す", async (_, replace) => {
  const { registerPost, input, posts, files, put } = await setup();
  put(replace(input));

  const result = await registerPost(input);

  expect(result).toEqual({ ok: false, reason: "file_invalid" });
  expect(posts).toEqual([]);
  expect(files.size).toBe(0);
});

test("アップロードされていないキーは file_invalid になる", async () => {
  const { registerPost, input, posts, files } = await setup();
  files.delete(input.thumbnailKey);

  const result = await registerPost(input);

  expect(result).toEqual({ ok: false, reason: "file_invalid" });
  expect(posts).toEqual([]);
  expect(files.size).toBe(0);
});

test("確認のあとにサムネイルが差し替えられたら登録せず、移した原本も消す", async () => {
  const { make, input, posts, files, fileStorage, put } = await setup();
  const registerPost = make({
    fileStorage: {
      ...fileStorage,
      async readHead(request) {
        const head = await fileStorage.readHead(request);
        if (request.key === input.thumbnailKey) {
          put({
            key: input.thumbnailKey,
            bytes: HTML,
            contentType: "image/webp",
          });
        }
        return head;
      },
    },
  });

  const result = await registerPost(input);

  expect(result).toEqual({ ok: false, reason: "file_invalid" });
  expect(posts).toEqual([]);
  expect(files.size).toBe(0);
});

test("掲示物の数が上限に達していると post_limit_exceeded になり、移したファイルを消す", async () => {
  const { registerPost, input, posts, files, addPost } = await setup();
  for (let i = 0; i < BOARD_POST_MAX_COUNT; i++) await addPost({});

  const result = await registerPost(input);

  expect(result).toEqual({ ok: false, reason: "post_limit_exceeded" });
  expect(posts).toHaveLength(BOARD_POST_MAX_COUNT);
  expect(files.size).toBe(0);
});

test("撤去済みの掲示物は、数の上限に数えない", async () => {
  const { registerPost, input, addPost } = await setup();
  for (let i = 0; i < BOARD_POST_MAX_COUNT; i++) {
    await addPost({ status: "removed" });
  }

  expect((await registerPost(input)).ok).toBe(true);
});

test("ファイルの合計が上限を超えると storage_limit_exceeded になり、移したファイルを消す", async () => {
  const { registerPost, input, files, addPost } = await setup();
  await addPost({
    originalSize: BOARD_FILE_MAX_TOTAL_SIZE - PDF.length - WEBP.length,
    thumbnailSize: 1,
  });

  const result = await registerPost(input);

  expect(result).toEqual({ ok: false, reason: "storage_limit_exceeded" });
  expect(files.size).toBe(0);
});

test("ファイルの合計が上限ちょうどなら登録できる", async () => {
  const { registerPost, input, addPost } = await setup();
  await addPost({
    originalSize: BOARD_FILE_MAX_TOTAL_SIZE - PDF.length - WEBP.length - 1,
    thumbnailSize: 1,
  });

  expect((await registerPost(input)).ok).toBe(true);
});

test("Post の登録が想定外に失敗したら、移したファイルを消してから投げ直す", async () => {
  const { make, input, files } = await setup();
  const failure = new Error("DB が止まっている");
  const registerPost = make({
    unitOfWork: {
      run: async () => {
        throw failure;
      },
    },
  });

  await expect(registerPost(input)).rejects.toBe(failure);
  expect(files.size).toBe(0);
});
