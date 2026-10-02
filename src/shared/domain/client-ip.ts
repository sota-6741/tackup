/**
 * `X-Forwarded-For` から、接続元の IP アドレスを取り出す。
 * このヘッダーは、通ってきたプロキシが順に右へ足していく。左のほうは接続元が自由に書けるので信用できない。
 * 信頼できるプロキシ（ロードバランサーなど）の数を `trustedProxyCount` で渡し、右から数えてその位置の値だけを使う。
 * ヘッダーがない、または信頼できるプロキシの数より短いときは `null`。
 */
export function clientIpFromForwardedFor({
  forwardedFor,
  trustedProxyCount,
}: {
  forwardedFor: string | null;
  trustedProxyCount: number;
}): string | null {
  // 数が整数でないと、`at` が先頭（接続元が自由に書ける値）を返してしまう。
  if (!Number.isInteger(trustedProxyCount) || trustedProxyCount < 1) {
    return null;
  }
  if (!forwardedFor) return null;
  const addresses = forwardedFor
    .split(",")
    .map((address) => address.trim())
    .filter((address) => address !== "");
  return addresses.at(-trustedProxyCount) ?? null;
}
