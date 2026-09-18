import { and, desc, eq } from "drizzle-orm";
import type { Board } from "@/modules/board/domain/board";
import type { BoardMember } from "@/modules/board/domain/board-member";
import type {
  AddInviteTokenData,
  AddMemberData,
  BoardRepository,
  CreateBoardData,
} from "@/modules/board/domain/board-repository";
import { withSafeDatabaseErrors } from "@/shared/infrastructure/database-error";
import type { DbExecutor } from "@/shared/infrastructure/db";
import { board, boardMember, inviteToken } from "./schema";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** board.id は uuid 型の列なので、UUID 形式でない値で検索すると Postgres がエラーを投げる。検索前にこれで弾き、見つからない扱いにする。 */
function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function makeDrizzleBoardRepository(db: DbExecutor): BoardRepository {
  async function create(data: CreateBoardData): Promise<Board> {
    const [created] = await db.insert(board).values(data).returning();
    return created;
  }

  async function addMember(data: AddMemberData): Promise<void> {
    await db.insert(boardMember).values(data);
  }

  async function addInviteToken(data: AddInviteTokenData): Promise<void> {
    await db.insert(inviteToken).values(data);
  }

  async function findById(boardId: string): Promise<Board | null> {
    if (!isUuid(boardId)) return null;
    const [found] = await db.select().from(board).where(eq(board.id, boardId));
    return found ?? null;
  }

  async function findAllByUserId(userId: string): Promise<Board[]> {
    const rows = await db
      .select({ board })
      .from(boardMember)
      .innerJoin(board, eq(board.id, boardMember.boardId))
      .where(eq(boardMember.userId, userId))
      .orderBy(desc(boardMember.createdAt));
    return rows.map((row) => row.board);
  }

  async function findMember(
    boardId: string,
    userId: string,
  ): Promise<BoardMember | null> {
    if (!isUuid(boardId)) return null;
    const [found] = await db
      .select()
      .from(boardMember)
      .where(
        and(eq(boardMember.boardId, boardId), eq(boardMember.userId, userId)),
      );
    return found ?? null;
  }

  return withSafeDatabaseErrors({
    create,
    addMember,
    addInviteToken,
    findById,
    findAllByUserId,
    findMember,
  });
}
