import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { testDb } from "@/shared/testing/test-db";
import * as schema from "./schema";
import { withoutOAuthTokens } from "./without-oauth-tokens";

const auth = betterAuth({
  secret: "test-secret-test-secret-test-secret",
  baseURL: "http://localhost:3000",
  database: drizzleAdapter(testDb, { provider: "pg", schema }),
  databaseHooks: withoutOAuthTokens,
});

const tokens = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  idToken: "id-token",
  accessTokenExpiresAt: new Date("2026-01-01T01:00:00Z"),
  refreshTokenExpiresAt: new Date("2026-01-02T00:00:00Z"),
};

const emptyTokens = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
};

async function createGoogleAccount() {
  const now = new Date();
  await testDb.insert(schema.user).values({
    id: "user-1",
    name: "山田 太郎",
    email: "yamada@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  const { internalAdapter } = await auth.$context;
  return internalAdapter.createAccount({
    userId: "user-1",
    providerId: "google",
    accountId: "google-account-1",
    ...tokens,
  });
}

async function findAccount(id: string) {
  const [found] = await testDb
    .select()
    .from(schema.account)
    .where(eq(schema.account.id, id));
  return found;
}

test("Google のアカウントを作るとき、トークンと有効期限は保存せず、ほかの値は保存する", async () => {
  const created = await createGoogleAccount();

  expect(await findAccount(created.id)).toMatchObject({
    providerId: "google",
    accountId: "google-account-1",
    ...emptyTokens,
  });
});

test("サインインでアカウントを更新するとき、新しいトークンと有効期限も保存しない", async () => {
  const created = await createGoogleAccount();
  const { internalAdapter } = await auth.$context;

  await internalAdapter.updateAccount(created.id, tokens);

  expect(await findAccount(created.id)).toMatchObject({
    providerId: "google",
    accountId: "google-account-1",
    ...emptyTokens,
  });
});
