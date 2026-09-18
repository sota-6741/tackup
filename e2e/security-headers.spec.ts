import { expect, test } from "@playwright/test";

test("レスポンスにセキュリティ用のヘッダーが付き、Next.js を使っていることは知らせない", async ({
  request,
}) => {
  const response = await request.get("/sign-in");
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toBe(
    "max-age=63072000; includeSubDomains",
  );
  expect(headers["permissions-policy"]).toBe(
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("CSP で、nonce の付いたスクリプトだけを動かし、違反なく画面を表示する", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) {
      violations.push(message.text());
    }
  });

  const response = await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");

  const policy = response?.headers()["content-security-policy"] ?? "";
  expect(policy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(policy).toContain("frame-ancestors 'none'");
  await expect(
    page.getByRole("button", { name: "Google でサインイン" }),
  ).toBeVisible();
  expect(violations).toEqual([]);
});
