export interface ViewLogRepository {
  /** 閲覧を 1 件記録する。ID と日時は保存する側が振る。 */
  record(postId: string): Promise<void>;
}
