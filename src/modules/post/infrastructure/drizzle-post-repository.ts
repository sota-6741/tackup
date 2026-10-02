import { and, count, eq, ne, sql } from "drizzle-orm";
import type { Post } from "@/modules/post/domain/post";
import type {
  CreatePostData,
  PostRepository,
} from "@/modules/post/domain/post-repository";
import { withSafeDatabaseErrors } from "@/shared/infrastructure/database-error";
import type { DbExecutor } from "@/shared/infrastructure/db";
import { post } from "./schema";

export function makeDrizzlePostRepository(db: DbExecutor): PostRepository {
  async function create(data: CreatePostData): Promise<Post> {
    const [created] = await db.insert(post).values(data).returning();
    return created;
  }

  async function countActiveByBoardId(boardId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(post)
      .where(and(eq(post.boardId, boardId), ne(post.status, "removed")));
    return row.value;
  }

  async function sumFileSizeByBoardId(boardId: string): Promise<number> {
    const [row] = await db
      .select({
        value: sql<string>`coalesce(sum(${post.originalSize} + ${post.thumbnailSize}), 0)`,
      })
      .from(post)
      .where(eq(post.boardId, boardId));
    return Number(row.value);
  }

  return withSafeDatabaseErrors({
    create,
    countActiveByBoardId,
    sumFileSizeByBoardId,
  });
}
