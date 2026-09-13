export interface UnitOfWork<TRepositories> {
  run<T>(work: (repositories: TRepositories) => Promise<T>): Promise<T>;
}
