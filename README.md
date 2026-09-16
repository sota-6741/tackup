# tackup

Next.js のテンプレートです。

| 分類                     | 技術                                                            |
| ------------------------ | --------------------------------------------------------------- |
| フレームワーク           | Next.js 16 (App Router, React Compiler) / React 19 / TypeScript |
| パッケージマネージャー   | bun                                                             |
| UI                       | Tailwind CSS v4 / shadcn/ui (base-nova)                         |
| DB                       | PostgreSQL 18 / Drizzle ORM                                     |
| 認証                     | Better Auth (Google OAuth)                                      |
| バリデーション・環境変数 | Zod / @t3-oss/env-nextjs                                        |
| Lint・フォーマット       | Biome                                                           |
| テスト                   | Vitest + Testing Library / Playwright                           |
| CI                       | GitHub Actions                                                  |

## セットアップ

```bash
bun install
cp .env.example .env       # 値を埋める（BETTER_AUTH_SECRET は openssl rand -base64 32）
bun run db:up              # PostgreSQL を起動
bun run db:migrate         # マイグレーションを適用
bun run dev
```

### Google OAuth

[Google Cloud Console](https://console.cloud.google.com/apis/credentials) で OAuth クライアント ID（ウェブアプリケーション）を作成し、`GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` を `.env` に設定します。

- 承認済みのリダイレクト URI: `http://localhost:3000/api/auth/callback/google`

## スクリプト

| コマンド                          | 内容                                                                        |
| --------------------------------- | --------------------------------------------------------------------------- |
| `bun run dev`                     | 開発サーバーを起動                                                          |
| `bun run build` / `bun run start` | 本番ビルド / 本番サーバーを起動                                             |
| `bun run check`                   | 型チェック・lint・ユニットテストをまとめて実行（変更のたびに）              |
| `bun run check:all`               | `check` に加えて DB を使うテストも実行（DB を触ったとき、コミット前）       |
| `bun run lint` / `bun run format` | Biome と依存ルールのチェック / Biome で自動修正                             |
| `bun run typecheck`               | 型チェック                                                                  |
| `bun run test`                    | ユニットテスト (Vitest、DB を使わない)                                      |
| `bun run test:db`                 | DB を使うテスト (Vitest、PostgreSQL の起動が必要)                           |
| `bun run test:e2e`                | E2E テスト (Playwright、初回は `bunx playwright install chromium`)          |
| `bun run db:up`                   | PostgreSQL を起動 (Docker)                                                  |
| `bun run db:generate`             | スキーマからマイグレーションを生成                                          |
| `bun run db:migrate`              | マイグレーションを適用                                                      |
| `bun run db:studio`               | Drizzle Studio を起動                                                       |
| `bun run auth:generate`           | Better Auth の設定から `src/modules/auth/infrastructure/schema.ts` を再生成 |

## アーキテクチャ

オニオンアーキテクチャーを、機能（モジュール）ごと × レイヤーで構成しています。

```
src/
├── app/                        ルーティングのみ（presentation / di を呼ぶ）
├── di/                         Composition Root（infrastructure を use case に注入）
├── modules/
│   ├── auth/
│   │   ├── infrastructure/     Better Auth の本体、テーブル定義
│   │   └── presentation/       getSession、サインイン/サインアウトのボタン
│   └── <feature>/
│       ├── domain/             エンティティ、値オブジェクト、Repository のインターフェース
│       ├── application/        ユースケース（makeXxx(deps) の形）
│       ├── infrastructure/     テーブル定義（schema.ts）、Drizzle による Repository 実装
│       ├── presentation/       Server Actions、コンポーネント
│       └── testing/            インメモリの Repository（テスト用）
├── shared/
│   ├── domain/                 DomainError など
│   ├── infrastructure/         DB クライアント
│   └── presentation/           shadcn/ui
├── env.ts                      型付きの環境変数
└── proxy.ts                    未ログイン時に /boards からリダイレクト（楽観的チェック）
e2e/                            Playwright のテスト
drizzle/                        生成されたマイグレーション
```

### 依存のルール

依存は外側から内側への一方向だけです。ルールは `.dependency-cruiser.cjs` に定義していて、`bun run lint` と CI で違反をチェックします。

| レイヤー       | 依存してよいもの                                   |
| -------------- | -------------------------------------------------- |
| domain         | domain のみ（外部パッケージも不可）                |
| application    | domain / application のみ（外部パッケージも不可）  |
| infrastructure | domain / application / 外部パッケージ / `env.ts`   |
| presentation   | domain / application / di（infrastructure は不可） |
| di             | presentation と app 以外すべて                     |
| app            | presentation / di / domain の型                    |

認証の本チェックは各ページで `getSession()` を使って行います。`proxy.ts` は Cookie の有無だけを見る軽いチェックです。

## 開発の流れ

### 日々の作業

```bash
bun run db:up        # PostgreSQL を起動（開発を始めるとき）
bun run dev          # 開発サーバーを起動
bun run format       # 書いたコードを整形
bun run check        # 型チェック・lint・ユニットテスト（変更のたびに）
bun run check:all    # DB を使うテストも含めて実行（DB を触ったとき、コミットの前）
```

`check` は途中で失敗するとそこで止まります。`format` はファイルを書き換えるので `check` には含めていません。

### 機能（モジュール）の追加

1. `domain/`：エンティティ、値オブジェクト、Repository のインターフェース
2. `application/`：`makeXxx({ repository })` の形でユースケースを書き、`testing/` のインメモリ Repository でテストする
3. `infrastructure/`：`schema.ts` にテーブルを書き（import は相対パス）、Repository を実装する → `bun run db:generate` → `bun run db:migrate`。Repository は `*.db.test.ts` で実際の PostgreSQL に対してテストする（`bun run test:db`）
4. `src/di/<feature>.ts`：Repository を注入してユースケースを組み立てる
5. `presentation/`：Server Actions とコンポーネントから `@/di/<feature>` を呼ぶ

### UI コンポーネントの追加

`bunx shadcn@latest add dialog` を実行すると、`src/shared/presentation/components/ui` に追加されます。
