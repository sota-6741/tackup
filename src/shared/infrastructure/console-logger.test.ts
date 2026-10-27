import { expect, test } from "vitest";
import { makeConsoleLogger } from "./console-logger";

function setup() {
  const lines: { severity: string; entry: unknown }[] = [];
  const logger = makeConsoleLogger({
    write: (severity, line) =>
      lines.push({ severity, entry: JSON.parse(line) }),
  });
  return { logger, lines };
}

test("1 行の JSON に、Cloud Logging の severity と message と添えた値を出す", () => {
  const { logger, lines } = setup();

  logger.info("差し替えました", {
    fields: { operation: "replaceOriginal", keys: ["a", "b"] },
  });
  logger.warn("遅い");

  expect(lines).toEqual([
    {
      severity: "INFO",
      entry: {
        severity: "INFO",
        message: "差し替えました",
        operation: "replaceOriginal",
        keys: ["a", "b"],
      },
    },
    { severity: "WARNING", entry: { severity: "WARNING", message: "遅い" } },
  ]);
});

test("エラーは名前・メッセージ・コードだけにし、スタックやほかのプロパティは出さない", () => {
  const { logger, lines } = setup();
  const error = Object.assign(new Error("storage down"), {
    code: 503,
    token: "secret",
  });

  logger.error("消せませんでした", { error });

  expect(lines[0]).toEqual({
    severity: "ERROR",
    entry: {
      severity: "ERROR",
      message: "消せませんでした",
      error: { name: "Error", message: "storage down", code: "503" },
    },
  });
});

test("エラーでない値を投げられても、文字列にして出す", () => {
  const { logger, lines } = setup();

  logger.error("失敗", { error: "boom" });

  expect(lines[0].entry).toMatchObject({
    error: { name: "NonError", message: "boom" },
  });
});

test("添えた値に severity や message があっても、上書きさせない", () => {
  const { logger, lines } = setup();

  logger.info("本当のメッセージ", {
    fields: { message: "偽物", severity: "ERROR" },
  });

  expect(lines[0]).toEqual({
    severity: "INFO",
    entry: { severity: "INFO", message: "本当のメッセージ" },
  });
});
