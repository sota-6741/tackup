import { and, eq, lt, or, sql } from "drizzle-orm";
import type { RateLimiter, RateLimitRule } from "@/shared/domain/rate-limiter";
import { withSafeDatabaseErrors } from "./database-error";
import type { Db } from "./db";
import { rateLimitCounter } from "./schema";

/** これより古い枠の記録は消す。どの規則の枠の長さよりも長くしておく（いちばん長い枠は 1 時間）。 */
const STALE_AFTER_SECONDS = 24 * 60 * 60;

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

    // 新しい枠を作ったときに、要らなくなった記録を消す。毎回は消さない（要求のたびに削除を走らせないため）。
    // - 同じ利用者の、前の枠の記録
    // - だれの記録でも、十分に古いもの。IP アドレスで数える規則では、一度だけ来た接続元の記録が残り続けるため
    if (row.count === 1) {
      const staleBefore = new Date(
        now().getTime() - STALE_AFTER_SECONDS * 1000,
      );
      await db
        .delete(rateLimitCounter)
        .where(
          or(
            and(
              eq(rateLimitCounter.key, key),
              lt(rateLimitCounter.windowStart, windowStart),
            ),
            lt(rateLimitCounter.windowStart, staleBefore),
          ),
        );
    }

    return row.count <= rule.limit;
  }

  return withSafeDatabaseErrors({ consume });
}
