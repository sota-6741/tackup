import type { BetterAuthOptions } from "better-auth";

const EMPTY_OAUTH_TOKENS = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
};

export const withoutOAuthTokens: BetterAuthOptions["databaseHooks"] = {
  account: {
    create: {
      before: async (account) => ({
        data: { ...account, ...EMPTY_OAUTH_TOKENS },
      }),
    },
    update: {
      before: async (account) => ({
        data: { ...account, ...EMPTY_OAUTH_TOKENS },
      }),
    },
  },
};
