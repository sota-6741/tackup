import type { OriginalContentType } from "./original-file";

export const POST_STATUSES = ["draft", "published", "removed"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export type Post = {
  id: string;
  /** 公開の URL（`/posts/{publicId}`）に使う。`id` は外に出さない。 */
  publicId: string;
  boardId: string;
  title: string;
  description: string | null;
  externalUrl: string | null;
  originalKey: string;
  originalContentType: OriginalContentType;
  originalSize: number;
  thumbnailKey: string;
  thumbnailSize: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  publishFrom: Date;
  /** `null` は無期限。期限切れにならない。 */
  expiresAt: Date | null;
  status: PostStatus;
  removedAt: Date | null;
  removedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const POST_TITLE_MAX_LENGTH = 100;

export type PostTitleError = "title_empty" | "title_too_long";

export type ParsePostTitleResult =
  | { ok: true; title: string }
  | { ok: false; reason: PostTitleError };

export function parsePostTitle(value: string): ParsePostTitleResult {
  const title = value.trim();
  if (title.length === 0) {
    return { ok: false, reason: "title_empty" };
  }
  if (title.length > POST_TITLE_MAX_LENGTH) {
    return { ok: false, reason: "title_too_long" };
  }
  return { ok: true, title };
}

export const POST_DESCRIPTION_MAX_LENGTH = 1000;

export type ParsePostDescriptionResult =
  | { ok: true; description: string | null }
  | { ok: false; reason: "description_too_long" };

/** 空（空白だけを含む）なら、説明文なしとして `null` にする。 */
export function parsePostDescription(
  value: string,
): ParsePostDescriptionResult {
  const description = value.trim();
  if (description.length === 0) return { ok: true, description: null };
  if (description.length > POST_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, reason: "description_too_long" };
  }
  return { ok: true, description };
}

export const POST_EXTERNAL_URL_MAX_LENGTH = 2000;

export type ParsePostExternalUrlResult =
  | { ok: true; externalUrl: string | null }
  | { ok: false; reason: "external_url_invalid" };

/**
 * 空なら、外部リンクなしとして `null` にする。
 * `http`・`https` の URL だけを受け付ける。`javascript:` などを通すと、リンクを押した人のブラウザでスクリプトが動く。
 */
export function parsePostExternalUrl(
  value: string,
): ParsePostExternalUrlResult {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, externalUrl: null };

  const url = toUrl(trimmed);
  // 保存するのは読み直した URL（日本語のパスなどは % の形に変わって長くなる）なので、長さはそちらで確かめる。
  if (
    !url ||
    url.href.length > POST_EXTERNAL_URL_MAX_LENGTH ||
    (url.protocol !== "http:" && url.protocol !== "https:")
  ) {
    return { ok: false, reason: "external_url_invalid" };
  }
  return { ok: true, externalUrl: url.href };
}

/** `URL.canParse` は古いブラウザにないので、例外で確かめる。フォームの確認でブラウザでも動く。 */
function toUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export type PublishPeriodError = "period_invalid" | "expires_before_publish";

export type ParsePublishPeriodResult =
  | { ok: true; publishFrom: Date; expiresAt: Date | null }
  | { ok: false; reason: PublishPeriodError };

/** 扱える日時の範囲（1970 年の初めから 9999 年の終わりまで）。この外の日時は、DB や一覧の続きの位置で扱えない。 */
const POST_TIME_MIN = 0;
const POST_TIME_MAX = Date.UTC(9999, 11, 31, 23, 59, 59, 999);

function isPostTime(date: Date): boolean {
  const time = date.getTime();
  return time >= POST_TIME_MIN && time <= POST_TIME_MAX;
}

/**
 * `expiresAt` が `null` なら無期限。
 * 過去の日時も受け入れる。すでに貼り出した掲示物を、あとから記録できるようにするため。
 */
export function parsePublishPeriod({
  publishFrom,
  expiresAt,
}: {
  publishFrom: Date;
  expiresAt: Date | null;
}): ParsePublishPeriodResult {
  if (!isPostTime(publishFrom)) {
    return { ok: false, reason: "period_invalid" };
  }
  if (expiresAt === null) {
    return { ok: true, publishFrom, expiresAt };
  }
  if (!isPostTime(expiresAt)) {
    return { ok: false, reason: "period_invalid" };
  }
  if (expiresAt <= publishFrom) {
    return { ok: false, reason: "expires_before_publish" };
  }
  return { ok: true, publishFrom, expiresAt };
}

/** 1 掲示板の掲示物の数の上限。撤去済みは数えない。 */
export const BOARD_POST_MAX_COUNT = 500;

/** 1 掲示板のファイル（原本とサムネイル）の合計サイズの上限。撤去済みの掲示物も数える。 */
export const BOARD_FILE_MAX_TOTAL_SIZE = 5 * 1024 * 1024 * 1024;

type PublishState = Pick<Post, "status" | "publishFrom" | "expiresAt">;

/** 掲示板に表示する条件。無期限（`expiresAt` が `null`）の掲示物は、掲示開始を過ぎていればずっと公開中。 */
export function isPublished(post: PublishState, now: Date): boolean {
  return (
    post.status === "published" &&
    post.publishFrom <= now &&
    (post.expiresAt === null || post.expiresAt > now)
  );
}

/** 掲示終了を過ぎたのに、まだ撤去済みになっていない。無期限の掲示物は期限切れにならない。 */
export function isExpired(post: PublishState, now: Date): boolean {
  return (
    post.status === "published" &&
    post.expiresAt !== null &&
    post.expiresAt <= now
  );
}

/** 一覧の 1 ページの件数。 */
export const POST_PAGE_SIZE = 50;

/** 一覧の続きを取るための位置。並び順（掲示開始の新しい順、同じなら ID の大きい順）のキーをそのまま持つ。 */
export type PostCursor = { publishFrom: Date; id: string };

const CURSOR_PATTERN =
  /^(\d{1,15})_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

function parseTimeAndId(value: string): { time: Date; id: string } | null {
  const match = CURSOR_PATTERN.exec(value);
  if (!match) return null;
  const time = new Date(Number(match[1]));
  if (!isPostTime(time)) return null;
  return { time, id: match[2] };
}

export function encodePostCursor({ publishFrom, id }: PostCursor): string {
  return `${publishFrom.getTime()}_${id}`;
}

/** URL から来る値なので、形が合わなければ `null` にする。 */
export function parsePostCursor(value: string): PostCursor | null {
  const parsed = parseTimeAndId(value);
  return parsed && { publishFrom: parsed.time, id: parsed.id };
}

/** 撤去タスクの続きを取るための位置。並び順（掲示終了の古い順、同じなら ID の小さい順）のキーをそのまま持つ。 */
export type RemovalCursor = { expiresAt: Date; id: string };

export function encodeRemovalCursor({ expiresAt, id }: RemovalCursor): string {
  return `${expiresAt.getTime()}_${id}`;
}

/** URL から来る値なので、形が合わなければ `null` にする。 */
export function parseRemovalCursor(value: string): RemovalCursor | null {
  const parsed = parseTimeAndId(value);
  return parsed && { expiresAt: parsed.time, id: parsed.id };
}
