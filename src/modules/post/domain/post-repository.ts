import type { Post } from "./post";

export type CreatePostData = Pick<
  Post,
  | "id"
  | "publicId"
  | "boardId"
  | "title"
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
}
