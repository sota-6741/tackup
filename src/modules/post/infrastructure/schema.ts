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
    check(
      "post_expires_after_publish",
      sql`${table.expiresAt} > ${table.publishFrom}`,
    ),
    check("post_original_size_positive", sql`${table.originalSize} > 0`),
    check("post_thumbnail_size_positive", sql`${table.thumbnailSize} > 0`),
  ],
);
