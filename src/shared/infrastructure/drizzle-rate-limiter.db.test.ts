import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect, test } from "vitest";
import { TEST_DATABASE_URL, testDb } from "@/shared/testing/test-db";
import { makeDrizzleRateLimiter } from "./drizzle-rate-limiter";
import { rateLimitCounter } from "./schema";

const rule = { name: "test", limit: 2, windowSeconds: 60 };

function setup(start = "2026-10-01T00:00:10Z") {
  let current = new Date(start);
  const rateLimiter = makeDrizzleRateLimiter({
    db: testDb,
    now: () => current,
  });
  return {
    rateLimiter,
    setNow: (value: string) => {
      current = new Date(value);
    },
  };
}

test("上限までは true、超えたら false を返す", async () => {
  const { rateLimiter } = setup();
  const hit = () => rateLimiter.consume({ rule, subject: "user-1" });

  expect(await hit()).toBe(true);
  expect(await hit()).toBe(true);
  expect(await hit()).toBe(false);
});

test("利用者ごと、規則ごとに別々に数える", async () => {
  const { rateLimiter } = setup();
  await rateLimiter.consume({ rule, subject: "user-1" });
  await rateLimiter.consume({ rule, subject: "user-1" });

  expect(await rateLimiter.consume({ rule, subject: "user-2" })).toBe(true);
  expect(
    await rateLimiter.consume({
      rule: { ...rule, name: "other" },
      subject: "user-1",
    }),
  ).toBe(true);
});

test("次の時間枠になると、また上限まで通り、前の枠の記録を消す", async () => {
  const { rateLimiter, setNow } = setup("2026-10-01T00:00:59Z");
  const hit = () => rateLimiter.consume({ rule, subject: "user-1" });
  await hit();
  await hit();
  expect(await hit()).toBe(false);

  setNow("2026-10-01T00:01:00Z");

  expect(await hit()).toBe(true);
  const rows = await testDb.select().from(rateLimitCounter);
  expect(rows).toEqual([
    {
      key: "test:user-1",
      windowStart: new Date("2026-10-01T00:01:00Z"),
      count: 1,
    },
  ]);
});

test("別々の接続から同時に数えても、数え漏れない", async () => {
  // testDb は接続が 1 本で、同時に呼んでも順番に実行される。本当に並行させるために、接続を複数持つクライアントを使う。
  const client = postgres(TEST_DATABASE_URL, { max: 8, onnotice: () => {} });
  const rateLimiter = makeDrizzleRateLimiter({
    db: drizzle(client),
    now: () => new Date("2026-10-01T00:00:10Z"),
  });
  const many = { ...rule, limit: 5 };

  try {
    const results = await Promise.all(
      Array.from({ length: 16 }, () =>
        rateLimiter.consume({ rule: many, subject: "user-1" }),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(5);
    const [row] = await testDb.select().from(rateLimitCounter);
    expect(row.count).toBe(16);
  } finally {
    await client.end();
  }
});
