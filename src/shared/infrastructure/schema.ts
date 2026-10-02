import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** 回数の制限のための記録。`key` は「規則の名前:利用者」、`window_start` は時間枠の始まり。 */
export const rateLimitCounter = pgTable(
  "rate_limit_counter",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull(),
  },
  (table) => [primaryKey({ columns: [table.key, table.windowStart] })],
);
