import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "../../auth/infrastructure/schema";
import { board } from "../../board/infrastructure/schema";
import { ORIGINAL_CONTENT_TYPES } from "../domain/original-file";
import { POST_STATUSES } from "../domain/post";

export const post = pgTable(
  "post",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => board.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    externalUrl: text("external_url"),
    originalKey: text("original_key").notNull(),
    originalContentType: text("original_content_type", {
      enum: ORIGINAL_CONTENT_TYPES,
    }).notNull(),
    originalSize: bigint("original_size", { mode: "number" }).notNull(),
    thumbnailKey: text("thumbnail_key").notNull(),
    thumbnailSize: bigint("thumbnail_size", { mode: "number" }).notNull(),
    thumbnailWidth: integer("thumbnail_width").notNull(),
    thumbnailHeight: integer("thumbnail_height").notNull(),
    publishFrom: timestamp("publish_from", { withTimezone: true }).notNull(),
    // null は無期限。下の check は、null のときは成り立つものとして扱われる。
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    status: text("status", { enum: POST_STATUSES }).notNull(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removedBy: text("removed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("post_board_id_idx").on(table.boardId),
    // 公開中の一覧の絞り込みと並び順に合わせる。一覧は新しい順（降順）だが、索引は昇順で作る。
    // 逆向きにたどれば降順になる。`.desc()` で作ると `DESC NULLS LAST` になり、問い合わせの `ORDER BY … DESC`（`NULLS FIRST` が既定）と
    // 順序が合わず、並べ替えに使われない。列が NOT NULL でも、PostgreSQL は NULL の位置まで含めて照合する。
    index("post_published_idx")
      .on(table.boardId, table.publishFrom, table.id)
      .where(sql`${table.status} = 'published'`),
    check(
      "post_expires_after_publish",
      sql`${table.expiresAt} > ${table.publishFrom}`,
    ),
    check("post_original_size_positive", sql`${table.originalSize} > 0`),
    check("post_thumbnail_size_positive", sql`${table.thumbnailSize} > 0`),
  ],
);

/** 掲示物詳細が開かれた記録。だれが開いたかは持たない。 */
export const viewLog = pgTable(
  "view_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // 掲示物ごとに、期間で数える・古い記録を消すための索引。
    index("view_log_post_id_created_at_idx").on(table.postId, table.createdAt),
  ],
);
