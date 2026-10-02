import { expect, test } from "vitest";
import { clientIpFromForwardedFor } from "./client-ip";

test("信頼できるプロキシが 1 つなら、いちばん右の値を返す", () => {
  const ip = clientIpFromForwardedFor({
    forwardedFor: "203.0.113.9",
    trustedProxyCount: 1,
  });

  expect(ip).toBe("203.0.113.9");
});

test("接続元が自分で書いた左側の値は使わない", () => {
  const ip = clientIpFromForwardedFor({
    forwardedFor: "198.51.100.1, 203.0.113.9",
    trustedProxyCount: 1,
  });

  expect(ip).toBe("203.0.113.9");
});

test("信頼できるプロキシが 2 つなら、右から 2 番目の値を返す", () => {
  const ip = clientIpFromForwardedFor({
    forwardedFor: "198.51.100.1, 203.0.113.9, 10.0.0.1",
    trustedProxyCount: 2,
  });

  expect(ip).toBe("203.0.113.9");
});

test.each([
  ["ヘッダーがない", { forwardedFor: null, trustedProxyCount: 1 }],
  ["ヘッダーが空", { forwardedFor: " , ", trustedProxyCount: 1 }],
  [
    "信頼できるプロキシの数より短い",
    { forwardedFor: "203.0.113.9", trustedProxyCount: 2 },
  ],
  [
    "信頼できるプロキシがない設定",
    { forwardedFor: "203.0.113.9", trustedProxyCount: 0 },
  ],
  [
    "信頼できるプロキシの数が数字でない設定",
    {
      forwardedFor: "198.51.100.1, 203.0.113.9",
      trustedProxyCount: Number.NaN,
    },
  ],
])("%s ときは null を返す", (_, input) => {
  expect(clientIpFromForwardedFor(input)).toBeNull();
});
