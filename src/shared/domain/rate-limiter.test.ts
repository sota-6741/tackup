import { expect, test, vi } from "vitest";
import { makeInMemoryRateLimiter } from "@/shared/testing/in-memory-rate-limiter";
import {
  makeAllowPublicView,
  PUBLIC_VIEW_RATE_LIMIT,
  withRateLimit,
} from "./rate-limiter";

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

function publicView() {
  const { rateLimiter, counts } = makeInMemoryRateLimiter();
  const allowPublicView = makeAllowPublicView({
    rateLimiter,
    trustedProxyCount: 1,
  });
  const from = (forwardedFor?: string) =>
    new Headers(forwardedFor ? { "x-forwarded-for": forwardedFor } : {});
  return { allowPublicView, counts, from };
}

test("公開の経路は、接続元の IP アドレスごとに上限まで通す", async () => {
  const { allowPublicView, from } = publicView();
  for (let i = 0; i < PUBLIC_VIEW_RATE_LIMIT.limit; i++) {
    expect(await allowPublicView(from("203.0.113.9"))).toBe(true);
  }

  expect(await allowPublicView(from("203.0.113.9"))).toBe(false);
  expect(await allowPublicView(from("203.0.113.10"))).toBe(true);
});

test("X-Forwarded-For の左側を書き換えても、別の接続元としては数えない", async () => {
  const { allowPublicView, counts, from } = publicView();

  await allowPublicView(from("198.51.100.1, 203.0.113.9"));
  await allowPublicView(from("198.51.100.2, 203.0.113.9"));

  expect([...counts]).toEqual([["public-view:203.0.113.9", 2]]);
});

test("IP アドレスが分からない要求は、まとめて 1 つの枠で数える", async () => {
  const { allowPublicView, counts, from } = publicView();

  await allowPublicView(from());
  await allowPublicView(from());

  expect([...counts]).toEqual([["public-view:unknown", 2]]);
});
