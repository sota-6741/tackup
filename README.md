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
bun run storage:up         # ファイルの保存先（Cloud Storage のエミュレーター）を起動
bun run storage:setup      # 署名用の鍵とバケットと CORS を準備
bun run dev
```

### Google OAuth

[Google Cloud Console](https://console.cloud.google.com/apis/credentials) で OAuth クライアント ID（ウェブアプリケーション）を作成し、`GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` を `.env` に設定します。

- 承認済みのリダイレクト URI: `http://localhost:3000/api/auth/callback/google`

## 本番に出すとき

- **回数制限に使う IP のヘッダー**：Better Auth のログインの回数制限（本番だけ有効、記録は DB の `rate_limit` テーブル）は、`X-Forwarded-For` からクライアントの IP を取る。ホスティングによって信頼できるヘッダーが違うので、`src/modules/auth/infrastructure/auth.ts` の `advanced.ipAddress`（`ipAddressHeaders` または `trustedProxies`）を合わせて設定する。IP が取れないと、全員が1つの枠を共有してしまう。
- **本番の DB**：インターネットに公開せず、アプリのサーバーからだけ接続できるようにする（ホスティングの内部ネットワークや、接続元の IP の制限を使う）。パスワードは推測できない長い値にする。`DATABASE_URL` には `?sslmode=require` を付け、DB との通信を暗号化する。
- **HSTS**：`Strict-Transport-Security` に `includeSubDomains` を付けているので、公開するドメインのサブドメインもすべて HTTPS で配信する。
- **Google OAuth**：承認済みのリダイレクト URI に `https://<本番のドメイン>/api/auth/callback/google` を追加する。
- **ファイルの保存先（Cloud Storage）**：
  - バケットは「均一なバケットレベルのアクセス」と「公開アクセスの防止」を有効にして作る（ファイルは署名付き URL でだけ取得する）。
  - `STORAGE_BUCKET` にバケット名を設定する。`STORAGE_API_ENDPOINT` と `GOOGLE_APPLICATION_CREDENTIALS` は**設定しない**（Cloud Run のサービスアカウントで署名する）。
  - プロジェクトで IAM Service Account Credentials API（`iamcredentials.googleapis.com`）を有効にする。鍵ファイルなしの署名はこの API を使うので、無効だと署名付き URL の発行が実行時に失敗する。
  - アプリのサービスアカウントに付ける権限は2つだけ。
    - そのバケットへの `roles/storage.objectUser`
    - **自分自身**への `roles/iam.serviceAccountTokenCreator`（鍵ファイルなしで署名するために必要）
  - CORS は `gcloud storage buckets update gs://<バケット名> --cors-file=<ファイル>` で設定する。送信元は本番のオリジンだけ、メソッドは `PUT` と `GET`、ヘッダーは `content-type` と `x-goog-content-length-range`。`bun run storage:setup` はローカル用。

## CI から実際の Cloud Storage を使うテスト

ローカルのエミュレーターは署名を検証しないので、「サイズ・種類が違うアップロードが拒否されるか」「期限切れ・署名なしの取得が拒否されるか」は、本物のバケットでしか確かめられない。これを CI（`gcs` ジョブ）から確かめる。

1. **本番とは別の GCP プロジェクト**を作り、テスト用のバケットを作る（「公開アクセスの防止」を有効に）。
2. バケットに「1日で自動削除」のライフサイクルを設定する（テストのファイルが残らないようにする）。
3. テスト用のサービスアカウントを作り、**そのバケットだけ**に `roles/storage.objectUser` と、自分自身への `roles/iam.serviceAccountTokenCreator` を付ける。ほかの権限は付けない。
4. Workload Identity 連携（プールとプロバイダ）を作り、**このリポジトリからのみ**に限定する条件を必ず付ける（`assertion.repository == 'sota-6741/tackup'`）。ここを空にすると、誰のリポジトリからでも接続できてしまう。
5. GitHub 側の principal を、テスト用のサービスアカウントに `roles/iam.workloadIdentityUser` でバインドする。これがないと認証できない（3 の `roles/iam.serviceAccountTokenCreator` は署名のための権限で、こちらの代わりにはならない）。

   ```bash
   gcloud iam service-accounts add-iam-policy-binding <サービスアカウントのメールアドレス> \
     --role=roles/iam.workloadIdentityUser \
     --member="principalSet://iam.googleapis.com/projects/<プロジェクト番号>/locations/global/workloadIdentityPools/<プール名>/attribute.repository/sota-6741/tackup"
   ```

6. GitHub のリポジトリの変数（Variables。シークレットではない）に次を設定すると、`gcs` ジョブが動き出す。
   - `GCS_TEST_BUCKET`：テスト用のバケット名
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`：プロバイダのリソース名
   - `GCP_SERVICE_ACCOUNT`：テスト用のサービスアカウントのメールアドレス

鍵ファイル（JSON）は作らない。fork からの PR ではこのジョブは動かない（接続できないため）。

## スクリプト

| コマンド                          | 内容                                                                        |
| --------------------------------- | --------------------------------------------------------------------------- |
| `bun run dev`                     | 開発サーバーを起動                                                          |
| `bun run build` / `bun run start` | 本番ビルド / 本番サーバーを起動                                             |
| `bun run check`                   | 型チェック・lint・ユニットテストをまとめて実行（変更のたびに）              |
| `bun run check:all`               | `check` に加えて DB とストレージを使うテストも実行（コミット前）            |
| `bun run lint` / `bun run format` | Biome と依存ルールのチェック / Biome で自動修正                             |
| `bun run typecheck`               | 型チェック                                                                  |
| `bun run test`                    | ユニットテスト (Vitest、DB を使わない)                                      |
| `bun run test:db`                 | DB を使うテスト (Vitest、PostgreSQL の起動が必要)                           |
| `bun run test:storage`            | ストレージを使うテスト (Vitest、エミュレーターの起動が必要)                 |
| `bun run test:gcs`                | 実際の Cloud Storage に対するテスト (CI 用。`GCS_TEST_BUCKET` と GCP の認証が必要) |
| `bun run test:e2e`                | E2E テスト (Playwright、初回は `bunx playwright install chromium`)          |
| `bun run db:up`                   | PostgreSQL を起動 (Docker)                                                  |
| `bun run storage:up`              | ファイルの保存先（エミュレーター）を起動 (Docker)                           |
| `bun run storage:setup`           | 署名用の使い捨ての鍵・バケット・CORS を準備（何度実行してもよい）            |
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
bun run storage:up   # ファイルの保存先（エミュレーター）を起動（開発を始めるとき）
bun run dev          # 開発サーバーを起動
bun run format       # 書いたコードを整形
bun run check        # 型チェック・lint・ユニットテスト（変更のたびに）
bun run check:all    # DB とストレージを使うテストも含めて実行（コミットの前）
```

`check` は途中で失敗するとそこで止まります。`format` はファイルを書き換えるので `check` には含めていません。

### プルリクエスト

`main` には直接 push できません（ルールセット「main を保護」）。

1. `main` からブランチを作り、コミットして push する
2. `gh pr create` で PR を作る。タイトルは `prefix: 日本語の説明`（マージコミットの件名になる）
3. CI（`check`）と、レビューのボット（CodeRabbit・GitHub Copilot）が自動で動く
4. レビューの指摘に対応し、会話を解決済み（Resolve）にする
5. CI が通り、会話がすべて解決済みになったら、マージコミットでマージする（ブランチは自動で消える）

### 機能（モジュール）の追加

1. `domain/`：エンティティ、値オブジェクト、Repository のインターフェース
2. `application/`：`makeXxx({ repository })` の形でユースケースを書き、`testing/` のインメモリ Repository でテストする
3. `infrastructure/`：`schema.ts` にテーブルを書き（import は相対パス）、Repository を実装する → `bun run db:generate` → `bun run db:migrate`。Repository は `return withSafeDatabaseErrors({ ... })` で包み、ログに SQL の値が出ないようにする。`*.db.test.ts` で実際の PostgreSQL に対してテストする（`bun run test:db`）
4. `src/di/<feature>.ts`：Repository を注入してユースケースを組み立てる
5. `presentation/`：Server Actions とコンポーネントから `@/di/<feature>` を呼ぶ

### UI コンポーネントの追加

`bunx shadcn@latest add dialog` を実行すると、`src/shared/presentation/components/ui` に追加されます。
