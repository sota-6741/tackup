import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Board } from "@/modules/board/domain/board";
import type { BoardMember } from "@/modules/board/domain/board-member";
import type {
  AddInviteTokenData,
  AddMemberData,
  BoardRepository,
  CreateBoardData,
} from "@/modules/board/domain/board-repository";
import type { InviteToken } from "@/modules/board/domain/invite-token";
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

  /** `FOR UPDATE` だと、この掲示板を参照する行（メンバーや掲示物）の追加まで待たせてしまう。同じロックを取る処理だけを待たせればよいので、`FOR NO KEY UPDATE` にする。 */
  async function lockById(boardId: string): Promise<Board | null> {
    if (!isUuid(boardId)) return null;
    const [found] = await db
      .select()
      .from(board)
      .where(eq(board.id, boardId))
      .for("no key update");
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

  async function findActiveInviteToken(
    boardId: string,
  ): Promise<InviteToken | null> {
    if (!isUuid(boardId)) return null;
    const [found] = await db
      .select()
      .from(inviteToken)
      .where(
        and(eq(inviteToken.boardId, boardId), isNull(inviteToken.revokedAt)),
      );
    return found ?? null;
  }

  /** 失効の時刻は、created_at の既定値と同じく DB の時計で記録する。 */
  async function revokeActiveInviteToken(boardId: string): Promise<void> {
    if (!isUuid(boardId)) return;
    await db
      .update(inviteToken)
      .set({ revokedAt: sql`now()` })
      .where(
        and(eq(inviteToken.boardId, boardId), isNull(inviteToken.revokedAt)),
      );
  }

  return withSafeDatabaseErrors({
    create,
    addMember,
    addInviteToken,
    findById,
    lockById,
    findAllByUserId,
    findMember,
    findActiveInviteToken,
    revokeActiveInviteToken,
  });
}
