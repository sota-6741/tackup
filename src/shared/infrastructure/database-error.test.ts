import { DrizzleQueryError } from "drizzle-orm/errors";
import { expect, test } from "vitest";
import {
  DatabaseError,
  stripQueryParams,
  toSafeError,
  withSafeDatabaseErrors,
} from "./database-error";

function makeQueryError() {
  const cause = Object.assign(new Error("Key (token)=(secret-token) exists"), {
    code: "23505",
  });
  return new DrizzleQueryError(
    'insert into "invite_token" ("token") values ($1)',
    ["secret-token"],
    cause,
  );
}

test("Drizzle のエラーを、SQL 文とエラーコードだけを持つエラーに変える", () => {
  const error = toSafeError(makeQueryError());

  expect(error).toBeInstanceOf(DatabaseError);
  expect(error).toMatchObject({
    message: 'Failed query: insert into "invite_token" ("token") values ($1)',
    code: "23505",
  });
});

test("変えたエラーは、SQL の値も Postgres のエラー本文も持たない", () => {
  const error = toSafeError(makeQueryError());

  expect(JSON.stringify(error)).not.toContain("secret-token");
  expect((error as Error).message).not.toContain("secret-token");
  expect((error as Error).cause).toBeUndefined();
});

test("Drizzle 以外のエラーはそのまま返す", () => {
  const error = new Error("接続できません");

  expect(toSafeError(error)).toBe(error);
});

test("Drizzle のエラーメッセージから params 以降を取り除く", () => {
  const message = makeQueryError().message;

  expect(message).toContain("secret-token");
  expect(stripQueryParams(message)).toBe(
    'Failed query: insert into "invite_token" ("token") values ($1)',
  );
});

test("params を含まないメッセージはそのまま返す", () => {
  expect(stripQueryParams("State not found")).toBe("State not found");
});

test("包んだメソッドは、引数と戻り値をそのまま受け渡す", async () => {
  const repository = withSafeDatabaseErrors({
    add: async (a: number, b: number) => a + b,
  });

  expect(await repository.add(1, 2)).toBe(3);
});

test("包んだメソッドが投げた Drizzle のエラーは DatabaseError に変わる", async () => {
  const repository = withSafeDatabaseErrors({
    add: async () => {
      throw makeQueryError();
    },
  });

  await expect(repository.add()).rejects.toBeInstanceOf(DatabaseError);
});
