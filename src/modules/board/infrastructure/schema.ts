import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "../../auth/infrastructure/schema";

export const board = pgTable("board", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const boardMember = pgTable(
  "board_member",
  {
    boardId: uuid("board_id")
      .notNull()
      .references(() => board.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "poster"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.boardId, table.userId] }),
    index("board_member_user_id_idx").on(table.userId),
  ],
);

export const inviteToken = pgTable(
  "invite_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => board.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("invite_token_active_board_id_unique")
      .on(table.boardId)
      .where(sql`"revoked_at" IS NULL`),
  ],
);
