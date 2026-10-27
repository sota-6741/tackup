import type { Logger, LogOptions } from "@/shared/domain/logger";

export type LogEntry = {
  level: keyof Logger;
  message: string;
  options?: LogOptions;
};

export function makeInMemoryLogger() {
  const entries: LogEntry[] = [];
  const logger: Logger = {
    info: (message, options) =>
      entries.push({ level: "info", message, options }),
    warn: (message, options) =>
      entries.push({ level: "warn", message, options }),
    error: (message, options) =>
      entries.push({ level: "error", message, options }),
  };
  return { logger, entries };
}
