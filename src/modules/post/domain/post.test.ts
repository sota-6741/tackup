import { expect, test } from "vitest";
import {
  POST_TITLE_MAX_LENGTH,
  parsePostTitle,
  parsePublishPeriod,
} from "./post";

test("タイトルは前後の空白を取り除いて受け入れる", () => {
  expect(parsePostTitle("  夏祭りのお知らせ  ")).toEqual({
    ok: true,
    title: "夏祭りのお知らせ",
  });
});

test.each([
  ["空文字", ""],
  ["空白だけ", "   "],
])("%s のタイトルは title_empty になる", (_, value) => {
  expect(parsePostTitle(value)).toEqual({ ok: false, reason: "title_empty" });
});

test("上限ちょうどの長さのタイトルは受け入れる", () => {
  const title = "あ".repeat(POST_TITLE_MAX_LENGTH);

  expect(parsePostTitle(title)).toEqual({ ok: true, title });
});

test("上限を超える長さのタイトルは title_too_long になる", () => {
  const title = "あ".repeat(POST_TITLE_MAX_LENGTH + 1);

  expect(parsePostTitle(title)).toEqual({
    ok: false,
    reason: "title_too_long",
  });
});

test("掲示終了が掲示開始より後なら受け入れる", () => {
  const publishFrom = new Date("2026-10-01T00:00:00Z");
  const expiresAt = new Date("2026-10-01T00:00:01Z");

  expect(parsePublishPeriod({ publishFrom, expiresAt })).toEqual({
    ok: true,
    publishFrom,
    expiresAt,
  });
});

test("掲示終了が null なら、無期限として受け入れる", () => {
  const publishFrom = new Date("2026-10-01T00:00:00Z");

  expect(parsePublishPeriod({ publishFrom, expiresAt: null })).toEqual({
    ok: true,
    publishFrom,
    expiresAt: null,
  });
});

test("無期限でも、掲示開始が日時として読めなければ period_invalid になる", () => {
  const result = parsePublishPeriod({
    publishFrom: new Date("invalid"),
    expiresAt: null,
  });

  expect(result).toEqual({ ok: false, reason: "period_invalid" });
});

test("過去の掲示期間も受け入れる", () => {
  const publishFrom = new Date("2000-01-01T00:00:00Z");
  const expiresAt = new Date("2000-02-01T00:00:00Z");

  expect(parsePublishPeriod({ publishFrom, expiresAt }).ok).toBe(true);
});

test.each([
  ["掲示開始と同じ", "2026-10-01T00:00:00Z"],
  ["掲示開始より前", "2026-09-30T23:59:59Z"],
])("掲示終了が%sなら expires_before_publish になる", (_, expiresAt) => {
  const result = parsePublishPeriod({
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date(expiresAt),
  });

  expect(result).toEqual({ ok: false, reason: "expires_before_publish" });
});

test.each([
  ["掲示開始", { publishFrom: "invalid", expiresAt: "2026-10-01T00:00:00Z" }],
  ["掲示終了", { publishFrom: "2026-10-01T00:00:00Z", expiresAt: "invalid" }],
])("%sが日時として読めなければ period_invalid になる", (_, period) => {
  const result = parsePublishPeriod({
    publishFrom: new Date(period.publishFrom),
    expiresAt: new Date(period.expiresAt),
  });

  expect(result).toEqual({ ok: false, reason: "period_invalid" });
});
