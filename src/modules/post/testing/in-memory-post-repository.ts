import type { Post } from "@/modules/post/domain/post";
import type {
  CreatePostData,
  PostRepository,
} from "@/modules/post/domain/post-repository";

export function makeInMemoryPostRepository() {
  const posts: Post[] = [];

  async function create(data: CreatePostData): Promise<Post> {
    const now = new Date();
    const post: Post = {
      ...data,
      description: null,
      externalUrl: null,
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

  const repository: PostRepository = {
    create,
    countActiveByBoardId,
    sumFileSizeByBoardId,
  };

  return { repository, posts };
}
