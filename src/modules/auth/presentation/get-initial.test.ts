import { expect, test } from "vitest";
import { getInitial } from "./get-initial";

test("名前の最初の1文字を返す", () => {
  expect(getInitial("山田 太郎", "yamada@example.com")).toBe("山");
});

test("英字の名前は大文字にして返す", () => {
  expect(getInitial("sota", "sota@example.com")).toBe("S");
});

test("名前が空ならメールアドレスの最初の1文字を返す", () => {
  expect(getInitial("", "yamada@example.com")).toBe("Y");
});

test("名前が空白だけならメールアドレスの最初の1文字を返す", () => {
  expect(getInitial("   ", "yamada@example.com")).toBe("Y");
});

test("絵文字で始まる名前でも1文字として返す", () => {
  expect(getInitial("😀太郎", "taro@example.com")).toBe("😀");
});

test("名前もメールアドレスも空なら空文字を返す", () => {
  expect(getInitial("", "")).toBe("");
});
