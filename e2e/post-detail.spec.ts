import { type Browser, expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { post } from "../src/modules/post/infrastructure/schema";
import { makePdfFile } from "../src/modules/post/testing/original-files";
import { e2eDb } from "./support/db";
import { signIn } from "./support/sign-in";

async function createBoardWithPost(
  page: Page,
  { isPublic }: { isPublic: boolean },
): Promise<{ boardUrl: string }> {
  await page.goto("/boards/new");
  await page.getByLabel("掲示板名").fill("中野のボード");
  if (isPublic) await page.getByRole("radio", { name: /^公開/ }).click();
  await page.getByRole("button", { name: "作成する" }).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/);
  const boardUrl = page.url();

  await page.getByRole("link", { name: "掲示物を登録" }).click();
  const pdf = await makePdfFile({ width: 595, height: 842 });
  await page.getByLabel(/ファイル/).setInputFiles({
    name: "夏祭りのお知らせ.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.arrayBuffer()),
  });
  await expect(page.getByAltText("サムネイル")).toBeVisible();
  await page.getByRole("checkbox", { name: "無期限にする" }).click();
  await page.getByLabel("説明文").fill("雨天中止です。");
  await page.getByLabel("外部リンク").fill("https://example.com/festival");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(boardUrl);
  return { boardUrl };
}

/** ログインしていない、別のブラウザとして開く。 */
async function openAsVisitor(browser: Browser, url: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const response = await page.goto(url);
  return { page, context, status: response?.status() };
}

test("掲示板ボードのタイルから掲示物詳細を開け、内容と操作が表示される", async ({
  page,
  context,
}) => {
  await signIn(context);
  const { boardUrl } = await createBoardWithPost(page, { isPublic: true });

  await page.getByRole("link", { name: "夏祭りのお知らせ" }).click();

  await expect(page).toHaveURL(/\/posts\/[A-Za-z0-9_-]+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "夏祭りのお知らせ" }),
  ).toBeVisible();
  await expect(page.getByText("無期限")).toBeVisible();
  await expect(page.getByText("雨天中止です。")).toBeVisible();
  const externalLink = page.getByRole("link", {
    name: "https://example.com/festival",
  });
  await expect(externalLink).toHaveAttribute("target", "_blank");
  await expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByRole("link", { name: "PDF を開く" })).toBeVisible();
  await expect(page.getByRole("button", { name: "共有する" })).toBeVisible();
  const image = page.getByRole("img", { name: "夏祭りのお知らせ" });
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) => element.complete && element.naturalWidth,
      ),
    )
    .toBe(565);

  // メンバーには、掲示板へ戻る導線が出る。
  await page.getByRole("link", { name: "掲示板へ戻る" }).click();
  await expect(page).toHaveURL(boardUrl);
});

test("公開掲示板の掲示物詳細は、ログインしていない人も開け、原本を保存できる", async ({
  page,
  context,
  browser,
}) => {
  await signIn(context);
  await createBoardWithPost(page, { isPublic: true });
  await page.getByRole("link", { name: "夏祭りのお知らせ" }).click();
  await expect(page).toHaveURL(/\/posts\//);
  const postUrl = page.url();

  const visitor = await openAsVisitor(browser, postUrl);

  expect(visitor.status).toBe(200);
  await expect(visitor.page).toHaveURL(postUrl);
  await expect(
    visitor.page.getByRole("heading", { level: 1, name: "夏祭りのお知らせ" }),
  ).toBeVisible();
  await expect(
    visitor.page.getByRole("link", { name: "掲示板へ戻る" }),
  ).toHaveCount(0);

  // 保存の導線は、その場で発行した署名付きの URL へ移動させる。
  const response = await visitor.context.request.get(
    `${postUrl}/original?download=1`,
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(302);
  const location = new URL(response.headers().location);
  expect(location.pathname).toMatch(/\/posts\/[0-9a-f-]{36}\/original$/);
  expect(location.searchParams.get("response-content-disposition")).toContain(
    "attachment",
  );
  const file = await visitor.context.request.get(location.toString());
  expect(file.status()).toBe(200);
  expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("非公開の掲示板の掲示物詳細は、ログインを求め、ログイン後に元のページへ戻る。メンバーでなければ 404 になる", async ({
  page,
  context,
  browser,
}) => {
  await signIn(context);
  await createBoardWithPost(page, { isPublic: false });
  await page.getByRole("link", { name: "夏祭りのお知らせ" }).click();
  await expect(page).toHaveURL(/\/posts\//);
  const postUrl = page.url();
  const postPath = new URL(postUrl).pathname;

  // ログインしていない人は、戻り先を付けてサインイン画面へ移動する。
  const visitor = await openAsVisitor(browser, postUrl);
  await expect(visitor.page).toHaveURL(
    `/sign-in?next=${encodeURIComponent(postPath)}`,
  );
  const original = await visitor.context.request.get(`${postUrl}/original`, {
    maxRedirects: 0,
  });
  expect(original.status()).toBe(307);
  expect(original.headers().location).toContain("/sign-in?next=");

  // メンバーでない人がログインしてから戻ると、存在しない掲示物と同じ 404 になる。
  await signIn(visitor.context);
  const response = await visitor.page.goto(
    `/sign-in?next=${encodeURIComponent(postPath)}`,
  );
  await expect(visitor.page).toHaveURL(postUrl);
  expect(response?.status()).toBe(404);
  await expect(visitor.page.getByText("夏祭りのお知らせ")).toHaveCount(0);
});

test("サインイン画面の戻り先に別のサイトを渡しても、そこへは移動しない", async ({
  page,
  context,
}) => {
  await signIn(context);

  await page.goto(`/sign-in?next=${encodeURIComponent("//example.com/")}`);

  await expect(page).toHaveURL("/boards/new");
});

test("公開中でない掲示物の詳細は、メンバーには状態を付けて見せ、それ以外の人には 404 にする", async ({
  page,
  context,
  browser,
}) => {
  await signIn(context);
  await createBoardWithPost(page, { isPublic: true });
  await page.getByRole("link", { name: "夏祭りのお知らせ" }).click();
  await expect(page).toHaveURL(/\/posts\//);
  const postUrl = page.url();
  const publicId = postUrl.split("/").at(-1) ?? "";
  await e2eDb
    .update(post)
    .set({
      publishFrom: new Date("2020-01-01T00:00:00Z"),
      expiresAt: new Date("2020-02-01T00:00:00Z"),
    })
    .where(eq(post.publicId, publicId));

  await page.reload();
  await expect(page.getByText("掲示期間は終了しています")).toBeVisible();

  const visitor = await openAsVisitor(browser, postUrl);
  expect(visitor.status).toBe(404);
  const original = await visitor.context.request.get(`${postUrl}/original`);
  expect(original.status()).toBe(404);
});
