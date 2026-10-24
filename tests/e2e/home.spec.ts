import { expect, test } from "@playwright/test";

test("home renders the brand hero and product grid", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Coffee");
  await expect(page.getByRole("link", { name: "Shop the bean" }).first()).toBeVisible();
  await expect(page.locator("article")).toHaveCount(3);
  await expect(page).toHaveScreenshot(`home-${testInfo.project.name}.png`, {
    fullPage: true,
  });
});
