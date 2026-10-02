import { expect, test } from "vitest";
import { isUploadKeyOf } from "./upload-key";

const owner = { boardId: "board-1", userId: "user-1" };
const UUID = "3f2b8c1e-5a4d-4e6f-9a7b-0c1d2e3f4a5b";

test("その掲示板とユーザーのためのキーは受け入れる", () => {
  expect(
    isUploadKeyOf({ key: `pending/board-1/user-1/${UUID}`, ...owner }),
  ).toBe(true);
});

test.each([
  ["ほかの掲示板のキー", `pending/board-2/user-1/${UUID}`],
  ["ほかのユーザーのキー", `pending/board-1/user-2/${UUID}`],
  ["pending/ の外のキー", `boards/board-1/user-1/${UUID}`],
  ["UUID のあとに続きのあるキー", `pending/board-1/user-1/${UUID}/x`],
  ["上の階層をたどるキー", `pending/board-1/user-1/../../board-2/${UUID}`],
  ["UUID でないキー", "pending/board-1/user-1/original"],
  ["接頭辞だけのキー", "pending/board-1/user-1/"],
  ["空文字", ""],
])("%s は受け入れない", (_, key) => {
  expect(isUploadKeyOf({ key, ...owner })).toBe(false);
});
