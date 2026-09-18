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
