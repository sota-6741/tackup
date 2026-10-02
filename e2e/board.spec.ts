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

test("続きの位置がおかしい URL を開いても、エラーにせず最初のページを表示する", async ({
  page,
  context,
}) => {
  await signIn(context);
  await page.goto("/boards/new");
  await page.getByLabel("掲示板名").fill("中野のボード");
  await page.getByRole("button", { name: "作成する" }).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/);
  const boardUrl = page.url();
  const id = "3f2b8c1e-5a4d-4e6f-9a7b-0c1d2e3f4a5b";

  // 形が合わない値と、DB が日時として受け付けない遠い未来の値。
  for (const after of ["broken", `999999999999999_${id}`]) {
    const response = await page.goto(`${boardUrl}?after=${after}`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "中野のボード" }),
    ).toBeVisible();
  }

  // 形は正しいが、その先に掲示物がない位置。最初のページへ戻す。
  await page.goto(`${boardUrl}?after=1_${id}`);
  await expect(page).toHaveURL(boardUrl);
});
