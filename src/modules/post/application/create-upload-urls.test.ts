import { expect, test } from "vitest";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import type { Role } from "@/modules/board/domain/board-member";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import {
  BOARD_FILE_MAX_TOTAL_SIZE,
  BOARD_POST_MAX_COUNT,
  type PostStatus,
} from "@/modules/post/domain/post";
import { makeInMemoryPostRepository } from "@/modules/post/testing/in-memory-post-repository";
import type { CreateUploadUrlInput } from "@/shared/domain/file-storage";
import { makeInMemoryFileStorage } from "@/shared/testing/in-memory-file-storage";
import { makeCreateUploadUrls } from "./create-upload-urls";

const original = { contentType: "application/pdf", size: 1000 };
const thumbnail = { contentType: "image/webp", size: 100 };

async function setup() {
  const { repository, members } = makeInMemoryBoardRepository();
  const { repository: postRepository } = makeInMemoryPostRepository();
  const { fileStorage } = makeInMemoryFileStorage();
  const uploadUrlRequests: CreateUploadUrlInput[] = [];
  let issued = 0;
  const createUploadUrls = makeCreateUploadUrls({
    checkBoardAccess: makeCheckBoardAccess({ boardRepository: repository }),
    fileStorage: {
      ...fileStorage,
      async createUploadUrl(input) {
        uploadUrlRequests.push(input);
        return fileStorage.createUploadUrl(input);
      },
    },
    postRepository,
    generateUploadKey: ({ boardId, userId }) => {
      issued += 1;
      return `pending/${boardId}/${userId}/key-${issued}`;
    },
  });
  const board = await repository.create({
    name: "中野のボード",
    isPublic: false,
  });

  function addMember(role: Role) {
    members.push({
      boardId: board.id,
      userId: "user-1",
      role,
      createdAt: new Date(),
    });
  }

  let posts = 0;
  async function addPost({
    originalSize = 1,
    status = "removed",
  }: {
    originalSize?: number;
    status?: PostStatus;
  } = {}) {
    posts += 1;
    await postRepository.create({
      id: `post-${posts}`,
      publicId: `public-${posts}`,
      boardId: board.id,
      title: "既存の掲示物",
      description: null,
      externalUrl: null,
      originalKey: `boards/${board.id}/posts/post-1/original`,
      originalContentType: "application/pdf",
      originalSize,
      thumbnailKey: `boards/${board.id}/posts/post-1/thumbnail`,
      thumbnailSize: 1,
      thumbnailWidth: 800,
      thumbnailHeight: 800,
      publishFrom: new Date("2026-10-01T00:00:00Z"),
      expiresAt: new Date("2026-11-01T00:00:00Z"),
      status,
    });
  }

  return { createUploadUrls, uploadUrlRequests, board, addMember, addPost };
}

test.each<Role>(["admin", "poster"])(
  "%s のメンバーには、原本とサムネイルのアップロード URL・ヘッダー・キーを返す",
  async (role) => {
    const { createUploadUrls, uploadUrlRequests, board, addMember } =
      await setup();
    addMember(role);

    const result = await createUploadUrls({
      boardId: board.id,
      userId: "user-1",
      original,
      thumbnail,
    });

    const originalKey = `pending/${board.id}/user-1/key-1`;
    const thumbnailKey = `pending/${board.id}/user-1/key-2`;
    expect(result).toEqual({
      ok: true,
      original: {
        uploadUrl: `https://storage.example.com/${originalKey}`,
        uploadHeaders: { "content-type": "application/pdf" },
        key: originalKey,
      },
      thumbnail: {
        uploadUrl: `https://storage.example.com/${thumbnailKey}`,
        uploadHeaders: { "content-type": "image/webp" },
        key: thumbnailKey,
      },
    });
    expect(uploadUrlRequests).toEqual([
      { key: originalKey, ...original },
      { key: thumbnailKey, ...thumbnail },
    ]);
  },
);

test("所属していないユーザーは board_not_found になり、URL を発行しない", async () => {
  const { createUploadUrls, uploadUrlRequests, board, addMember } =
    await setup();
  addMember("admin");

  const result = await createUploadUrls({
    boardId: board.id,
    userId: "user-2",
    original,
    thumbnail,
  });

  expect(result).toEqual({ ok: false, reason: "board_not_found" });
  expect(uploadUrlRequests).toEqual([]);
});

test("存在しない掲示板は board_not_found になり、URL を発行しない", async () => {
  const { createUploadUrls, uploadUrlRequests } = await setup();

  const result = await createUploadUrls({
    boardId: "missing-board",
    userId: "user-1",
    original,
    thumbnail,
  });

  expect(result).toEqual({ ok: false, reason: "board_not_found" });
  expect(uploadUrlRequests).toEqual([]);
});

test.each([
  [
    "許可しない形式の原本",
    { contentType: "image/svg+xml", size: 1000 },
    "content_type_not_allowed",
  ],
  [
    "0 バイトの原本",
    { contentType: "application/pdf", size: 0 },
    "size_invalid",
  ],
])("%s はその理由を返し、URL を発行しない", async (_, file, reason) => {
  const { createUploadUrls, uploadUrlRequests, board, addMember } =
    await setup();
  addMember("poster");

  const result = await createUploadUrls({
    boardId: board.id,
    userId: "user-1",
    original: file,
    thumbnail,
  });

  expect(result).toEqual({ ok: false, reason });
  expect(uploadUrlRequests).toEqual([]);
});

test("サムネイルの形式が合わなければ thumbnail_invalid になり、URL を発行しない", async () => {
  const { createUploadUrls, uploadUrlRequests, board, addMember } =
    await setup();
  addMember("poster");

  const result = await createUploadUrls({
    boardId: board.id,
    userId: "user-1",
    original,
    thumbnail: { contentType: "image/png", size: 100 },
  });

  expect(result).toEqual({ ok: false, reason: "thumbnail_invalid" });
  expect(uploadUrlRequests).toEqual([]);
});

test("掲示板のファイルの合計が上限を超えるなら storage_limit_exceeded になり、URL を発行しない", async () => {
  const { createUploadUrls, uploadUrlRequests, board, addMember, addPost } =
    await setup();
  addMember("poster");
  await addPost({
    originalSize: BOARD_FILE_MAX_TOTAL_SIZE - original.size - thumbnail.size,
  });

  const result = await createUploadUrls({
    boardId: board.id,
    userId: "user-1",
    original,
    thumbnail,
  });

  expect(result).toEqual({ ok: false, reason: "storage_limit_exceeded" });
  expect(uploadUrlRequests).toEqual([]);
});

test("掲示物の数が上限に達していると post_limit_exceeded になり、URL を発行しない", async () => {
  const { createUploadUrls, uploadUrlRequests, board, addMember, addPost } =
    await setup();
  addMember("poster");
  for (let i = 0; i < BOARD_POST_MAX_COUNT; i++) {
    await addPost({ status: "published" });
  }

  const result = await createUploadUrls({
    boardId: board.id,
    userId: "user-1",
    original,
    thumbnail,
  });

  expect(result).toEqual({ ok: false, reason: "post_limit_exceeded" });
  expect(uploadUrlRequests).toEqual([]);
});
