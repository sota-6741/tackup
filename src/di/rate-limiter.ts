import "server-only";
import { db } from "@/shared/infrastructure/db";
import { makeDrizzleRateLimiter } from "@/shared/infrastructure/drizzle-rate-limiter";

export const rateLimiter = makeDrizzleRateLimiter({ db });
