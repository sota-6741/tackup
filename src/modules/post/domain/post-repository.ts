import type { Post, PostCursor, RemovalCursor } from "./post";

export type CreatePostData = Pick<
  Post,
  | "id"
  | "publicId"
  | "boardId"
  | "title"
  | "description"
  | "externalUrl"
  | "originalKey"
  | "originalContentType"
  | "originalSize"
  | "thumbnailKey"
  | "thumbnailSize"
  | "thumbnailWidth"
  | "thumbnailHeight"
  | "publishFrom"
  | "expiresAt"
  | "status"
>;

export interface PostRepository {
  /** `id` は呼び出し側が決める。ファイルの保存先のキーに含めるので、登録の前に要る。 */
  create(data: CreatePostData): Promise<Post>;
  /** 撤去済み（`removed`）を除いた掲示物の数。 */
  countActiveByBoardId(boardId: string): Promise<number>;
  /** 原本とサムネイルのサイズの合計（バイト）。撤去済みの掲示物も含める。 */
  sumFileSizeByBoardId(boardId: string): Promise<number>;
  /**
   * `now` の時点で公開中の掲示物を、掲示開始の新しい順（同じなら ID の大きい順）に、最大 `limit` 件返す。
   * `after` を渡すと、その位置より後ろを返す。公開中の条件は domain の `isPublished` と同じ。
   */
  findPublished(input: FindPublishedInput): Promise<Post[]>;
  /**
   * 掲示板のすべての掲示物（状態を問わない）を、掲示開始の新しい順（同じなら ID の大きい順）に、最大 `limit` 件返す。
   * `after` を渡すと、その位置より後ろを返す。
   */
  findByBoardId(input: FindByBoardIdInput): Promise<Post[]>;
  /**
   * `now` の時点で期限切れ（掲示終了を過ぎたのに、まだ撤去済みになっていない）の掲示物を、
   * 掲示終了の古い順（同じなら ID の小さい順）に、最大 `limit` 件返す。期限切れの条件は domain の `isExpired` と同じ。
   */
  findExpired(input: FindExpiredInput): Promise<ExpiredPost[]>;
  /**
   * 状態が `published` の掲示物を撤去済みにし、撤去した日時と人を記録する。
   * 書き換えたら `true`。ほかの人が先に撤去済みにしたなど、状態が `published` でなければ何もせずに `false`。
   */
  markRemoved(input: MarkRemovedInput): Promise<boolean>;
  /**
   * タイトル・説明文・外部リンク・掲示期間を書き換える。
   * 書き換えたら `true`。撤去済み（編集の画面を開いたあとに、ほかの人が撤去済みにしたなど）なら何もせずに `false`。
   */
  update(data: UpdatePostData): Promise<boolean>;
  /**
   * 原本とサムネイルを、新しいキーのファイルに書き換える。
   * 書き換えたら `true`。撤去済みなら何もせずに `false`。
   */
  replaceFiles(data: ReplaceFilesData): Promise<boolean>;
  /** 公開の URL に使う ID から探す。公開中かどうかは見ない。 */
  findByPublicId(publicId: string): Promise<Post | null>;
}

export type FindPublishedInput = {
  boardId: string;
  now: Date;
  limit: number;
  after?: PostCursor;
};

export type FindExpiredInput = {
  boardId: string;
  now: Date;
  limit: number;
  after?: RemovalCursor;
};

/** 期限切れの掲示物には、必ず掲示終了がある。 */
export type ExpiredPost = Post & { expiresAt: Date };

export type MarkRemovedInput = {
  id: string;
  removedAt: Date;
  removedBy: string;
};

export type FindByBoardIdInput = {
  boardId: string;
  limit: number;
  after?: PostCursor;
};

export type UpdatePostData = Pick<
  Post,
  "id" | "title" | "description" | "externalUrl" | "publishFrom" | "expiresAt"
>;

export type ReplaceFilesData = Pick<
  Post,
  | "id"
  | "originalKey"
  | "originalContentType"
  | "originalSize"
  | "thumbnailKey"
  | "thumbnailSize"
  | "thumbnailWidth"
  | "thumbnailHeight"
>;
