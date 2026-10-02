import { env } from "@/env";
import { authOptions } from "./auth";
import type { SessionCookie } from "./test-auth";

const DEV_USER = { email: "dev@tackup.invalid", name: "開発用ユーザー" };

/** `next dev` で動かしていて、かつ `DEV_SIGN_IN` を立てたときだけ有効にする。本番ビルド（`next build`）では `NODE_ENV` が `production` になるので、環境変数を立てても有効にならない。 */
export function isDevSignInEnabled(): boolean {
  return process.env.NODE_ENV === "development" && env.DEV_SIGN_IN === "true";
}

/** 開発用ユーザーのセッションの Cookie を返す。有効でなければ `null`。テスト用の auth は、有効なときにだけ読み込む。 */
export async function devSignIn(): Promise<SessionCookie[] | null> {
  if (!isDevSignInEnabled()) return null;
  const { makeCreateSessionCookies } = await import("./test-auth");
  return makeCreateSessionCookies(authOptions)(DEV_USER);
}
