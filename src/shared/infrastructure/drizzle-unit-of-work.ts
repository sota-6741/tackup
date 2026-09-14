import type { UnitOfWork } from "@/shared/domain/unit-of-work";
import type { Db, DbExecutor } from "@/shared/infrastructure/db";

export function makeDrizzleUnitOfWork<TRepositories>(
  db: Db,
  makeRepositories: (executor: DbExecutor) => TRepositories,
): UnitOfWork<TRepositories> {
  return {
    run: (work) => db.transaction((tx) => work(makeRepositories(tx))),
  };
}
