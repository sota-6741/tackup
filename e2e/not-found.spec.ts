import { expect, test } from "@playwright/test";

test("未ログインで存在しない URL を開くと、404 の画面にトップへのリンクを表示する", async ({
  page,
}) => {
  const response = await page.goto("/no-such-page");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "ページが見つかりません" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "トップへ" })).toHaveAttribute(
    "href",
    "/",
  );
});
