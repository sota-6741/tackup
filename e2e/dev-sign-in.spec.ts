import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// CI は DEV_SIGN_IN=true を渡したうえで、本番ビルド（next build → next start）に対して動かす。
// ローカルでは next dev に対して動かすので、開発用のサインインが有効でも正しい。
test.skip(!process.env.CI, "本番ビルドに対してだけ確かめる");

type ServerReferenceManifest = {
  node: Record<string, { exportedName: string }>;
};

function devSignInActionId(): string {
  const manifest: ServerReferenceManifest = JSON.parse(
    readFileSync(".next/server/server-reference-manifest.json", "utf8"),
  );
  const entry = Object.entries(manifest.node).find(
    ([, action]) => action.exportedName === "devSignInAction",
  );
  if (!entry) throw new Error("devSignInAction がビルドに見つからない");
  return entry[0];
}

test("本番ビルドでは、DEV_SIGN_IN を立てても開発用のサインインのボタンを表示しない", async ({
  page,
}) => {
  await page.goto("/sign-in");

  await expect(
    page.getByRole("button", { name: "Google でサインイン" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "開発用ユーザーでサインイン" }),
  ).toHaveCount(0);
});

test("本番ビルドでは、開発用のサインインの Server Action を直接呼んでもセッションを作らない", async ({
  request,
  baseURL,
}) => {
  const response = await request.post("/sign-in", {
    headers: {
      "Next-Action": devSignInActionId(),
      "Content-Type": "text/plain;charset=UTF-8",
      Origin: baseURL ?? "",
    },
    data: "[]",
  });

  expect(response.status()).toBe(404);
  expect(response.headers()["set-cookie"]).toBeUndefined();
});
