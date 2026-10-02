import { expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { post } from "../src/modules/post/infrastructure/schema";
import { makePdfFile } from "../src/modules/post/testing/original-files";
import { e2eDb } from "./support/db";
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
    expiresAt: string;
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
  await page.getByLabel(/掲示終了/).fill(expiresAt);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(boardUrl);
}

test("掲示終了を過ぎた掲示物は、掲示板ボードから消え、撤去タスクに古い順で表示される", async ({
  page,
  context,
}) => {
  await signIn(context);
  const boardUrl = await createBoard(page);
  await registerPost(page, {
    boardUrl,
    title: "先月の清掃の案内",
    publishFrom: "2026-01-01T00:00",
    expiresAt: "2026-02-01T00:00",
  });
  await registerPost(page, {
    boardUrl,
    title: "去年の夏祭り",
    publishFrom: "2025-07-01T00:00",
    expiresAt: "2025-08-01T00:00",
  });
  await registerPost(page, {
    boardUrl,
    title: "掲示中のお知らせ",
    publishFrom: "2026-01-01T00:00",
    expiresAt: "2099-12-31T23:59",
  });

  // 掲示板ボードには、公開中のものだけが出る。
  await expect(
    page.getByRole("link", { name: "掲示中のお知らせ" }),
  ).toBeVisible();
  await expect(page.getByText("去年の夏祭り")).toHaveCount(0);

  await page.getByRole("link", { name: "撤去タスク" }).click();
  await expect(page).toHaveURL(`${boardUrl}/removals`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "撤去タスク",
  );
  const tasks = page.getByRole("listitem").filter({ hasText: "超過" });
  await expect(tasks).toHaveCount(2);
  await expect(tasks.nth(0)).toContainText("去年の夏祭り");
  await expect(tasks.nth(1)).toContainText("先月の清掃の案内");
  await expect(tasks.nth(0)).toContainText(/\d+日超過/);
  await expect(page.getByText("掲示中のお知らせ")).toHaveCount(0);

  // タイトルから、掲示物詳細を開ける。メンバーには、期限切れの状態が出る。
  await tasks.nth(0).getByRole("link", { name: "去年の夏祭り" }).click();
  await expect(page).toHaveURL(/\/posts\//);
  await expect(page.getByText("掲示期間は終了しています")).toBeVisible();
});

test("撤去が必要な掲示物がなければ、ないことを表示する。メンバーでない人には 404 にする", async ({
  page,
  context,
  browser,
}) => {
  await signIn(context);
  const boardUrl = await createBoard(page);

  await page.goto(`${boardUrl}/removals`);
  await expect(page.getByText("撤去が必要な掲示物はありません")).toBeVisible();

  const otherContext = await browser.newContext();
  await signIn(otherContext);
  const otherPage = await otherContext.newPage();
  const response = await otherPage.goto(`${boardUrl}/removals`);
  expect(response?.status()).toBe(404);
});

test("撤去済みにすると、確認のあとに記録され、撤去タスクから消える", async ({
  page,
  context,
}) => {
  await signIn(context);
  const boardUrl = await createBoard(page);
  await registerPost(page, {
    boardUrl,
    title: "去年の夏祭り",
    publishFrom: "2025-07-01T00:00",
    expiresAt: "2025-08-01T00:00",
  });
  await registerPost(page, {
    boardUrl,
    title: "先月の清掃の案内",
    publishFrom: "2026-01-01T00:00",
    expiresAt: "2026-02-01T00:00",
  });
  await page.goto(`${boardUrl}/removals`);
  const task = page.getByRole("listitem").filter({ hasText: "去年の夏祭り" });
  // ほかのテストが同じタイトルの掲示物を作るので、公開の ID で見分ける。
  const href = await task.getByRole("link").getAttribute("href");
  const publicId = href?.split("/").at(-1) ?? "";

  // キャンセルしたときは、何も変わらない。
  await task.getByRole("button", { name: "撤去済みにする" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("「去年の夏祭り」を撤去済みにしますか？");
  await dialog.getByRole("button", { name: "キャンセル" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(task).toBeVisible();

  await task.getByRole("button", { name: "撤去済みにする" }).click();
  await dialog.getByRole("button", { name: "撤去済みにする" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(task).toHaveCount(0);
  await expect(page.getByText("先月の清掃の案内")).toBeVisible();
  const [removed] = await e2eDb
    .select()
    .from(post)
    .where(eq(post.publicId, publicId));
  expect(removed.status).toBe("removed");
  expect(removed.removedAt).toBeInstanceOf(Date);
  expect(removed.removedBy).not.toBeNull();

  // 読み込み直しても戻らない。掲示物詳細には、撤去済みの状態が出る。
  await page.reload();
  await expect(page.getByText("去年の夏祭り")).toHaveCount(0);
  await page.goto(`/posts/${publicId}`);
  await expect(page.getByText("撤去済み")).toBeVisible();
});
