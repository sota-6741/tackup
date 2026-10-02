import { expect, test } from "vitest";
import { buildInviteUrl } from "./invite-token";

test("ベース URL に /b/{token} を付けた URL を返す", () => {
  expect(buildInviteUrl({ baseUrl: "https://example.com", token: "abc" })).toBe(
    "https://example.com/b/abc",
  );
});

test("ベース URL の末尾に / があっても二重にしない", () => {
  expect(
    buildInviteUrl({ baseUrl: "https://example.com/", token: "abc" }),
  ).toBe("https://example.com/b/abc");
});
