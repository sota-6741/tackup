import { expect, type Page, test } from "@playwright/test";
import { makePdfFile } from "../src/modules/post/testing/original-files";
import { signIn } from "./support/sign-in";

async function createBoard(page: Page): Promise<string> {
  await page.goto("/boards/new");
  await page.getByLabel("掲示板名").fill("中野のボード");
  await page.getByRole("button", { name: "作成する" }).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/);
  return page.url();
}

async function registerPost(
  page: Page,
  {
    boardUrl,
    title,
    publishFrom,
    expiresAt,
  }: {
    boardUrl: string;
    title: string;
    publishFrom: string;
    /** 無期限なら `null`。 */
    expiresAt: string | null;
  },
) {
  await page.goto(`${boardUrl}/posts/new`);
  const pdf = await makePdfFile({ width: 595, height: 842 });
  await page.getByLabel(/ファイル/).setInputFiles({
    name: `${title}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.arrayBuffer()),
  });
  await expect(page.getByAltText("サムネイル")).toBeVisible();
  await page.getByLabel(/掲示開始/).fill(publishFrom);
  if (expiresAt === null) {
    await page.getByRole("checkbox", { name: "無期限にする" }).click();
  } else {
    await page.getByLabel(/掲示終了/).fill(expiresAt);
  }
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(boardUrl);
}

test("台帳には、公開中でない掲示物も状態を付けて表示され、無期限の掲示物を撤去済みにできる", async ({
  page,
  context,
}) => {
  await signIn(context);
  const boardUrl = await createBoard(page);
  await registerPost(page, {
    boardUrl,
    title: "来年の夏祭り",
    publishFrom: "2099-07-01T00:00",
    expiresAt: "2099-08-01T00:00",
  });
  await registerPost(page, {
    boardUrl,
    title: "去年の夏祭り",
    publishFrom: "2025-07-01T00:00",
    expiresAt: "2025-08-01T00:00",
  });
  await registerPost(page, {
    boardUrl,
    title: "ゴミの出し方",
    publishFrom: "2026-01-01T00:00",
    expiresAt: null,
  });

  await page.getByRole("link", { name: "台帳" }).click();
  await expect(page).toHaveURL(`${boardUrl}/posts`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("台帳");
  const rows = page.getByRole("listitem").filter({ hasText: "掲示期間" });
  await expect(rows).toHaveCount(3);
  // 掲示開始の新しい順に並ぶ。
  await expect(rows.nth(0)).toContainText("来年の夏祭り");
  await expect(rows.nth(0)).toContainText("掲示開始前");
  await expect(rows.nth(1)).toContainText("ゴミの出し方");
  await expect(rows.nth(1)).toContainText("公開中");
  await expect(rows.nth(1)).toContainText("無期限");
  await expect(rows.nth(2)).toContainText("去年の夏祭り");
  await expect(rows.nth(2)).toContainText("期限切れ・撤去待ち");

  // 無期限の掲示物は撤去タスクに出ないので、台帳から撤去済みにする。
  await rows.nth(1).getByRole("button", { name: "撤去済みにする" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "撤去済みにする" }).click();
  await expect(dialog).toHaveCount(0);

  await expect(rows.nth(1)).toContainText("撤去済み");
  await expect(rows.nth(1)).toContainText("撤去:");
  await expect(
    rows.nth(1).getByRole("button", { name: "撤去済みにする" }),
  ).toHaveCount(0);
  await page.goto(boardUrl);
  await expect(page.getByText("まだ掲示物はありません")).toBeVisible();
});

test("メンバーでない人には、台帳を 404 にする", async ({
  page,
  context,
  browser,
}) => {
  await signIn(context);
  const boardUrl = await createBoard(page);

  const otherContext = await browser.newContext();
  await signIn(otherContext);
  const otherPage = await otherContext.newPage();
  const response = await otherPage.goto(`${boardUrl}/posts`);
  expect(response?.status()).toBe(404);
});
