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

test("DRI Rwanda is a separate product with local photo and size prices", async ({ page }) => {
  await page.goto("/product/dri-coffee-specialty-arabica-rwanda");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "DRI Coffee – Specialty Arabica from Rwanda, Medium Roast"
  );
  const photo = page.getByRole("img", {
    name: "Three DRI roasted coffee bags in 1 kg, 500 g, and 250 g sizes on a bed of roasted beans.",
  });
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute("src", "/products/dri-rwanda-specialty-arabica.jpg");
  await expect(page.getByRole("radio", { name: /250 g/ })).toBeChecked();
  await expect(page.locator(".lb-product__price")).toHaveText(/€9\.49\s*\/\s*250 g/);
  await expect(page.getByRole("radio", { name: /€16\.96/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /€29\.96/ })).toBeVisible();
  await page.getByRole("radio", { name: /1 kg/ }).check();
  await expect(page.locator(".lb-product__price")).toHaveText(/€29\.96\s*\/\s*1 kg/);
  await expect(page.getByText("1,600–2,000 m").first()).toBeVisible();
  await expect(page.getByText("Fully washed").first()).toBeVisible();
  await expect(page.getByText(/filter, pour-over, and espresso/i)).toBeVisible();
  await expect(page.getByText("LOT 022")).toHaveCount(0);
  await expect(page.getByText(/certif|lab test|organic/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to cart")).toBeVisible();
});

test("unknown lot returns 404", async ({ page }) => {
  const response = await page.goto("/product/does-not-exist");
  expect(response?.status()).toBe(404);
});
