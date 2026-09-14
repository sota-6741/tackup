import { expect, test } from "vitest";
import { generateInviteToken } from "./generate-invite-token";

test("43文字のトークンを返す", () => {
  expect(generateInviteToken()).toHaveLength(43);
});

test("URL でそのまま使える文字だけでできている", () => {
  expect(generateInviteToken()).toMatch(/^[A-Za-z0-9_-]+$/);
});

test("呼ぶたびに別のトークンを返す", () => {
  const tokens = new Set(Array.from({ length: 100 }, generateInviteToken));

  expect(tokens.size).toBe(100);
});
