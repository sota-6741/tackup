import { expect, test } from "vitest";
import { datetimeLocalToIso, toDatetimeLocalValue } from "./datetime-local";

test("日時を datetime-local の値にし、秒より下は切り捨てる", () => {
  const date = new Date(2026, 9, 1, 9, 5, 30);

  expect(toDatetimeLocalValue(date)).toBe("2026-10-01T09:05");
});

test("datetime-local の値を、その端末のタイムゾーンの日時として ISO 8601 にする", () => {
  const iso = datetimeLocalToIso("2026-10-01T09:05");

  expect(iso).toBe(new Date(2026, 9, 1, 9, 5).toISOString());
});

test.each([
  ["空文字", ""],
  ["日時でない文字列", "明日"],
])("%s は null になる", (_, value) => {
  expect(datetimeLocalToIso(value)).toBeNull();
});
