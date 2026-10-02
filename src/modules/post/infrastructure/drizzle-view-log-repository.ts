import type { ViewLogRepository } from "@/modules/post/domain/view-log-repository";
import { withSafeDatabaseErrors } from "@/shared/infrastructure/database-error";
import type { DbExecutor } from "@/shared/infrastructure/db";
import { viewLog } from "./schema";

export function makeDrizzleViewLogRepository(
  db: DbExecutor,
): ViewLogRepository {
  async function record(postId: string): Promise<void> {
    await db.insert(viewLog).values({ postId });
  }

  return withSafeDatabaseErrors({ record });
}
