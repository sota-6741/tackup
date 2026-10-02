import { expect, test } from "@playwright/test";
import { PUBLIC_VIEW_RATE_LIMIT } from "../src/shared/domain/rate-limiter";

/** テストごと・実行ごとに別の接続元にする。回数は DB に残るので、同じ IP アドレスを使い回すと前の実行の分まで数えてしまう。 */
function randomIp(): string {
  const part = () => Math.floor(Math.random() * 254) + 1;
  return `203.0.${part()}.${part()}`;
}

test("公開の経路は、同じ接続元から 1 分に上限を超えて開くと 429 を返す", async ({
  request,
}) => {
  // 100 回を超える要求を順に送るので、遅い環境でも終わるよう、時間の上限を延ばす。
  test.setTimeout(120_000);
  const ip = randomIp();
  const open = (forwardedFor: string) =>
    request.get("/b/no-such-token", {
      headers: { "X-Forwarded-For": forwardedFor },
    });

  // 上限までは、ふつうに処理される（存在しない招待リンクなので 404）。
  // 回数は 1 分ごとの枠で数えるので、途中で枠が変わると、最大で上限の 2 倍まで通る。
  const { limit } = PUBLIC_VIEW_RATE_LIMIT;
  let allowed = 0;
  let limited = await open(ip);
  while (limited.status() === 404 && allowed <= limit * 2) {
    allowed += 1;
    limited = await open(ip);
  }

  expect(allowed).toBeGreaterThanOrEqual(limit);
  expect(allowed).toBeLessThanOrEqual(limit * 2);
  expect(limited.status()).toBe(429);
  expect(limited.headers()["retry-after"]).toBe("60");

  // 先読みのヘッダーは誰でも付けられる。付けても制限を避けられない。
  const prefetchHeaders: Record<string, string>[] = [
    { "Next-Router-Prefetch": "1" },
    { Purpose: "prefetch" },
  ];
  for (const header of prefetchHeaders) {
    const response = await request.get("/b/no-such-token", {
      headers: { "X-Forwarded-For": ip, ...header },
    });
    expect(response.status()).toBe(429);
  }

  // 左側を書き換えても同じ接続元として数える。別の接続元は影響を受けない。
  expect((await open(`198.51.100.1, ${ip}`)).status()).toBe(429);
  expect((await open(randomIp())).status()).toBe(404);
});

test("ログインが要る経路は、公開の経路の回数の制限の対象にしない", async ({
  request,
}) => {
  const ip = randomIp();
  for (let i = 0; i < 3; i++) {
    const response = await request.get("/sign-in", {
      headers: { "X-Forwarded-For": ip },
    });
    expect(response.status()).toBe(200);
  }
});
