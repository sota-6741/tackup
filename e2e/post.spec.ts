import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { post } from "../src/modules/post/infrastructure/schema";
import { makePdfFile } from "../src/modules/post/testing/original-files";
import { e2eDb } from "./support/db";
import { signIn } from "./support/sign-in";

test("ファイルを選んで掲示物を登録すると、掲示板ボードへ戻る", async ({
  page,
  context,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) {
      violations.push(message.text());
    }
  });
  await signIn(context);
  await page.goto("/boards/new");
  await page.getByLabel("掲示板名").fill("中野のボード");
  await page.getByRole("button", { name: "作成する" }).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/);
  const boardUrl = page.url();

  await page.getByRole("link", { name: "掲示物を登録" }).click();
  await expect(page).toHaveURL(`${boardUrl}/posts/new`);

  const pdf = await makePdfFile({ width: 595, height: 842 });
  await page.getByLabel(/ファイル/).setInputFiles({
    name: "夏祭りのお知らせ.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.arrayBuffer()),
  });
  await expect(page.getByAltText("サムネイル")).toBeVisible();
  await expect(page.getByLabel(/タイトル/)).toHaveValue("夏祭りのお知らせ");

  await page.getByLabel(/掲示終了/).fill("2099-12-31T23:59");
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(page).toHaveURL(boardUrl);
  expect(violations).toEqual([]);

  // 掲示物の表示はまだないので、登録されたことは DB で確かめる。
  const boardId = boardUrl.split("/").at(-1) ?? "";
  const posts = await e2eDb
    .select()
    .from(post)
    .where(eq(post.boardId, boardId));
  expect(posts).toEqual([
    expect.objectContaining({
      title: "夏祭りのお知らせ",
      status: "published",
      originalContentType: "application/pdf",
      originalKey: `boards/${boardId}/posts/${posts[0]?.id}/original`,
      thumbnailKey: `boards/${boardId}/posts/${posts[0]?.id}/thumbnail`,
      thumbnailWidth: 565,
      thumbnailHeight: 800,
    }),
  ]);
});

test("掲示終了が掲示開始より前だと、理由を表示して登録しない", async ({
  page,
  context,
}) => {
  await signIn(context);
  await page.goto("/boards/new");
  await page.getByLabel("掲示板名").fill("中野のボード");
  await page.getByRole("button", { name: "作成する" }).click();
  await page.getByRole("link", { name: "掲示物を登録" }).click();

  const pdf = await makePdfFile({ width: 595, height: 842 });
  await page.getByLabel(/ファイル/).setInputFiles({
    name: "夏祭りのお知らせ.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.arrayBuffer()),
  });
  await expect(page.getByAltText("サムネイル")).toBeVisible();
  await page.getByLabel(/掲示終了/).fill("2000-01-01T00:00");
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(
    page.getByText("掲示終了は、掲示開始より後の日時にしてください。"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/posts\/new$/);

  const boardId = page.url().split("/").at(-3) ?? "";
  const posts = await e2eDb
    .select()
    .from(post)
    .where(eq(post.boardId, boardId));
  expect(posts).toEqual([]);
});

test("無期限にすると、掲示終了を入れずに登録できる", async ({
  page,
  context,
}) => {
  await signIn(context);
  await page.goto("/boards/new");
  await page.getByLabel("掲示板名").fill("中野のボード");
  await page.getByRole("button", { name: "作成する" }).click();
  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/);
  const boardUrl = page.url();
  await page.getByRole("link", { name: "掲示物を登録" }).click();

  const pdf = await makePdfFile({ width: 595, height: 842 });
  await page.getByLabel(/ファイル/).setInputFiles({
    name: "常設の案内.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.arrayBuffer()),
  });
  await expect(page.getByAltText("サムネイル")).toBeVisible();
  await page.getByRole("checkbox", { name: "無期限にする" }).click();
  await expect(page.getByLabel(/掲示終了/)).toBeDisabled();
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(page).toHaveURL(boardUrl);
  const boardId = boardUrl.split("/").at(-1) ?? "";
  const posts = await e2eDb
    .select()
    .from(post)
    .where(eq(post.boardId, boardId));
  expect(posts).toEqual([
    expect.objectContaining({ title: "常設の案内", expiresAt: null }),
  ]);
});
