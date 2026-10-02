import "server-only";
import { makeAllowPublicView } from "@/shared/domain/rate-limiter";
import { db } from "@/shared/infrastructure/db";
import { makeDrizzleRateLimiter } from "@/shared/infrastructure/drizzle-rate-limiter";
import { trustedProxyCount } from "@/shared/infrastructure/trusted-proxy";

export const rateLimiter = makeDrizzleRateLimiter({ db });

export const allowPublicView = makeAllowPublicView({
  rateLimiter,
  trustedProxyCount,
});
