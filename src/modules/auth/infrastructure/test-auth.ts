import { type BetterAuthOptions, betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";

export type SessionCookie = {
  name: string;
  value: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  expires: Date | undefined;
};

type SameSite = SessionCookie["sameSite"];

/**
 * Google を通さずにセッションを作る。開発用のサインイン（`dev-sign-in.ts`）と e2e だけが使う。
 * 渡された設定にテスト用のプラグインを足した、もう 1 つの auth を作る。本番の `auth` と同じ秘密の値と DB を渡せば、ここで作った Cookie は本番の `auth` でもそのまま通る。
 * 誰のセッションでも作れてしまうので、本番の `auth` にはこのプラグインを入れない。
 */
export function makeCreateSessionCookies(options: BetterAuthOptions) {
  const testAuth = betterAuth({
    ...options,
    plugins: [...(options.plugins ?? []), testUtils()],
  });

  /** メールアドレスのユーザーがいなければ作り、そのユーザーのセッションの Cookie を返す。 */
  return async function createSessionCookies({
    email,
    name,
  }: {
    email: string;
    name: string;
  }): Promise<SessionCookie[]> {
    const { test, internalAdapter } = await testAuth.$context;
    const found = await internalAdapter.findUserByEmail(email);
    const user =
      found?.user ?? (await test.saveUser(test.createUser({ email, name })));

    const cookies = await test.getCookies({ userId: user.id });
    return cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      httpOnly: cookie.httpOnly ?? true,
      secure: cookie.secure ?? false,
      sameSite: (cookie.sameSite?.toLowerCase() ?? "lax") as SameSite,
      expires: cookie.expires ? new Date(cookie.expires * 1000) : undefined,
    }));
  };
}
