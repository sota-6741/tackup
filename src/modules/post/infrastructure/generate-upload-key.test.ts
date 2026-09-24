import { expect, test } from "vitest";
import { generateUploadKey } from "./generate-upload-key";

test("pending/ の下の UUID のキーを返す", () => {
  expect(generateUploadKey()).toMatch(
    /^pending\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test("呼ぶたびに別のキーを返す", () => {
  const keys = new Set(Array.from({ length: 100 }, generateUploadKey));

  expect(keys.size).toBe(100);
});
