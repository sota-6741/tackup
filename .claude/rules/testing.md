---
paths:
  - "src/**/*.{ts,tsx}"
---

# テスト

- domain と application は、`modules/<feature>/testing/` のインメモリの Repository でテストする。
- DB を使う infrastructure（Repository の実装など）は、`*.db.test.ts` で実際の PostgreSQL に対してテストする（`bun run test:db`。`@/shared/testing/test-db` の `testDb` を使う。テーブルは各テストの前に空にされる）。`bun run test` は DB を使わないままにする。DB を使わない infrastructure（エラーの変換など）は、ふつうの `*.test.ts` でテストしてよい。
- テスト名は日本語で書く。
