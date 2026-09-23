---
paths:
  - "src/**/*.{ts,tsx}"
---

# テスト

- domain と application は、`modules/<feature>/testing/` のインメモリの Repository でテストする。
- DB を使う infrastructure（Repository の実装など）は、`*.db.test.ts` で実際の PostgreSQL に対してテストする（`bun run test:db`。`@/shared/testing/test-db` の `testDb` を使う。テーブルは各テストの前に空にされる）。`bun run test` は DB を使わないままにする。DB を使わない infrastructure（エラーの変換など）は、ふつうの `*.test.ts` でテストしてよい。
- ファイルストレージのコードは `@google-cloud/storage` を使い、2 段でテストする。
  - `*.storage.test.ts`: ローカルのエミュレーターに対して動かす（`bun run test:storage`。`@/shared/testing/test-storage` の `testStorageClient` を使う）。正常系と、署名付き URL の中身を確かめる。
  - `*.gcs.test.ts`: CI で開発用の実バケットに対して動かす（`bun run test:gcs`。`GCS_TEST_BUCKET` と GCP の認証情報が要る）。エミュレーターは署名を検証しないので、違うサイズ・種類の拒否、期限切れの URL、署名なしの読み取りはこちらでテストする。
- テスト名は日本語で書く。
