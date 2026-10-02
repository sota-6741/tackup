import type { Post, PostCursor } from "./post";

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
  /** 公開の URL に使う ID から探す。公開中かどうかは見ない。 */
  findByPublicId(publicId: string): Promise<Post | null>;
}

export type FindPublishedInput = {
  boardId: string;
  now: Date;
  limit: number;
  after?: PostCursor;
};
