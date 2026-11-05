import { expect, test } from "@playwright/test";

test("product template exposes provenance and purchase action", async ({ page }, testInfo) => {
  await page.goto("/product/virunga-washed");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Virunga Washed");
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible();
  await expect(page.getByText("1,900 m").first()).toBeVisible();
  await expect(page.getByText("12.4 g in · 36 g out · 28 s")).toBeVisible();
  await expect(page).toHaveScreenshot(`product-${testInfo.project.name}.png`, {
    fullPage: true,
  });
});

test("unknown lot returns 404", async ({ page }) => {
  const response = await page.goto("/product/does-not-exist");
  expect(response?.status()).toBe(404);
});
