import { type Browser, expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { inviteToken } from "../src/modules/board/infrastructure/schema";
import { makePdfFile } from "../src/modules/post/testing/original-files";
import { e2eDb } from "./support/db";
import { signIn } from "./support/sign-in";

async function createBoard(
  page: Page,
  { name, isPublic }: { name: string; isPublic: boolean },
): Promise<string> {
  await page.goto("/boards/new");
  await page.getByLabel("掲示板名").fill(name);
  if (isPublic) await page.getByRole("radio", { name: /^公開/ }).click();
  await page.getByRole("button", { name: "作成する" }).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/);
  return page.url();
}

async function registerPost(page: Page, title: string) {
  await page.getByRole("link", { name: "掲示物を登録" }).click();
  const pdf = await makePdfFile({ width: 595, height: 842 });
  await page.getByLabel(/ファイル/).setInputFiles({
    name: `${title}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.arrayBuffer()),
  });
  await expect(page.getByAltText("サムネイル")).toBeVisible();
  await page.getByRole("checkbox", { name: "無期限にする" }).click();
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByText(title)).toBeVisible();
}

/** ログインしていない、別のブラウザとして開く。 */
async function openAsVisitor(browser: Browser, url: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const response = await page.goto(url);
  return { page, status: response?.status() };
}

test("公開掲示板の招待リンクを、ログインしていない人が開くと、公開中の掲示物が見える", async ({
  page,
  context,
  browser,
}) => {
  await signIn(context);
  await createBoard(page, { name: "中野のボード", isPublic: true });
  await registerPost(page, "夏祭りのお知らせ");
  const inviteUrl = await page
    .getByLabel("招待リンク", { exact: true })
    .inputValue();

  const visitor = await openAsVisitor(browser, inviteUrl);

  expect(visitor.status).toBe(200);
  await expect(visitor.page).toHaveURL(inviteUrl);
  await expect(
    visitor.page.getByRole("heading", { level: 1, name: "中野のボード" }),
  ).toBeVisible();
  await expect(visitor.page.getByText("夏祭りのお知らせ")).toBeVisible();
  const thumbnail = visitor.page.locator("figure img");
  await expect
    .poll(() =>
      thumbnail.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth,
      ),
    )
    .toBe(565);
  // 管理用の導線は出さない。検索エンジンにも載せない。
  await expect(
    visitor.page.getByRole("link", { name: "掲示物を登録" }),
  ).toHaveCount(0);
  await expect(
    visitor.page.getByLabel("招待リンク", { exact: true }),
  ).toHaveCount(0);
  await expect(visitor.page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("非公開の掲示板の招待リンクは、存在しないリンクと同じ 404 になる", async ({
  page,
  context,
  browser,
}) => {
  await signIn(context);
  const boardUrl = await createBoard(page, {
    name: "非公開のボード",
    isPublic: false,
  });
  const boardId = boardUrl.split("/").at(-1) ?? "";
  const [{ token }] = await e2eDb
    .select()
    .from(inviteToken)
    .where(eq(inviteToken.boardId, boardId));

  const privateBoard = await openAsVisitor(browser, `/b/${token}`);
  const unknown = await openAsVisitor(browser, "/b/no-such-token");

  for (const visitor of [privateBoard, unknown]) {
    expect(visitor.status).toBe(404);
    await expect(
      visitor.page.getByRole("heading", { name: "ページが見つかりません" }),
    ).toBeVisible();
    await expect(visitor.page.getByText("非公開のボード")).toHaveCount(0);
  }
});

test("招待リンクを再発行すると、以前のリンクでは開けず、新しいリンクで開ける", async ({
  page,
  context,
  browser,
}) => {
  await signIn(context);
  await createBoard(page, { name: "中野のボード", isPublic: true });
  const oldUrl = await page
    .getByLabel("招待リンク", { exact: true })
    .inputValue();

  await page.getByRole("button", { name: "再発行" }).click();
  await page.getByRole("button", { name: "再発行する" }).click();
  await expect(page.getByLabel("招待リンク", { exact: true })).not.toHaveValue(
    oldUrl,
  );
  const newUrl = await page
    .getByLabel("招待リンク", { exact: true })
    .inputValue();

  expect((await openAsVisitor(browser, oldUrl)).status).toBe(404);
  const visitor = await openAsVisitor(browser, newUrl);
  expect(visitor.status).toBe(200);
  await expect(
    visitor.page.getByRole("heading", { level: 1, name: "中野のボード" }),
  ).toBeVisible();
});
