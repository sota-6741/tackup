import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/env";
import { db } from "@/shared/infrastructure/db";
import { logAuthEvent } from "./auth-logger";
import * as schema from "./schema";

const WITHOUT_OAUTH_TOKENS = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
};

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  databaseHooks: {
    account: {
      create: {
        before: async (account) => ({
          data: { ...account, ...WITHOUT_OAUTH_TOKENS },
        }),
      },
      update: {
        before: async (account) => ({
          data: { ...account, ...WITHOUT_OAUTH_TOKENS },
        }),
      },
    },
  },
  logger: { log: logAuthEvent },
  rateLimit: { storage: "database" },
  plugins: [nextCookies()],
});
