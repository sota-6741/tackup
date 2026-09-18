# レビューの指示

- レビューのコメントは日本語で書く。
- プロジェクトの決まりは `AGENTS.md` にある。特に次の点に沿っているかを見る。
  - 依存は内側（domain）に向かうだけ。presentation は infrastructure を import しない。use case は `src/di/` で infrastructure を注入して組み立て、presentation はそれを `@/di/*` から受け取る。
  - 想定内の失敗は `DomainError` の子クラスを投げ、Server Action で `{ error }` の状態に変える。想定外のエラーは捕まえずに投げ直す。
  - ユーザー ID はセッションから取り、フォームや URL からは受け取らない。掲示板の操作は `assertBoardAccess` で所属とロールを確かめる。
  - ログやエラーメッセージに、トークン・秘密の値・SQL の値を出さない。リポジトリは `withSafeDatabaseErrors` で包む。
  - JSDoc は、名前と型から分からない振る舞い・理由・注意点があるときだけ、日本語で書く。
  - テスト名は日本語。
- `src/shared/presentation/components/ui/**`（shadcn/ui が生成）、`drizzle/meta/**`（drizzle-kit が生成）、`bun.lock`（bun が生成）は、手で直さないのでレビューしない。
