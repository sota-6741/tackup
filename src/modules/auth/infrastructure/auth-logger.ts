import {
  stripQueryParams,
  toSafeError,
} from "@/shared/infrastructure/database-error";

type LogLevel = "debug" | "info" | "warn" | "error";

/** better-auth のログを、トークンなどの値を取り除いてから出力する。エラーは名前とメッセージ（とエラーコード）だけにし、スタックやほかのプロパティは出さない。文字列とエラー以外の値は出さない。 */
export function logAuthEvent(
  level: LogLevel,
  message: string,
  ...args: unknown[]
): void {
  const details = args.flatMap(describe);
  console[level](`[Better Auth] ${stripQueryParams(message)}`, ...details);
}

function describe(value: unknown): string[] {
  if (typeof value === "string") return [stripQueryParams(value)];
  if (!(value instanceof Error)) return [];
  const error = toSafeError(value) as Error;
  const code = "code" in error && error.code ? ` (code: ${error.code})` : "";
  return [`${error.name}: ${stripQueryParams(error.message)}${code}`];
}
