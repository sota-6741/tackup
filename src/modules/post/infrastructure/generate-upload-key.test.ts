import { expect, test } from "vitest";
import { isUploadKeyOf } from "@/modules/post/domain/upload-key";
import { generateUploadKey } from "./generate-upload-key";

const owner = { boardId: "board-1", userId: "user-1" };

test("掲示板とユーザーを含む、pending/ の下のキーを返す", () => {
  const key = generateUploadKey(owner);

  expect(key).toMatch(/^pending\/board-1\/user-1\/[0-9a-f-]{36}$/);
  expect(isUploadKeyOf({ key, ...owner })).toBe(true);
});

test("呼ぶたびに別のキーを返す", () => {
  const keys = new Set(
    Array.from({ length: 100 }, () => generateUploadKey(owner)),
  );

  expect(keys.size).toBe(100);
});
