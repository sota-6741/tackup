import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expect, test } from "vitest";
import { testDb } from "@/shared/testing/test-db";
import * as schema from "./schema";
import { makeCreateSessionCookies } from "./test-auth";

const options = {
  secret: "test-secret-test-secret-test-secret",
  baseURL: "http://localhost:3000",
  database: drizzleAdapter(testDb, { provider: "pg", schema }),
} satisfies BetterAuthOptions;

/** テスト用のプラグインを入れていない、本番と同じ形の auth。 */
const auth = betterAuth(options);
const createSessionCookies = makeCreateSessionCookies(options);

const developer = { email: "dev@tackup.invalid", name: "開発用ユーザー" };

function cookieHeader(cookies: { name: string; value: string }[]) {
  return new Headers({
    cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; "),
  });
}

test("ユーザーを作り、本番と同じ形の auth で通るセッションの Cookie を返す", async () => {
  const cookies = await createSessionCookies(developer);

  const session = await auth.api.getSession({ headers: cookieHeader(cookies) });

  expect(session?.user).toMatchObject(developer);
  expect(cookies).toEqual([
    expect.objectContaining({
      name: "better-auth.session_token",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    }),
  ]);
});

test("同じメールアドレスで 2 回呼んでも、ユーザーは 1 人のまま別のセッションを作る", async () => {
  const first = await createSessionCookies(developer);
  const second = await createSessionCookies(developer);

  const users = await testDb.select().from(schema.user);
  expect(users).toHaveLength(1);
  expect(second[0].value).not.toBe(first[0].value);
  const session = await auth.api.getSession({ headers: cookieHeader(second) });
  expect(session?.user.id).toBe(users[0].id);
});

test("値を書き換えた Cookie は通らない", async () => {
  const [cookie] = await createSessionCookies(developer);
  const forged = [{ name: cookie.name, value: `${cookie.value}x` }];

  const session = await auth.api.getSession({ headers: cookieHeader(forged) });

  expect(session).toBeNull();
});
