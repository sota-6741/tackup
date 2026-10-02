import { expect, test } from "@playwright/test";
import { signIn } from "./support/sign-in";

test("ログインして掲示板を作ると、その掲示板ボードを表示する", async ({
  page,
  context,
}) => {
  await signIn(context);

  await page.goto("/");
  await expect(page).toHaveURL("/boards/new");

  await page.getByLabel("掲示板名").fill("中野のボード");
  await page.getByRole("button", { name: "作成する" }).click();

  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "中野のボード" }),
  ).toBeVisible();
});

test("ログインしていると、サインイン画面を開いても掲示板へ移動する", async ({
  page,
  context,
}) => {
  await signIn(context);

  await page.goto("/sign-in");

  await expect(page).toHaveURL("/boards/new");
});
