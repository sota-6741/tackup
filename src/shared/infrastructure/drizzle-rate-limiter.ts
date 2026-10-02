import { and, eq, lt, sql } from "drizzle-orm";
import type { RateLimiter, RateLimitRule } from "@/shared/domain/rate-limiter";
import { withSafeDatabaseErrors } from "./database-error";
import type { Db } from "./db";
import { rateLimitCounter } from "./schema";

function windowStartOf(now: Date, { windowSeconds }: RateLimitRule): Date {
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

/**
 * 時間を固定の長さの枠に区切り、枠ごとの回数を DB で数える。複数のインスタンスから同時に数えても、1 つの文で足すので数え漏れない。
 * 枠の境目をまたぐと、短い間に上限の 2 倍まで通る。負荷と費用を際限なく増やさないための制限なので、これで足りる。
 */
export function makeDrizzleRateLimiter({
  db,
  now = () => new Date(),
}: {
  db: Db;
  now?: () => Date;
}): RateLimiter {
  async function consume({
    rule,
    subject,
  }: {
    rule: RateLimitRule;
    subject: string;
  }): Promise<boolean> {
    const key = `${rule.name}:${subject}`;
    const windowStart = windowStartOf(now(), rule);

    const [row] = await db
      .insert(rateLimitCounter)
      .values({ key, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [rateLimitCounter.key, rateLimitCounter.windowStart],
        set: { count: sql`${rateLimitCounter.count} + 1` },
      })
      .returning({ count: rateLimitCounter.count });

    // 過ぎた枠の記録が増え続けないよう、同じ利用者の古い枠を消す。
    await db
      .delete(rateLimitCounter)
      .where(
        and(
          eq(rateLimitCounter.key, key),
          lt(rateLimitCounter.windowStart, windowStart),
        ),
      );

    return row.count <= rule.limit;
  }

  return withSafeDatabaseErrors({ consume });
}
