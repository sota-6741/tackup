/** `name` は数える対象を分ける。同じ利用者でも、規則が違えば別々に数える。 */
export type RateLimitRule = {
  name: string;
  limit: number;
  windowSeconds: number;
};

/** アップロード URL の発行。1 本ごとに署名のための通信が起きるので、ほかの操作より絞る。 */
export const UPLOAD_URL_RATE_LIMIT: RateLimitRule = {
  name: "upload-url",
  limit: 100,
  windowSeconds: 60 * 60,
};

/** そのほかの書き込みの操作（Server Action）。 */
export const WRITE_RATE_LIMIT: RateLimitRule = {
  name: "write",
  limit: 60,
  windowSeconds: 60,
};

export interface RateLimiter {
  /** `subject`（利用者など）の回数を 1 つ数える。数えた結果が上限の中なら `true`、超えたら `false`。複数のインスタンスで共有される記録で数える。 */
  consume(input: { rule: RateLimitRule; subject: string }): Promise<boolean>;
}

export type RateLimited = { ok: false; reason: "rate_limited" };

/** use case を、利用者ごとの回数の制限で包む。上限を超えたら、use case を呼ばずに `rate_limited` を返す。引数の名前を `useCase` にすると、lint が React のフックと見なすので避ける。 */
export function withRateLimit<TInput extends { userId: string }, TResult>(
  execute: (input: TInput) => Promise<TResult>,
  { rateLimiter, rule }: { rateLimiter: RateLimiter; rule: RateLimitRule },
): (input: TInput) => Promise<TResult | RateLimited> {
  return async (input) => {
    const allowed = await rateLimiter.consume({ rule, subject: input.userId });
    if (!allowed) return { ok: false, reason: "rate_limited" };
    return execute(input);
  };
}
