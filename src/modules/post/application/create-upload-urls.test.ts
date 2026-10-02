import { expect, test } from "vitest";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import type { Role } from "@/modules/board/domain/board-member";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import type {
  CreateUploadUrlInput,
  FileStorage,
} from "@/shared/domain/file-storage";
import { makeCreateUploadUrls } from "./create-upload-urls";

const original = { contentType: "application/pdf", size: 1000 };
const thumbnail = { contentType: "image/webp", size: 100 };

function makeFakeFileStorage() {
  const uploadUrlRequests: CreateUploadUrlInput[] = [];
  const unused = async () => {
    throw new Error("このテストでは使わない");
  };
  const fileStorage: FileStorage = {
    async createUploadUrl(input) {
      uploadUrlRequests.push(input);
      return {
        url: `https://storage.example.com/${input.key}`,
        headers: { "content-type": input.contentType },
      };
    },
    createDownloadUrl: unused,
    readHead: unused,
    move: unused,
    delete: unused,
  };
  return { fileStorage, uploadUrlRequests };
}

async function setup() {
  const { repository, members } = makeInMemoryBoardRepository();
  const { fileStorage, uploadUrlRequests } = makeFakeFileStorage();
  let issued = 0;
  const createUploadUrls = makeCreateUploadUrls({
    checkBoardAccess: makeCheckBoardAccess({ boardRepository: repository }),
    fileStorage,
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

  return { createUploadUrls, uploadUrlRequests, board, addMember };
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
