<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# コマンド

- 変更を終える前に `bun run check`（型チェック・lint・ユニットテスト）を実行する。infrastructure・DB・ファイルストレージを変えたときは `bun run test:db` と `bun run test:storage`（または `bun run check:all`）も実行する。PostgreSQL は `bun run db:up` で、Cloud Storage のエミュレーターは `bun run storage:up` のあと `bun run storage:setup` で用意する。

# 仕様書

- 機能を実装する前に `docs/requirements.md` を、画面の仕様は `docs/screens.md` を読む。これらが正とする。決めたことが変わったら更新する。

# 構成: オニオンアーキテクチャー（機能モジュール × レイヤー）

```
src/app/                          ルーティングのみ。presentation か di を呼ぶ
src/di/                           Composition Root。infrastructure を use case に注入する
src/modules/<feature>/domain/     エンティティ、値オブジェクト、Repository のインターフェース（パッケージ不可）
src/modules/<feature>/application/ `makeXxx(deps)` の形の use case（パッケージ不可）
src/modules/<feature>/infrastructure/ Drizzle のテーブル（`schema.ts`）と Repository の実装
src/modules/<feature>/presentation/ Server Actions とコンポーネント
src/shared/{domain,infrastructure,presentation}/ 機能をまたぐコード（shadcn/ui は shared/presentation）
```

- 依存は内側に向かうだけ。`bun run lint` が dependency-cruiser（`.dependency-cruiser.cjs`）で確かめる。
- presentation は infrastructure を import しない。use case は `@/di/*` から受け取る。
- `@/env` は infrastructure でだけ読む。
- テスト用のコードは `testing/` に、開発用のツールは `scripts/` に置く。本番のコードはどちらも import しない（`bun run lint` の `no-testing-code-in-app`・`no-scripts-in-app` が確かめる）。

# 詳しい決まり

詳しい決まりは `.claude/rules/` にある。Claude Code は、各ファイルの `paths` に合うファイルを扱うときに自動で読み込む。ほかのエージェントは、その範囲を変える前に該当するファイルを読む。

- `error-handling.md`: `null`・型付きの結果・`throw` の使い分けと、どのレイヤーが何を扱うか。想定内の失敗で `DomainError` を投げている既存コードはこの方針より前のもので、新しくは足さない。
- `testing.md`: インメモリの Repository、`*.db.test.ts`、ファイルストレージのテスト
- `database.md`: Drizzle のテーブル、`withSafeDatabaseErrors`
- `ui.md`: Base UI 上の shadcn/ui
- `code-style.md`: JSDoc、オブジェクトの引数
- `pull-requests.md`: ブランチ、push 前のレビュー、ボットの指摘、PR のタイトル
