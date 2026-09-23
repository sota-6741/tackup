---
paths:
  - "src/**/*.{ts,tsx}"
---

# テスト

- domain と application は、`modules/<feature>/testing/` のインメモリの Repository でテストする。
- infrastructure は、`*.db.test.ts` で実際の PostgreSQL に対してテストする（`bun run test:db`。`@/shared/testing/test-db` の `testDb` を使う。テーブルは各テストの前に空にされる）。`bun run test` は DB を使わないままにする。
- テスト名は日本語で書く。
