---
paths:
  - "src/**/infrastructure/**"
  - "src/di/**"
  - "drizzle/**"
---

# データベース（Drizzle）

- テーブルのファイル（`infrastructure/schema.ts`）は drizzle-kit が読み込むので、import は `@/` ではなく相対パスで書く。
- Repository の実装は `return withSafeDatabaseErrors({ ... })` で包み、ログやエラーに SQL の値が出ないようにする（`.claude/rules/error-handling.md`）。
- テーブルを変えたら `bun run db:generate` → `bun run db:migrate` を実行する。`drizzle/meta/**` は drizzle-kit が生成するので手で直さない。
