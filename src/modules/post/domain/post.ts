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
  expiresAt: Date;
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

export type PublishPeriodError = "period_invalid" | "expires_before_publish";

export type ParsePublishPeriodResult =
  | { ok: true; publishFrom: Date; expiresAt: Date }
  | { ok: false; reason: PublishPeriodError };

/** 過去の日時も受け入れる。すでに貼り出した掲示物を、あとから記録できるようにするため。 */
export function parsePublishPeriod({
  publishFrom,
  expiresAt,
}: {
  publishFrom: Date;
  expiresAt: Date;
}): ParsePublishPeriodResult {
  if (
    Number.isNaN(publishFrom.getTime()) ||
    Number.isNaN(expiresAt.getTime())
  ) {
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
