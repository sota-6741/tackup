import { expect, test } from "@playwright/test";

test("未ログインのとき、トップページからサインイン画面へ移動できる", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("tackup");
  await page.getByRole("link", { name: "サインイン" }).click();
  await expect(page).toHaveURL("/sign-in");
});

test("未ログインで /boards を開くと、サインイン画面へリダイレクトされる", async ({
  page,
}) => {
  await page.goto("/boards");

  await expect(page).toHaveURL("/sign-in");
});
