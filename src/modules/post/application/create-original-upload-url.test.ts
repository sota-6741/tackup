import { expect, test } from "vitest";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import type { Role } from "@/modules/board/domain/board-member";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import type {
  CreateUploadUrlInput,
  FileStorage,
} from "@/shared/domain/file-storage";
import { makeCreateOriginalUploadUrl } from "./create-original-upload-url";

const KEY = "pending/test-key";
const UPLOAD_URL = "https://storage.example.com/upload";
const UPLOAD_HEADERS = { "content-type": "application/pdf" };

function makeFakeFileStorage() {
  const uploadUrlRequests: CreateUploadUrlInput[] = [];
  const fileStorage: FileStorage = {
    async createUploadUrl(input) {
      uploadUrlRequests.push(input);
      return { url: UPLOAD_URL, headers: UPLOAD_HEADERS };
    },
    async createDownloadUrl() {
      throw new Error("このテストでは使わない");
    },
  };
  return { fileStorage, uploadUrlRequests };
}

async function setup() {
  const { repository, members } = makeInMemoryBoardRepository();
  const { fileStorage, uploadUrlRequests } = makeFakeFileStorage();
  const createOriginalUploadUrl = makeCreateOriginalUploadUrl({
    checkBoardAccess: makeCheckBoardAccess({ boardRepository: repository }),
    fileStorage,
    generateUploadKey: () => KEY,
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

  return { createOriginalUploadUrl, uploadUrlRequests, board, addMember };
}

test.each<Role>(["admin", "poster"])(
  "%s のメンバーにはアップロード URL・ヘッダー・キーを返す",
  async (role) => {
    const { createOriginalUploadUrl, uploadUrlRequests, board, addMember } =
      await setup();
    addMember(role);

    const result = await createOriginalUploadUrl({
      boardId: board.id,
      userId: "user-1",
      contentType: "application/pdf",
      size: 1000,
    });

    expect(result).toEqual({
      ok: true,
      uploadUrl: UPLOAD_URL,
      uploadHeaders: UPLOAD_HEADERS,
      key: KEY,
    });
    expect(uploadUrlRequests).toEqual([
      { key: KEY, contentType: "application/pdf", size: 1000 },
    ]);
  },
);

test("所属していないユーザーは board_not_found になり、URL を発行しない", async () => {
  const { createOriginalUploadUrl, uploadUrlRequests, board, addMember } =
    await setup();
  addMember("admin");

  const result = await createOriginalUploadUrl({
    boardId: board.id,
    userId: "user-2",
    contentType: "application/pdf",
    size: 1000,
  });

  expect(result).toEqual({ ok: false, reason: "board_not_found" });
  expect(uploadUrlRequests).toEqual([]);
});

test("存在しない掲示板は board_not_found になり、URL を発行しない", async () => {
  const { createOriginalUploadUrl, uploadUrlRequests } = await setup();

  const result = await createOriginalUploadUrl({
    boardId: "missing-board",
    userId: "user-1",
    contentType: "application/pdf",
    size: 1000,
  });

  expect(result).toEqual({ ok: false, reason: "board_not_found" });
  expect(uploadUrlRequests).toEqual([]);
});

test("許可しない形式は content_type_not_allowed になり、URL を発行しない", async () => {
  const { createOriginalUploadUrl, uploadUrlRequests, board, addMember } =
    await setup();
  addMember("poster");

  const result = await createOriginalUploadUrl({
    boardId: board.id,
    userId: "user-1",
    contentType: "image/svg+xml",
    size: 1000,
  });

  expect(result).toEqual({ ok: false, reason: "content_type_not_allowed" });
  expect(uploadUrlRequests).toEqual([]);
});

test("サイズがだめなときは、その理由を返し、URL を発行しない", async () => {
  const { createOriginalUploadUrl, uploadUrlRequests, board, addMember } =
    await setup();
  addMember("poster");

  const result = await createOriginalUploadUrl({
    boardId: board.id,
    userId: "user-1",
    contentType: "application/pdf",
    size: 0,
  });

  expect(result).toEqual({ ok: false, reason: "size_invalid" });
  expect(uploadUrlRequests).toEqual([]);
});

test("所属していないユーザーには、形式がだめでも board_not_found を返す", async () => {
  const { createOriginalUploadUrl, board } = await setup();

  const result = await createOriginalUploadUrl({
    boardId: board.id,
    userId: "user-1",
    contentType: "image/svg+xml",
    size: 1000,
  });

  expect(result).toEqual({ ok: false, reason: "board_not_found" });
});
