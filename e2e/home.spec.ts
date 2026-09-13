import { expect, test } from "@playwright/test";

test("home page links to sign-in when signed out", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("tackup");
  await page.getByRole("link", { name: "サインイン" }).click();
  await expect(page).toHaveURL("/sign-in");
});

test("dashboard redirects to sign-in when signed out", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL("/sign-in");
});
