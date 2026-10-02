import type { RateLimiter } from "@/shared/domain/rate-limiter";

/** 時間枠は扱わず、規則と利用者ごとに回数を数えるだけ。 */
export function makeInMemoryRateLimiter() {
  const counts = new Map<string, number>();

  const rateLimiter: RateLimiter = {
    async consume({ rule, subject }) {
      const key = `${rule.name}:${subject}`;
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return count <= rule.limit;
    },
  };

  return { rateLimiter, counts };
}
