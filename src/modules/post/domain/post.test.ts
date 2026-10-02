import { expect, test } from "vitest";
import {
  NOW,
  PUBLISH_STATE_EXAMPLES,
} from "@/modules/post/testing/publish-state-examples";
import {
  encodePostCursor,
  isExpired,
  isPublished,
  POST_DESCRIPTION_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  parsePostCursor,
  parsePostDescription,
  parsePostExternalUrl,
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

test.each([
  [
    "1970 年より前の掲示開始",
    { publishFrom: "1969-12-31T23:59:59Z", expiresAt: null },
  ],
  [
    "9999 年より先の掲示終了",
    {
      publishFrom: "2026-10-01T00:00:00Z",
      expiresAt: "+010000-01-01T00:00:00Z",
    },
  ],
])("%s は period_invalid になる", (_, period) => {
  const result = parsePublishPeriod({
    publishFrom: new Date(period.publishFrom),
    expiresAt: period.expiresAt === null ? null : new Date(period.expiresAt),
  });

  expect(result).toEqual({ ok: false, reason: "period_invalid" });
});

test("扱える範囲の端（1970 年の初めと 9999 年の終わり）は受け入れる", () => {
  const result = parsePublishPeriod({
    publishFrom: new Date("1970-01-01T00:00:00Z"),
    expiresAt: new Date("9999-12-31T23:59:59.999Z"),
  });

  expect(result.ok).toBe(true);
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

test.each(PUBLISH_STATE_EXAMPLES)(
  "$name: 公開中は $published、期限切れは $expired",
  ({ published, expired, ...post }) => {
    expect(isPublished(post, NOW)).toBe(published);
    expect(isExpired(post, NOW)).toBe(expired);
  },
);

test("続きの位置は、文字列にしてから元に戻せる", () => {
  const cursor = {
    publishFrom: new Date("2026-10-01T09:00:00.123Z"),
    id: "3f2b8c1e-5a4d-4e6f-9a7b-0c1d2e3f4a5b",
  };

  expect(parsePostCursor(encodePostCursor(cursor))).toEqual(cursor);
});

test.each([
  ["空文字", ""],
  ["日時がない", "_3f2b8c1e-5a4d-4e6f-9a7b-0c1d2e3f4a5b"],
  ["ID が UUID でない", "1790000000000_post-1"],
  ["日時が数字でない", "abc_3f2b8c1e-5a4d-4e6f-9a7b-0c1d2e3f4a5b"],
  [
    "日時として大きすぎる",
    "9999999999999999_3f2b8c1e-5a4d-4e6f-9a7b-0c1d2e3f4a5b",
  ],
  [
    "西暦 10000 年以降の日時",
    "253402300800000_3f2b8c1e-5a4d-4e6f-9a7b-0c1d2e3f4a5b",
  ],
  ["余分な文字が続く", "1790000000000_3f2b8c1e-5a4d-4e6f-9a7b-0c1d2e3f4a5b'--"],
])("続きの位置が %s なら null になる", (_, value) => {
  expect(parsePostCursor(value)).toBeNull();
});

test("西暦 9999 年の終わりまでの日時は、続きの位置として受け入れる", () => {
  const cursor = parsePostCursor(
    "253402300799999_3f2b8c1e-5a4d-4e6f-9a7b-0c1d2e3f4a5b",
  );

  expect(cursor?.publishFrom.toISOString()).toBe("9999-12-31T23:59:59.999Z");
});

test("説明文は前後の空白を取り除いて受け入れる。改行は残す", () => {
  expect(parsePostDescription("  1 行目\n2 行目  ")).toEqual({
    ok: true,
    description: "1 行目\n2 行目",
  });
});

test.each([
  ["空文字", ""],
  ["空白だけ", " \n "],
])("説明文が %s なら、説明文なし（null）にする", (_, value) => {
  expect(parsePostDescription(value)).toEqual({ ok: true, description: null });
});

test("上限を超える長さの説明文は description_too_long になる", () => {
  const description = "あ".repeat(POST_DESCRIPTION_MAX_LENGTH + 1);

  expect(parsePostDescription(description)).toEqual({
    ok: false,
    reason: "description_too_long",
  });
  expect(parsePostDescription(description.slice(1)).ok).toBe(true);
});

test.each([
  [
    "https の URL",
    "https://example.com/form?id=1",
    "https://example.com/form?id=1",
  ],
  ["http の URL", "http://example.com", "http://example.com/"],
  [
    "前後に空白のある URL",
    "  https://example.com/a  ",
    "https://example.com/a",
  ],
])("外部リンクとして %s を受け入れる", (_, value, externalUrl) => {
  expect(parsePostExternalUrl(value)).toEqual({ ok: true, externalUrl });
});

test("外部リンクが空なら、外部リンクなし（null）にする", () => {
  expect(parsePostExternalUrl("  ")).toEqual({ ok: true, externalUrl: null });
});

test.each([
  ["javascript: の URL", "javascript:alert(1)"],
  ["大文字を混ぜた javascript: の URL", "JaVaScRiPt:alert(1)"],
  ["data: の URL", "data:text/html,<script>alert(1)</script>"],
  ["mailto: の URL", "mailto:someone@example.com"],
  ["スキームのない文字列", "example.com/form"],
  ["パスだけ", "/boards"],
  ["長すぎる URL", `https://example.com/${"a".repeat(2000)}`],
])("外部リンクが %s なら external_url_invalid になる", (_, value) => {
  expect(parsePostExternalUrl(value)).toEqual({
    ok: false,
    reason: "external_url_invalid",
  });
});
