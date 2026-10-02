import { expect, test } from "vitest";
import { parseReturnPath, signInPath } from "./return-path";

test.each([
  "/posts/abc",
  "/boards/05657b58-7c62-48b4-bcb5-c8b59abc0e63?after=1_x",
  "/",
])("アプリの中のパス %s は、そのまま戻り先にする", (path) => {
  expect(parseReturnPath(path)).toBe(path);
});

test.each([
  ["別のサイトの URL", "https://example.com/"],
  ["スキームを省いた別のサイト", "//example.com/"],
  ["バックスラッシュで始まる別のサイト", "/\\example.com/"],
  ["途中にバックスラッシュのあるパス", "/posts\\..\\x"],
  ["スラッシュで始まらない値", "posts/abc"],
  ["javascript: の URL", "javascript:alert(1)"],
  ["改行を含むパス", "/posts/a\nb"],
  ["空文字", ""],
  ["文字列でない値", ["/posts/abc"]],
  ["未指定", undefined],
])("%s は使わず、既定の /boards にする", (_, value) => {
  expect(parseReturnPath(value)).toBe("/boards");
});

test("サインイン画面の URL に、戻り先を付ける", () => {
  expect(signInPath("/posts/abc?x=1")).toBe(
    "/sign-in?next=%2Fposts%2Fabc%3Fx%3D1",
  );
});
