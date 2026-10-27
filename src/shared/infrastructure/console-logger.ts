import type { Logger, LogOptions } from "@/shared/domain/logger";
import { stripQueryParams, toSafeError } from "./database-error";

type Severity = "INFO" | "WARNING" | "ERROR";

/**
 * 1 行の JSON で標準出力・標準エラーに出す。Cloud Run では `severity` と `message` を含む JSON が、そのまま Cloud Logging の構造化ログになる。
 * エラーは名前・メッセージ・コードだけにし、スタックやほかのプロパティは出さない。
 */
export function makeConsoleLogger({
  write = (severity, line) =>
    severity === "INFO" ? console.log(line) : console.error(line),
}: {
  write?: (severity: Severity, line: string) => void;
} = {}): Logger {
  function log(
    severity: Severity,
    message: string,
    { fields, error }: LogOptions = {},
  ) {
    // 添える値に同じ名前があっても、severity・message・error を上書きさせない。
    const entry = {
      ...fields,
      severity,
      message,
      ...(error === undefined ? {} : { error: describeError(error) }),
    };
    write(severity, JSON.stringify(entry));
  }

  return {
    info: (message, fields) => log("INFO", message, fields),
    warn: (message, fields) => log("WARNING", message, fields),
    error: (message, fields) => log("ERROR", message, fields),
  };
}

function describeError(value: unknown): {
  name: string;
  message: string;
  code?: string;
} {
  const error = toSafeError(value);
  if (!(error instanceof Error)) {
    return { name: "NonError", message: stripQueryParams(String(error)) };
  }
  const code =
    "code" in error && error.code !== undefined
      ? { code: String(error.code) }
      : {};
  return {
    name: error.name,
    message: stripQueryParams(error.message),
    ...code,
  };
}
