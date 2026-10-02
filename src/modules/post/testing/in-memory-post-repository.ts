import {
  isPublished,
  type Post,
  type PostCursor,
} from "@/modules/post/domain/post";
import type {
  CreatePostData,
  FindPublishedInput,
  PostRepository,
} from "@/modules/post/domain/post-repository";

export function makeInMemoryPostRepository() {
  const posts: Post[] = [];

  async function create(data: CreatePostData): Promise<Post> {
    const now = new Date();
    const post: Post = {
      ...data,
      removedAt: null,
      removedBy: null,
      createdAt: now,
      updatedAt: now,
    };
    posts.push(post);
    return post;
  }

  async function countActiveByBoardId(boardId: string): Promise<number> {
    return posts.filter(
      (post) => post.boardId === boardId && post.status !== "removed",
    ).length;
  }

  async function sumFileSizeByBoardId(boardId: string): Promise<number> {
    return posts
      .filter((post) => post.boardId === boardId)
      .reduce((sum, post) => sum + post.originalSize + post.thumbnailSize, 0);
  }

  /** 並び順（掲示開始の新しい順、同じなら ID の大きい順）で、`a` が `b` より前に来るか。 */
  function comesBefore(a: PostCursor, b: PostCursor): boolean {
    const difference = a.publishFrom.getTime() - b.publishFrom.getTime();
    return difference === 0 ? a.id > b.id : difference > 0;
  }

  async function findPublished({
    boardId,
    now,
    limit,
    after,
  }: FindPublishedInput): Promise<Post[]> {
    return posts
      .filter((post) => post.boardId === boardId && isPublished(post, now))
      .filter((post) => !after || comesBefore(after, post))
      .sort((a, b) => (comesBefore(a, b) ? -1 : 1))
      .slice(0, limit);
  }

  async function findByPublicId(publicId: string): Promise<Post | null> {
    return posts.find((post) => post.publicId === publicId) ?? null;
  }

  const repository: PostRepository = {
    create,
    countActiveByBoardId,
    sumFileSizeByBoardId,
    findPublished,
    findByPublicId,
  };

  return { repository, posts };
}
