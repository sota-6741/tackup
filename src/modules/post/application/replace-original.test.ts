import { expect, test } from "vitest";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import type { Role } from "@/modules/board/domain/board-member";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { BOARD_FILE_MAX_TOTAL_SIZE } from "@/modules/post/domain/post";
import type { CreatePostData } from "@/modules/post/domain/post-repository";
import { makeInMemoryPostRepository } from "@/modules/post/testing/in-memory-post-repository";
import type { FileStorage } from "@/shared/domain/file-storage";
import { makeInMemoryFileStorage } from "@/shared/testing/in-memory-file-storage";
import { makeInMemoryLogger } from "@/shared/testing/in-memory-logger";
import { makeInMemoryUnitOfWork } from "@/shared/testing/in-memory-unit-of-work";
import { makeReplaceOriginal } from "./replace-original";

type ReplaceOriginalUnitOfWork = Parameters<
  typeof makeReplaceOriginal
>[0]["unitOfWork"];

const UUID_1 = "11111111-1111-4111-8111-111111111111";
const UUID_2 = "22222222-2222-4222-8222-222222222222";

const PDF = new TextEncoder().encode("%PDF-1.7 掲示物の原本");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 サムネイル");
const HTML = new TextEncoder().encode("<html><script>alert(1)</script>");

async function setup({
  role = "poster",
  post: postOverrides = {},
}: {
  role?: Role;
  post?: Partial<CreatePostData>;
} = {}) {
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

  const previousKeys = {
    originalKey: `boards/${board.id}/posts/post-1/original`,
    thumbnailKey: `boards/${board.id}/posts/post-1/thumbnail`,
  };
  await postRepository.create({
    id: "post-1",
    publicId: "public-1",
    boardId: board.id,
    title: "夏祭りのお知らせ",
    description: null,
    externalUrl: null,
    originalKey: previousKeys.originalKey,
    originalContentType: "application/pdf",
    originalSize: PDF.length,
    thumbnailKey: previousKeys.thumbnailKey,
    thumbnailSize: WEBP.length,
    thumbnailWidth: 565,
    thumbnailHeight: 800,
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: null,
    status: "published",
    ...postOverrides,
  });
  put({
    key: previousKeys.originalKey,
    bytes: PDF,
    contentType: "application/pdf",
  });
  put({
    key: previousKeys.thumbnailKey,
    bytes: WEBP,
    contentType: "image/webp",
  });

  const originalKey = `pending/${board.id}/user-1/${UUID_1}`;
  const thumbnailKey = `pending/${board.id}/user-1/${UUID_2}`;
  put({ key: originalKey, bytes: PNG, contentType: "image/png" });
  put({ key: thumbnailKey, bytes: WEBP, contentType: "image/webp" });

  const { logger, entries: logs } = makeInMemoryLogger();

  const unitOfWork: ReplaceOriginalUnitOfWork = makeInMemoryUnitOfWork({
    boardRepository,
    postRepository,
  });

  function make(
    overrides: {
      fileStorage?: FileStorage;
      unitOfWork?: ReplaceOriginalUnitOfWork;
    } = {},
  ) {
    return makeReplaceOriginal({
      checkBoardAccess: makeCheckBoardAccess({ boardRepository }),
      fileStorage: overrides.fileStorage ?? fileStorage,
      postRepository,
      unitOfWork: overrides.unitOfWork ?? unitOfWork,
      generateRevision: () => "rev-1",
      logger,
    });
  }

  const input = {
    publicId: "public-1",
    userId: "user-1",
    originalKey,
    thumbnailKey,
    thumbnailWidth: 800,
    thumbnailHeight: 600,
  };

  const newKeys = {
    originalKey: `boards/${board.id}/posts/post-1/rev-1/original`,
    thumbnailKey: `boards/${board.id}/posts/post-1/rev-1/thumbnail`,
  };

  return {
    replaceOriginal: make(),
    make,
    input,
    board,
    posts,
    files,
    fileStorage,
    put,
    previousKeys,
    newKeys,
    postRepository,
    logs,
  };
}

test.each<Role>(["admin", "poster"])(
  "%s は原本を差し替えられ、掲示物は新しいファイルを指し、今のファイルは消える",
  async (role) => {
    const { replaceOriginal, input, board, posts, files, newKeys } =
      await setup({ role });

    const result = await replaceOriginal(input);

    expect(result).toEqual({ ok: true, boardId: board.id });
    expect(posts[0]).toMatchObject({
      originalKey: newKeys.originalKey,
      originalContentType: "image/png",
      originalSize: PNG.length,
      thumbnailKey: newKeys.thumbnailKey,
      thumbnailSize: WEBP.length,
      thumbnailWidth: 800,
      thumbnailHeight: 600,
      title: "夏祭りのお知らせ",
    });
    expect([...files.keys()].sort()).toEqual(
      [newKeys.originalKey, newKeys.thumbnailKey].sort(),
    );
  },
);

test("下書きの掲示物も差し替えられる", async () => {
  const { replaceOriginal, input } = await setup({ post: { status: "draft" } });

  expect((await replaceOriginal(input)).ok).toBe(true);
});

test.each([
  ["ない掲示物", { publicId: "public-9" }],
  ["所属していないユーザー", { userId: "user-2" }],
])("%s は post_not_found になり、ファイルに触れない", async (_, overrides) => {
  const { replaceOriginal, input, files, previousKeys } = await setup();

  const result = await replaceOriginal({ ...input, ...overrides });

  expect(result).toEqual({ ok: false, reason: "post_not_found" });
  expect([...files.keys()].sort()).toEqual(
    [
      previousKeys.originalKey,
      previousKeys.thumbnailKey,
      input.originalKey,
      input.thumbnailKey,
    ].sort(),
  );
});

test("撤去済みの掲示物は post_not_editable になり、今のファイルを指したままになる", async () => {
  const { replaceOriginal, input, posts, previousKeys } = await setup({
    post: { status: "removed" },
  });

  const result = await replaceOriginal(input);

  expect(result).toEqual({ ok: false, reason: "post_not_editable" });
  expect(posts[0]).toMatchObject(previousKeys);
});

test.each([
  ["ほかの掲示板のキー", { originalKey: `pending/board-9/user-1/${UUID_1}` }],
  [
    "ほかのユーザーのキー",
    { thumbnailKey: `pending/board-1/user-2/${UUID_2}` },
  ],
  ["正式な場所のキー", { originalKey: "boards/board-1/posts/post-1/original" }],
  ["範囲の外のサムネイルの幅", { thumbnailWidth: 801 }],
])("%s は file_invalid になり、ファイルに触れない", async (_, overrides) => {
  const { replaceOriginal, input, posts, files, previousKeys } = await setup();

  const result = await replaceOriginal({ ...input, ...overrides });

  expect(result).toEqual({ ok: false, reason: "file_invalid" });
  expect(posts[0]).toMatchObject(previousKeys);
  expect(files.size).toBe(4);
});

test("中身が申告と違う原本は file_invalid になり、アップロードされたファイルを消す", async () => {
  const { replaceOriginal, input, posts, files, put, previousKeys } =
    await setup();
  put({ key: input.originalKey, bytes: HTML, contentType: "image/png" });

  const result = await replaceOriginal(input);

  expect(result).toEqual({ ok: false, reason: "file_invalid" });
  expect(posts[0]).toMatchObject(previousKeys);
  expect([...files.keys()].sort()).toEqual(
    [previousKeys.originalKey, previousKeys.thumbnailKey].sort(),
  );
});

test("容量の上限を超えるなら storage_limit_exceeded になり、新しいファイルを消して今のファイルを残す", async () => {
  const { replaceOriginal, input, posts, files, postRepository, previousKeys } =
    await setup();
  await postRepository.create({
    ...posts[0],
    id: "post-2",
    publicId: "public-2",
    originalSize: BOARD_FILE_MAX_TOTAL_SIZE - PDF.length - WEBP.length,
  });

  const result = await replaceOriginal(input);

  expect(result).toEqual({ ok: false, reason: "storage_limit_exceeded" });
  expect(posts[0]).toMatchObject(previousKeys);
  expect([...files.keys()].sort()).toEqual(
    [previousKeys.originalKey, previousKeys.thumbnailKey].sort(),
  );
});

test("今のファイルの分は容量から除いて数える", async () => {
  const { replaceOriginal, input, posts, postRepository } = await setup();
  // 今のファイル（PDF + WEBP）を除けば、新しいファイル（PNG + WEBP）がちょうど収まる。
  await postRepository.create({
    ...posts[0],
    id: "post-2",
    publicId: "public-2",
    originalSize: BOARD_FILE_MAX_TOTAL_SIZE - PNG.length - 2 * WEBP.length,
    thumbnailSize: WEBP.length,
  });

  expect((await replaceOriginal(input)).ok).toBe(true);
});

test("確認のあとに撤去済みにされたら post_not_editable になり、新しいファイルを消す", async () => {
  const { make, input, posts, files, fileStorage, previousKeys } =
    await setup();
  const replaceOriginal = make({
    fileStorage: {
      ...fileStorage,
      async move(request) {
        posts[0].status = "removed";
        return fileStorage.move(request);
      },
    },
  });

  const result = await replaceOriginal(input);

  expect(result).toEqual({ ok: false, reason: "post_not_editable" });
  expect(posts[0]).toMatchObject(previousKeys);
  expect([...files.keys()].sort()).toEqual(
    [previousKeys.originalKey, previousKeys.thumbnailKey].sort(),
  );
});

test("確認のあとにサムネイルが差し替えられたら file_invalid になり、移した原本も消す", async () => {
  const { make, input, posts, files, fileStorage, put, previousKeys } =
    await setup();
  const replaceOriginal = make({
    fileStorage: {
      ...fileStorage,
      async readHead(request) {
        const head = await fileStorage.readHead(request);
        if (request.key === input.thumbnailKey) {
          put({
            key: input.thumbnailKey,
            bytes: WEBP,
            contentType: "image/webp",
          });
        }
        return head;
      },
    },
  });

  const result = await replaceOriginal(input);

  expect(result).toEqual({ ok: false, reason: "file_invalid" });
  expect(posts[0]).toMatchObject(previousKeys);
  expect([...files.keys()].sort()).toEqual(
    [previousKeys.originalKey, previousKeys.thumbnailKey].sort(),
  );
});

test("今のファイルを消すのに失敗しても、差し替えは成功として扱い、残ったキーをログに出す", async () => {
  const { make, input, posts, fileStorage, newKeys, previousKeys, logs } =
    await setup();
  const replaceOriginal = make({
    fileStorage: {
      ...fileStorage,
      async delete(key) {
        if (key === previousKeys.originalKey) throw new Error("storage down");
        return fileStorage.delete(key);
      },
    },
  });

  const result = await replaceOriginal(input);

  expect(result.ok).toBe(true);
  expect(posts[0]).toMatchObject(newKeys);
  expect(logs).toEqual([
    {
      level: "error",
      message: "参照されないファイルを消せませんでした",
      options: {
        error: new Error("storage down"),
        fields: {
          operation: "replaceOriginal",
          keys: [previousKeys.originalKey, previousKeys.thumbnailKey],
        },
      },
    },
  ]);
});

test("差し替えられない理由で終わったあとに新しいファイルを消せなくても、その理由を返す", async () => {
  const { make, input, posts, fileStorage, newKeys, previousKeys, logs } =
    await setup();
  const replaceOriginal = make({
    fileStorage: {
      ...fileStorage,
      async move(request) {
        posts[0].status = "removed";
        return fileStorage.move(request);
      },
      async delete(key) {
        if (key === newKeys.originalKey) throw new Error("storage down");
        return fileStorage.delete(key);
      },
    },
  });

  const result = await replaceOriginal(input);

  expect(result).toEqual({ ok: false, reason: "post_not_editable" });
  expect(posts[0]).toMatchObject(previousKeys);
  expect(logs).toHaveLength(1);
});

test("DB の書き換えで例外が起きたら、新しいファイルを消して投げ直す", async () => {
  const { make, input, files, previousKeys } = await setup();
  const replaceOriginal = make({
    unitOfWork: {
      run: async () => {
        throw new Error("db down");
      },
    },
  });

  await expect(replaceOriginal(input)).rejects.toThrow("db down");
  expect([...files.keys()].sort()).toEqual(
    [previousKeys.originalKey, previousKeys.thumbnailKey].sort(),
  );
});
