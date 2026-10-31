import { expect, test } from "@playwright/test";

test("dealer demo presents clearly labeled sample orders", async ({ page }, testInfo) => {
  await page.goto("/dealer");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dealer overview");
  await expect(page.getByRole("note")).toContainText("Demo data · fictional sample account");
  await expect(page.getByRole("table", { name: "Recent sample orders" })).toBeVisible();
  await expect(page.getByRole("row", { name: /LB-2048/ })).toBeVisible();
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewportWidth);
  await expect(page).toHaveScreenshot(`dealer-${testInfo.project.name}.png`, {
    fullPage: true,
  });
});
