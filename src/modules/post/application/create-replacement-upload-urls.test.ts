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
import { makeCreateReplacementUploadUrls } from "./create-replacement-upload-urls";

const original = { contentType: "image/png", size: 1000 };
const thumbnail = { contentType: "image/webp", size: 100 };

async function setup({
  role = "poster",
  status = "published",
}: {
  role?: Role;
  status?: PostStatus;
} = {}) {
  const { repository, members } = makeInMemoryBoardRepository();
  const { repository: postRepository } = makeInMemoryPostRepository();
  const { fileStorage } = makeInMemoryFileStorage();
  const uploadUrlRequests: CreateUploadUrlInput[] = [];
  let issued = 0;
  const createReplacementUploadUrls = makeCreateReplacementUploadUrls({
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
  members.push({
    boardId: board.id,
    userId: "user-1",
    role,
    createdAt: new Date(),
  });

  let posts = 0;
  async function addPost({
    originalSize = 500,
    status = "published",
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
      originalKey: `boards/${board.id}/posts/post-${posts}/original`,
      originalContentType: "application/pdf",
      originalSize,
      thumbnailKey: `boards/${board.id}/posts/post-${posts}/thumbnail`,
      thumbnailSize: 50,
      thumbnailWidth: 800,
      thumbnailHeight: 800,
      publishFrom: new Date("2026-10-01T00:00:00Z"),
      expiresAt: null,
      status,
    });
  }
  await addPost({ status });

  const input = { publicId: "public-1", userId: "user-1", original, thumbnail };

  return {
    createReplacementUploadUrls,
    uploadUrlRequests,
    board,
    addPost,
    input,
  };
}

test.each<Role>(["admin", "poster"])(
  "%s のメンバーには、その掲示板の自分用のキーでアップロード URL を返す",
  async (role) => {
    const { createReplacementUploadUrls, uploadUrlRequests, board, input } =
      await setup({ role });

    const result = await createReplacementUploadUrls(input);

    const originalKey = `pending/${board.id}/user-1/key-1`;
    const thumbnailKey = `pending/${board.id}/user-1/key-2`;
    expect(result).toEqual({
      ok: true,
      original: {
        uploadUrl: `https://storage.example.com/${originalKey}`,
        uploadHeaders: { "content-type": "image/png" },
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

test.each([
  ["ない掲示物", { publicId: "public-9" }],
  ["所属していないユーザー", { userId: "user-2" }],
])("%s は post_not_found になり、URL を発行しない", async (_, overrides) => {
  const { createReplacementUploadUrls, uploadUrlRequests, input } =
    await setup();

  const result = await createReplacementUploadUrls({ ...input, ...overrides });

  expect(result).toEqual({ ok: false, reason: "post_not_found" });
  expect(uploadUrlRequests).toEqual([]);
});

test("撤去済みの掲示物は post_not_editable になる", async () => {
  const { createReplacementUploadUrls, uploadUrlRequests, input } = await setup(
    { status: "removed" },
  );

  const result = await createReplacementUploadUrls(input);

  expect(result).toEqual({ ok: false, reason: "post_not_editable" });
  expect(uploadUrlRequests).toEqual([]);
});

test.each([
  [
    "許可しない形式の原本",
    { original: { contentType: "image/svg+xml", size: 1000 } },
    "content_type_not_allowed",
  ],
  [
    "許可しない形式のサムネイル",
    { thumbnail: { contentType: "image/png", size: 100 } },
    "thumbnail_invalid",
  ],
])("%s はその理由を返し、URL を発行しない", async (_, overrides, reason) => {
  const { createReplacementUploadUrls, uploadUrlRequests, input } =
    await setup();

  const result = await createReplacementUploadUrls({ ...input, ...overrides });

  expect(result).toEqual({ ok: false, reason });
  expect(uploadUrlRequests).toEqual([]);
});

test("掲示物の数が上限でも、差し替えでは数が増えないので発行する", async () => {
  const { createReplacementUploadUrls, addPost, input } = await setup();
  for (let i = 1; i < BOARD_POST_MAX_COUNT; i += 1) {
    await addPost({ originalSize: 1 });
  }

  expect((await createReplacementUploadUrls(input)).ok).toBe(true);
});

test("今のファイルの分を除いても容量の上限を超えるなら、storage_limit_exceeded になる", async () => {
  const { createReplacementUploadUrls, uploadUrlRequests, addPost, input } =
    await setup();
  // 今のファイル（500 + 50）を除くと、新しいファイル（1000 + 100）がちょうど収まる。
  await addPost({
    originalSize: BOARD_FILE_MAX_TOTAL_SIZE - 1000 - 100 - 50,
  });

  expect((await createReplacementUploadUrls(input)).ok).toBe(true);

  const over = await createReplacementUploadUrls({
    ...input,
    original: { ...original, size: 1001 },
  });
  expect(over).toEqual({ ok: false, reason: "storage_limit_exceeded" });
  expect(uploadUrlRequests).toHaveLength(2);
});
