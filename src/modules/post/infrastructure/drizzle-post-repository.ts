import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { Post, PostCursor } from "@/modules/post/domain/post";
import type {
  CreatePostData,
  ExpiredPost,
  FindByBoardIdInput,
  FindExpiredInput,
  FindPublishedInput,
  MarkRemovedInput,
  PostRepository,
} from "@/modules/post/domain/post-repository";
import { withSafeDatabaseErrors } from "@/shared/infrastructure/database-error";
import type { DbExecutor } from "@/shared/infrastructure/db";
import { post } from "./schema";

/** URL から来る値。NUL 文字などを含む値で検索すると Postgres がエラーを投げるので、発行する ID に使う文字だけを通す。 */
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * 公開中の掲示物の条件。domain の `isPublished` と同じ決まりを SQL で書く。一覧の条件は、画面や use case ではなくここに置く。
 * 無期限（`expires_at` が NULL）の行は `expires_at > now` が真にならないので、NULL を明示して含める。
 */
function publishedAt(now: Date) {
  return and(
    // 索引（post_published_idx）は status = 'published' の行だけを持つ。値をパラメーターで渡すと、実行計画によっては索引が使われないので、SQL に直接書く。
    sql`${post.status} = 'published'`,
    lte(post.publishFrom, now),
    or(isNull(post.expiresAt), gt(post.expiresAt, now)),
  );
}

/** 掲示開始の新しい順の一覧の、続きの条件。行どうしの比較にすると、索引の途中から読み始められる。OR で書くと、先頭から読んで捨てることになる。 */
function afterCursor(after: PostCursor) {
  return sql`(${post.publishFrom}, ${post.id}) < (${after.publishFrom.toISOString()}::timestamptz, ${after.id}::uuid)`;
}

function hasExpiresAt(found: Post): found is ExpiredPost {
  return found.expiresAt !== null;
}

/** 期限切れの掲示物の条件。domain の `isExpired` と同じ決まりを SQL で書く。無期限（NULL）の行は `expires_at <= now` が真にならないので、含まれない。 */
function expiredAt(now: Date) {
  // 索引（post_expired_idx）は status = 'published' の行だけを持つ。公開中の条件と同じ理由で、SQL に直接書く。
  return and(sql`${post.status} = 'published'`, lte(post.expiresAt, now));
}

export function makeDrizzlePostRepository(db: DbExecutor): PostRepository {
  async function create(data: CreatePostData): Promise<Post> {
    const [created] = await db.insert(post).values(data).returning();
    return created;
  }

  async function countActiveByBoardId(boardId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(post)
      .where(and(eq(post.boardId, boardId), ne(post.status, "removed")));
    return row.value;
  }

  async function sumFileSizeByBoardId(boardId: string): Promise<number> {
    const [row] = await db
      .select({
        value: sql<string>`coalesce(sum(${post.originalSize} + ${post.thumbnailSize}), 0)`,
      })
      .from(post)
      .where(eq(post.boardId, boardId));
    return Number(row.value);
  }

  async function findPublished({
    boardId,
    now,
    limit,
    after,
  }: FindPublishedInput): Promise<Post[]> {
    return db
      .select()
      .from(post)
      .where(
        and(
          eq(post.boardId, boardId),
          publishedAt(now),
          after && afterCursor(after),
        ),
      )
      .orderBy(desc(post.publishFrom), desc(post.id))
      .limit(limit);
  }

  async function findByBoardId({
    boardId,
    limit,
    after,
  }: FindByBoardIdInput): Promise<Post[]> {
    return db
      .select()
      .from(post)
      .where(and(eq(post.boardId, boardId), after && afterCursor(after)))
      .orderBy(desc(post.publishFrom), desc(post.id))
      .limit(limit);
  }

  async function findExpired({
    boardId,
    now,
    limit,
    after,
  }: FindExpiredInput): Promise<ExpiredPost[]> {
    const afterCursor =
      after &&
      sql`(${post.expiresAt}, ${post.id}) > (${after.expiresAt.toISOString()}::timestamptz, ${after.id}::uuid)`;
    const found = await db
      .select()
      .from(post)
      .where(and(eq(post.boardId, boardId), expiredAt(now), afterCursor))
      .orderBy(asc(post.expiresAt), asc(post.id))
      .limit(limit);
    return found.filter(hasExpiresAt);
  }

  async function markRemoved({
    id,
    removedAt,
    removedBy,
  }: MarkRemovedInput): Promise<boolean> {
    // 状態の確認と書き換えを 1 つの UPDATE で行う。同時に押されても、記録は先の 1 回だけ残る。
    const updated = await db
      .update(post)
      .set({ status: "removed", removedAt, removedBy })
      .where(and(eq(post.id, id), eq(post.status, "published")))
      .returning({ id: post.id });
    return updated.length > 0;
  }

  async function findByPublicId(publicId: string): Promise<Post | null> {
    if (!PUBLIC_ID_PATTERN.test(publicId)) return null;
    const [found] = await db
      .select()
      .from(post)
      .where(eq(post.publicId, publicId));
    return found ?? null;
  }

  return withSafeDatabaseErrors({
    create,
    countActiveByBoardId,
    sumFileSizeByBoardId,
    findPublished,
    findByBoardId,
    findExpired,
    markRemoved,
    findByPublicId,
  });
}
