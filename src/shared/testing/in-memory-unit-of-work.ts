import type { UnitOfWork } from "@/shared/domain/unit-of-work";

export function makeInMemoryUnitOfWork<TRepositories>(
  repositories: TRepositories,
): UnitOfWork<TRepositories> {
  return { run: (work) => work(repositories) };
}
