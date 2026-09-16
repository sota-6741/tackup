import { expect, test } from "@playwright/test";

test("未ログインでトップを開くと、サインイン画面へリダイレクトされる", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL("/sign-in");
});

test("未ログインで /boards を開くと、サインイン画面へリダイレクトされる", async ({
  page,
}) => {
  await page.goto("/boards");

  await expect(page).toHaveURL("/sign-in");
});
