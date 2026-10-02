import { expect, test, vi } from "vitest";
import { makeInMemoryRateLimiter } from "@/shared/testing/in-memory-rate-limiter";
import { withRateLimit } from "./rate-limiter";

const rule = { name: "test", limit: 2, windowSeconds: 60 };

function setup() {
  const { rateLimiter } = makeInMemoryRateLimiter();
  const useCase = vi.fn(async ({ userId }: { userId: string }) => ({
    ok: true as const,
    userId,
  }));
  return { useCase, limited: withRateLimit(useCase, { rateLimiter, rule }) };
}

test("上限の中なら、use case を呼んで結果をそのまま返す", async () => {
  const { useCase, limited } = setup();

  expect(await limited({ userId: "user-1" })).toEqual({
    ok: true,
    userId: "user-1",
  });
  expect(await limited({ userId: "user-1" })).toEqual({
    ok: true,
    userId: "user-1",
  });
  expect(useCase).toHaveBeenCalledTimes(2);
});

test("上限を超えたら、use case を呼ばずに rate_limited を返す", async () => {
  const { useCase, limited } = setup();
  await limited({ userId: "user-1" });
  await limited({ userId: "user-1" });

  const result = await limited({ userId: "user-1" });

  expect(result).toEqual({ ok: false, reason: "rate_limited" });
  expect(useCase).toHaveBeenCalledTimes(2);
});

test("回数は利用者ごとに数える", async () => {
  const { limited } = setup();
  await limited({ userId: "user-1" });
  await limited({ userId: "user-1" });

  expect(await limited({ userId: "user-2" })).toEqual({
    ok: true,
    userId: "user-2",
  });
});
