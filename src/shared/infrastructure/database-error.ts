import { DrizzleQueryError } from "drizzle-orm/errors";

/** SQL の値と Postgres のエラー本文を持たない DB エラー。値にはトークンなどが入りうるので、ログに出してよい SQL 文とエラーコードだけを持つ。 */
export class DatabaseError extends Error {
  readonly code: string | undefined;

  constructor(query: string, code: string | undefined) {
    super(`Failed query: ${query}`);
    this.name = "DatabaseError";
    this.code = code;
  }
}

export function toSafeError(error: unknown): unknown {
  if (!(error instanceof DrizzleQueryError)) return error;
  return new DatabaseError(error.query, getErrorCode(error.cause));
}

/** Drizzle のエラーメッセージ（`Failed query: ...\nparams: ...`）から、値が並ぶ `params:` 以降を取り除く。 */
export function stripQueryParams(message: string): string {
  return message.split("\nparams:")[0];
}

/** リポジトリの各メソッドが投げる Drizzle のエラーを DatabaseError に置き換える。 */
export function withSafeDatabaseErrors<T extends object>(repository: T): T {
  const methods = Object.entries(repository).map(([name, method]) => [
    name,
    async (...args: unknown[]) => {
      try {
        return await method(...args);
      } catch (error) {
        throw toSafeError(error);
      }
    },
  ]);
  return Object.fromEntries(methods) as T;
}

function getErrorCode(cause: unknown): string | undefined {
  if (typeof cause !== "object" || cause === null) return undefined;
  if (!("code" in cause) || typeof cause.code !== "string") return undefined;
  return cause.code;
}
