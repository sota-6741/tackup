import { DrizzleQueryError } from "drizzle-orm/errors";
import { afterEach, expect, test, vi } from "vitest";
import { logAuthEvent } from "./auth-logger";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeQueryError() {
  const cause = Object.assign(new Error("connection refused"), {
    code: "ECONNREFUSED",
  });
  return new DrizzleQueryError(
    'select * from "session" where "token" = $1',
    ["session-token"],
    cause,
  );
}

test("DB のエラーは、SQL の値を除いた名前とメッセージとエラーコードだけを出す", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});

  logAuthEvent("error", "INTERNAL_SERVER_ERROR", makeQueryError());

  expect(spy).toHaveBeenCalledWith(
    "[Better Auth] INTERNAL_SERVER_ERROR",
    'DatabaseError: Failed query: select * from "session" where "token" = $1 (code: ECONNREFUSED)',
  );
});

test("メッセージに含まれる SQL の値も取り除く", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});

  logAuthEvent("error", makeQueryError().message);

  expect(spy).toHaveBeenCalledWith(
    '[Better Auth] Failed query: select * from "session" where "token" = $1',
  );
});

test("エラーと文字列以外の値は出さない", () => {
  const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

  logAuthEvent("warn", "State not found", { state: "oauth-state" });

  expect(spy).toHaveBeenCalledWith("[Better Auth] State not found");
});

test("エラーが持つほかのプロパティは出さない", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  const error = Object.assign(new Error("State invalid"), {
    details: { state: "oauth-state" },
  });

  logAuthEvent("error", "Failed to parse state", error);

  expect(spy).toHaveBeenCalledWith(
    "[Better Auth] Failed to parse state",
    "Error: State invalid",
  );
});
