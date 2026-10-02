import { randomUUID } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../src/modules/auth/infrastructure/schema";
import { makeCreateSessionCookies } from "../../src/modules/auth/infrastructure/test-auth";

// CI は環境変数を直接渡す。ローカルでは Next.js と同じ .env を読む。
if (!process.env.DATABASE_URL) process.loadEnvFile();

const { DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL } = process.env;
if (!DATABASE_URL || !BETTER_AUTH_SECRET || !BETTER_AUTH_URL) {
  throw new Error(
    "e2e のログインには DATABASE_URL・BETTER_AUTH_SECRET・BETTER_AUTH_URL が要ります",
  );
}

/** アプリと同じ秘密の値と DB を使うので、ここで作った Cookie はアプリでそのまま通る。 */
const createSessionCookies = makeCreateSessionCookies({
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  database: drizzleAdapter(drizzle(postgres(DATABASE_URL, { max: 1 })), {
    provider: "pg",
    schema,
  }),
});

const COOKIE_DOMAIN = new URL(BETTER_AUTH_URL).hostname;

const SAME_SITE = { lax: "Lax", strict: "Strict", none: "None" } as const;

/** Google を通さずに、新しいユーザーとしてログインした状態にする。テストごとに別のユーザーを作るので、ほかのテストのデータに影響されない。 */
export async function signIn(context: BrowserContext): Promise<void> {
  const cookies = await createSessionCookies({
    email: `e2e-${randomUUID()}@tackup.invalid`,
    name: "e2e ユーザー",
  });
  await context.addCookies(
    cookies.map(
      ({ name, value, path, httpOnly, secure, sameSite, expires }) => ({
        name,
        value,
        domain: COOKIE_DOMAIN,
        path,
        httpOnly,
        secure,
        sameSite: SAME_SITE[sameSite],
        expires: expires ? Math.floor(expires.getTime() / 1000) : -1,
      }),
    ),
  );
}
