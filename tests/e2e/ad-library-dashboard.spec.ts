import { expect, test } from "@playwright/test";

test("dealer ad library dashboard is readable on desktop and mobile", async ({ page }, testInfo) => {
  await page.setViewportSize(testInfo.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  await page.goto("/dealer/ad-library");
  await expect(page.getByRole("heading", { name: "Public ad library sources" })).toBeVisible();
  await expect(page.getByText("No sources added yet")).toBeVisible();
  await expect(page.getByText("Disconnected", { exact: true })).toBeVisible();
  await expect(page.locator("body")).toHaveScreenshot(`ad-library-dashboard-${testInfo.project.name}.png`, { fullPage: true });
});
