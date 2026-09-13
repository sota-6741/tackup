import { expect, test } from "vitest";
import { ValidationError } from "@/shared/domain/errors";
import { BOARD_NAME_MAX_LENGTH, parseBoardName } from "./board";

test("掲示板名をそのまま返す", () => {
  expect(parseBoardName("中野のボード")).toBe("中野のボード");
});

test("前後の空白を取り除いた掲示板名を返す", () => {
  expect(parseBoardName("　中野のボード　")).toBe("中野のボード");
});

test("空文字はエラーになる", () => {
  expect(() => parseBoardName("")).toThrow(ValidationError);
});

test("空白だけの掲示板名はエラーになる", () => {
  expect(() => parseBoardName(" ")).toThrow(ValidationError);
});

test("上限ちょうどの長さは受け入れる", () => {
  const name = "あ".repeat(BOARD_NAME_MAX_LENGTH);
  expect(parseBoardName(name)).toBe(name);
});

test("上限を超える長さはエラーになる", () => {
  const name = "あ".repeat(BOARD_NAME_MAX_LENGTH + 1);
  expect(() => parseBoardName(name)).toThrow(ValidationError);
});
