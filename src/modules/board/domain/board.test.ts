import { expect, test } from "vitest";
import { BOARD_NAME_MAX_LENGTH, parseBoardName } from "./board";

test("掲示板名をそのまま返す", () => {
  expect(parseBoardName("中野のボード")).toEqual({
    ok: true,
    name: "中野のボード",
  });
});

test("前後の空白を取り除いた掲示板名を返す", () => {
  expect(parseBoardName("　中野のボード　")).toEqual({
    ok: true,
    name: "中野のボード",
  });
});

test("空文字は name_empty になる", () => {
  expect(parseBoardName("")).toEqual({ ok: false, reason: "name_empty" });
});

test("空白だけの掲示板名は name_empty になる", () => {
  expect(parseBoardName(" ")).toEqual({ ok: false, reason: "name_empty" });
});

test("上限ちょうどの長さは受け入れる", () => {
  const name = "あ".repeat(BOARD_NAME_MAX_LENGTH);
  expect(parseBoardName(name)).toEqual({ ok: true, name });
});

test("上限を超える長さは name_too_long になる", () => {
  const name = "あ".repeat(BOARD_NAME_MAX_LENGTH + 1);
  expect(parseBoardName(name)).toEqual({ ok: false, reason: "name_too_long" });
});
