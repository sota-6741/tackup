import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/env";
import { db } from "@/shared/infrastructure/db";
import { logAuthEvent } from "./auth-logger";
import * as schema from "./schema";
import { withoutOAuthTokens } from "./without-oauth-tokens";

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
  databaseHooks: withoutOAuthTokens,
  logger: { log: logAuthEvent },
  rateLimit: { storage: "database" },
  plugins: [nextCookies()],
});
