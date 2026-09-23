---
paths:
  - "src/**/*.{ts,tsx}"
---

# エラーハンドリング設計方針

## 目的

失敗・エラー・不存在をどう表し、どのレイヤーで扱うかの判断基準を定める。

エラーハンドリングを実装・変更・レビューするときは、最初から `null`・Result・`throw` のどれを使うかを決めない。まず次を考える。

> **何が起きたのか**
>
> **その情報を誰が必要としているのか**
>
> **呼び出し側はその結果を受け取って意味のある判断ができるのか**

「関数型らしいから Result を使う」「短く書けるから例外を投げる」のように、記法や好みを先にした判断をしない。

---

## 1. 失敗の分類

### 正常な不存在

処理は正常に終わったが、対象がなかった状態。

- ID で Board を探したが存在しなかった
- 条件に合うレコードがなかった
- 任意の関連データがなかった

Repository の検索では `Promise<T | null>` で表してよい。`null` はエラーを意味しない。

### 想定内のアプリケーション上の失敗

十分に起こりうる結果で、呼び出し側が理由を見て次の処理を決める必要がある状態。

- 招待の期限が切れている
- 既に Board のメンバーである
- 操作する権限がない
- 今の状態では操作できない
- 対象の Board がないので処理を続けられない
- 業務ルールを満たしていない（入力値が Domain のルールに合わないことを含む）
- リソースの状態が競合している

型付きの戻り値（Discriminated Union）で表す。「システムが壊れた」のではなくアプリケーション上ありうる結果なので、通常の制御フローとして扱い、例外を使わない。

```ts
type JoinBoardResult =
  | { ok: true; board: Board }
  | { ok: false; reason: "board_not_found" }
  | { ok: false; reason: "invite_expired" }
  | { ok: false; reason: "already_member" };
```

### Infrastructure 障害・想定外の失敗

今の呼び出し側が、その場で意味のある処理を選べない失敗。

- DB の接続失敗・クエリ失敗
- ファイルストレージの障害
- 外部 API の障害、Network timeout
- 想定外の SDK のエラー
- コード上成り立つはずの Invariant が壊れた
- プログラミング上の誤り

`throw` し、外側の境界（Next.js の `error.tsx`）まで伝える。UseCase ごとに Result へ変換しない。

---

## 2. 判断の流れ

```text
失敗・特殊な結果が起きる
        │
        ▼
正常な「不存在」か？ ── YES → T | null
        │ NO
        ▼
呼び出し側は理由を見て
意味のある分岐をするか？ ── YES → Result（Discriminated Union）
        │ NO
        ▼
Infrastructure 障害・想定外の失敗 → throw
```

判断はレイヤーによって変わる。「Board がない」は、Repository では単なる検索結果なので `Board | null`、UseCase では `{ ok: false, reason: "board_not_found" }` というアプリケーション上の結果に変えてよい。同じ出来事でも、レイヤーごとに意味が違う。

---

## 3. `null`

`null` は「処理には成功したが値がなかった」ことだけを表す。

```ts
interface BoardRepository {
  findById(boardId: string): Promise<Board | null>;
}
```

```text
Board = 問い合わせに成功し、対象があった
null  = 問い合わせに成功したが、対象がなかった
throw = 問い合わせ自体が失敗した
```

Infrastructure 障害を `null` に変えてはならない。「レコードがない」「DB が止まっている」「接続に失敗した」「SQL の実行に失敗した」がすべて同じ `null` になり、情報が失われる。

```ts
// Bad
async function findById(id: string): Promise<Board | null> {
  try {
    return await query(id);
  } catch {
    return null;
  }
}
```

---

## 4. Result を使う判断

Result は、呼び出し側が結果の種類によって正常な処理を分ける必要があるときに使う。

- 汎用の `Result<T, E>` は必須ではない。UseCase ごとの具体的な Discriminated Union のほうが意味が明確なら、そちらを優先する。
- 失敗の理由は `reason` に業務上の意味の文字列リテラルで持たせる。画面に出す文言は presentation で `reason` から決める（Domain や UseCase は文言を持たない）。
- Infrastructure のエラーを機械的に Result へ足さない。呼び出し側が `DatabaseError` と `StorageError` を見ても同じ汎用エラー画面を出すしかないなら、通常の戻り値にする意味はない。

```ts
// 避ける
Result<Board, BoardNotFound | DatabaseError | StorageError | NetworkError | UnknownError>
```

---

## 5. 例外を使う判断

例外は、今のレイヤーでは正常な処理として扱えず、上へ伝える必要がある失敗に使う（DB・Storage・外部 API の障害、予期しない Network Error、Invariant 違反、プログラミングエラー）。

UseCase ごとに catch しない。意味を足さずにそのまま投げ直すだけの catch は書かない。

```ts
// 不要
try {
  return await boardRepository.findById(boardId);
} catch (error) {
  throw error;
}
```

---

## 6. `try/catch` を足す基準

足す前に「このレイヤーはこのエラーを捕まえて何を変えるのか」を考え、明確な答えがなければ catch しない。捕まえてよい理由は次のとおり。

- **下位のエラーを翻訳する**: `DrizzleQueryError` → `DatabaseError` のように、ライブラリ固有の型を内側に漏らさない。
- **意味のある fallback**: 仕様として意図されている場合だけ。対象外のエラーは投げ直す。
  ```ts
  try {
    return await primarySource.load();
  } catch (error) {
    if (!isFallbackAllowed(error)) throw error;
    return await fallbackSource.load();
  }
  ```
- **必須の後始末**: `finally` を使う。
- **再試行できる失敗の retry**: retry の方針が明確な場合だけ（17 章）。
- **外側の境界で画面・レスポンスに変える**: Server Action・page・Route Handler・`error.tsx`。
- **安全な診断情報を足す**: 秘密の値や生の Infrastructure のエラーを外に漏らさない。

---

## 7. レイヤーごとの責務

### Presentation（Server Action・page・Route Handler）

外の世界とアプリケーションの境界。

- `FormData`・URL パラメータ・Cookie などの外部入力の取得と、形式の検証
- セッションの取得（ユーザー ID はセッションから取り、フォームや URL から受け取らない）
- UseCase の呼び出し
- UseCase の Result を画面の状態に変える
  - Server Action: `reason` から文言を決め、`{ error }` の状態を返す
  - page: 見せてはいけない・存在しない対象は `notFound()`、ログインが必要なら `redirect()`
  - Route Handler: `reason` から HTTP ステータスを決める
- 想定外の例外は捕まえずに投げ、`error.tsx` に任せる

HTTP ステータス（404・409・422・500）や `notFound()`・`redirect()` は presentation の概念。Domain・UseCase・Repository に持ち込まない。

```ts
// Good
type BoardError = "not_found" | "already_member";

// Bad
type BoardError = { status: 404 } | { status: 409 };
```

Next.js の `redirect()`・`notFound()` は内部で例外を投げる。`try` の中で呼ばない、または catch で握りつぶさない（`src/modules/board/presentation/actions.ts` のように `try` の外で呼ぶ）。

### Application（UseCase）

アプリケーションとして何をするかを組み立てる。Repository の技術的な結果を、必要に応じてアプリケーション上の意味に変える。

```ts
const board = await boardRepository.findById(boardId);
if (board === null) {
  return { ok: false, reason: "board_not_found" };
}
```

`DatabaseError` などの Infrastructure 障害を、UseCase が毎回捕まえて Result に変えない。

### Domain

Infrastructure と Presentation の詳細から独立させ、できる範囲で「入力 → 純粋な判断・変換 → 出力」にする。Next.js・HTTP ステータス・Drizzle・PostgreSQL・ファイルストレージ・SDK 固有のエラーを知らない。失敗には業務上の意味で名前を付ける。

```ts
type InviteValidationResult =
  | { valid: true }
  | { valid: false; reason: "expired" }
  | { valid: false; reason: "already_used" };
```

### Repository（interface は domain、実装は infrastructure）

Infrastructure の詳細を Application から隠す。Application は SQL・Drizzle・PostgreSQL を意識しない。検索 0 件が通常の結果なら `Promise<T | null>` でよい。DB 障害を `null` に変えてはならない。

### Infrastructure Adapter

Drizzle・PostgreSQL・Storage SDK・外部 API SDK を扱う。ライブラリ固有のエラーを上に漏らす必要がなければ、安定した Infrastructure のエラーに変える。Repository の実装は `withSafeDatabaseErrors({ ... })` で包む（`src/shared/infrastructure/database-error.ts`）。

```text
DrizzleQueryError → DatabaseError → 上へ throw
```

これはエラーを握りつぶす処理ではなく、Infrastructure 固有のエラーを安全で安定した形に変える処理である。

---

## 8. 外部入力は境界で確定させる

外から来た値は信用しない。

```text
FormData・URL・Cookie → string / unknown → parse / validate → 内部で使える値
```

必要なら、検証済みの値を型で表す。

```ts
type BoardId = string & { readonly __brand: "BoardId" };

function parseBoardId(value: string): BoardId | null {
  if (!UUID_PATTERN.test(value)) return null;
  return value as BoardId;
}
```

以降は `findById(boardId: BoardId)` のように検証済みを前提にできる。ただし型を増やすこと自体を目的にしない。同じ検証があちこちに散らばっている、または不正な値が内部に入って問題が起きているときに入れる。

---

## 9. Infrastructure のエラーと業務上の失敗の境界

DB のエラーが、アプリケーション上意味のある失敗に対応することがある（例: unique 制約違反が「既に Board のメンバーである」を意味する）。この場合は Infrastructure Adapter で PostgreSQL のエラーコードを判定し、Application が理解できる失敗に変えることを検討してよい。

```text
PostgreSQL のエラーコード → Infrastructure Adapter → Application が理解できる失敗
```

すべての DB エラーコードを変換しない。変換するのは、そのエラーがアプリケーションの仕様上はっきりした意味を持つときだけ。

---

## 10. 低レイヤーの言葉のまま上に流さない

レイヤーをまたぐときは、上が知る必要のない詳細を隠す。

```text
// Bad: Server Action が Postgres のエラーコード 23505 を直接判定する

// Good
Postgres → Repository / Infrastructure → already_member などの意味 → UseCase → Presentation

// 業務上の意味がない障害
Postgres → DatabaseError → error.tsx（汎用のエラー画面）
```

---

## 11. エラーの安全性

内部エラーの詳細をそのまま外に出さない。次が含まれうることを考える。

- セッションや招待リンクのトークン、Access Token、Refresh Token、API Key、Cookie
- SQL のパラメータ、個人情報
- Storage の認証情報、外部 API の生のレスポンス、Stack trace

`DatabaseError` のように、必要な診断情報（SQL 文・エラーコード）だけを残して値を取り除く方針を保つ。

```text
内部ログ    → 必要な診断情報
画面・応答  → 安定した理由（reason）と、決まった安全な文言
```

生の例外メッセージを画面やレスポンスに出さない。

---

## 12. 共通のエラー処理（`error.tsx`）

予期しない例外と Infrastructure 障害は、できるだけ外側の共通の境界で扱う。このプロジェクトでは Next.js の `error.tsx`（例: `src/app/boards/error.tsx`）が汎用の文言と再試行ボタンを出す。

各 Server Action・page・UseCase で同じ「問題が発生しました」の処理を繰り返さない。そのレイヤーで特別な回復や変換が必要なときだけ個別に捕まえる。

---

## 13. Retry

Result か throw かの判断と、retry するかは別の問題。retry の前に確かめる。

- そのエラーは一時的なものか
- 同じ処理をもう一度実行して安全か（冪等か）
- 1 回目が実は成功していた場合、2 回目で問題が起きないか

一時的な network failure、DB の connection timeout、rate limit は候補になりうる。ユーザー作成・課金・ファイル作成・招待のような副作用のある操作は、無条件に retry しない（必要なら Idempotency Key を使う）。

retry するときは回数の上限、backoff、必要なら jitter、対象のエラーの限定を考える。無制限の retry は禁止。

---

## 14. ログ

ログを残すときは「誰が何の判断のために読むのか」を考える。

- 同じ例外を複数のレイヤーで何度もログに出さない（Repository・UseCase・Server Action・`error.tsx` のそれぞれで出すと、1 回の障害が何度も記録される）。エラーを処理する境界か、最後に捕まえる境界で出す。
- 安全な範囲で文脈を付ける（requestId、操作名、リソースの種類、安全なリソース ID、Infrastructure のエラーコード）。
- 秘密の値や生の Request Body を出さない。

---

## 15. Validation の種類

まとめて扱わない。

- **外部入力として不正**（UUID の形でない、必須値がない、スキーマ違反）: Presentation の境界で扱う。
- **Domain 上無効**（形式は正しいが Domain のルールを満たさない。名前が長すぎる、終了日時が開始日時より前、失効した招待を使う、今の状態から遷移できない）: Domain / Application の型付きの結果で表す。

---

## 16. 画面・HTTP での扱いは契約として決める

例えば UUID の形でない ID を、400 にするか、存在しない対象と同じく `notFound()`（404）にするかは、どちらもありうる。Repository の都合ではなく、画面・API としての契約で決める。

既存の方針があれば保つ（例: 所属していない掲示板は存在を知られないよう、権限なしではなく「見つからない」と同じに扱う。`src/modules/board/application/check-board-access.ts`）。契約を変えるときは影響を確かめる。

---

## 17. 関数ベースの DI との関係

UseCase は `makeXxx(deps)` の Factory で依存を固定し、内側を「Input → UseCase → Result」の単純な関数にする。

```ts
export function makeJoinBoard({ boardRepository }: Deps) {
  return async function joinBoard({
    token,
    userId,
  }: JoinBoardInput): Promise<JoinBoardResult> {
    // ...
  };
}
```

エラーハンドリングのためだけに Class 階層や DI Container を入れない。

---

## 18. 高階関数による横断処理

複数の処理に共通する横断的な振る舞いは、高階関数で包むことを検討してよい（例: `withSafeDatabaseErrors(repository)` は「Repository → 安全な Repository」への変換）。ただし「高階関数を使いたいから」という理由だけで抽象化しない。具体的な重複や共通の責務があるときだけ入れる。

---

## 19. 過剰な抽象化を避ける

Either・Option・TaskEither・Effect System・汎用の Error Monad・複雑な pipe / compose・独自の巨大な Result Framework を、具体的な必要なしに入れない。これらが悪いわけではないが、このプロジェクトでは読みやすさ・変更のしやすさ・型安全性・依存関係の明確さ・副作用の境界・テストのしやすさを優先する。抽象化は、それで具体的な問題が解決するときだけ足す。

---

## 20. エラー型の粒度

細かく分けすぎない。呼び出し側がすべて同じ処理をするなら、`DatabaseConnectionError`・`DatabaseTimeoutError`・`DatabaseProtocolError` を Application に見せる必要はなく、`DatabaseError` で足りる。呼び出し側の動作が変わるなら分ける。

基準は「**その違いで呼び出し側の判断が変わるか**」。

---

## 21. 既存コードを先に調べる

新しく実装する前に、関連する既存コードを読む。同じ Module の UseCase、Repository の interface と実装、既存の Result の型と Server Action での文言の対応（例: `src/modules/board/application/create-board.ts`・`src/modules/board/presentation/actions.ts`）、Infrastructure のエラー（`src/shared/infrastructure/database-error.ts`）、`error.tsx`・`not-found.tsx`、検証処理、Server Action、テスト。

既存コードを読まずに新しいエラーのパターンを作らない。ただし既存コードが明らかにエラー情報を失っているなら、盲目的に真似せず、影響範囲を確かめたうえで直す。

---

## 22. コードを変えるときの手順

失敗の経路を足す・変えるときは、実装の前に確かめる。

1. 何が失敗しうるか
2. それぞれは「正常な不存在」「想定内のアプリケーション上の結果」「Infrastructure 障害」「想定外のプログラミングエラー」のどれか
3. その情報をどのレイヤーが必要とするか
4. 呼び出し側は失敗の理由で実際に処理を変えるか
5. `null`・Result・`throw` のどれが意味を最も正確に表すか
6. 低レイヤー固有の情報を上に漏らしていないか
7. 必要なエラー情報を途中で潰していないか
8. 画面やレスポンスに秘密の値を漏らしうるか

---

## 23. レビューで確かめること

- `null` が本当に正常な不存在だけを意味しているか
- Infrastructure 障害を `null` に変えていないか
- 想定内の業務上の失敗を例外で制御していないか
- 逆に、意味のない Infrastructure のエラーまで Result に足していないか
- `try/catch` に明確な役割があるか、例外を握りつぶしていないか
- 低レイヤーのエラー型が上まで漏れていないか
- HTTP ステータスや `notFound()` が Domain・Application・Repository に漏れていないか
- エラーの変換で重要な情報を失っていないか
- 生のエラーメッセージを画面やレスポンスに出していないか
- ログに秘密の値が含まれないか、同じエラーを複数のレイヤーでログに出していないか
- retry が本当に安全か
- 既存のパターンを再利用できないか、新しい抽象化が本当に必要か

---

## 24. 迷ったとき

「**この関数の呼び出し側は、結果を受け取ったあと何をするのか？**」を考える。

- 「何もなかった」と判断するだけ → `null`
- 理由によって正常な処理を分ける → Result（Discriminated Union）
- このレイヤーでは意味のある回復ができない → `throw`

どこで catch するかは「**そこで意味のあることができるか**」で決める。できない場所では catch しない。

---

## 25. 最も大事な原則

目的は、エラーを消すことでも、すべてのエラーを型にすることでもない。**失敗の意味を失わず、必要なレイヤーに適切な形で伝えること**である。

```text
正常な不存在                         → null
想定内のアプリケーション上の結果     → 型付きの Result
Infrastructure 障害・想定外の失敗    → throw
外部ライブラリ固有のエラー           → Infrastructure の境界で必要に応じて変換
画面・HTTP の応答                    → Presentation の境界で決める
```

この分類を機械的に当てはめるのではなく、常に「**呼び出し側が何を知る必要があるか**」を基準に判断する。
