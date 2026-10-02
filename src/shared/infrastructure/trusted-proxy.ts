import { env } from "@/env";

/** アプリの前にある、信頼できるプロキシ（ロードバランサーなど）の数。接続元の IP アドレスを `X-Forwarded-For` のどの位置から取るかを決める。 */
export const trustedProxyCount = env.TRUSTED_PROXY_COUNT;
