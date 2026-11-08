import { expect, test } from "@playwright/test";

test("home renders the brand hero, Lava Bean lots, and separate DRI product", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Coffee");
  await expect(page.getByRole("link", { name: "Shop the bean" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Three beans. Zero guesswork." })).toBeVisible();
  await expect(page.locator("#shop > .lb-grid article")).toHaveCount(3);
  await expect(page.locator("#shop > .lb-grid").getByRole("link", { name: "Virunga Washed" })).toBeVisible();
  await expect(page.locator("#dri article")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Specialty Arabica from Rwanda." })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "DRI Coffee – Specialty Arabica from Rwanda, Medium Roast" })
  ).toBeVisible();
  await expect(page.locator("#dri").getByText("From €9.49")).toBeVisible();
  const photo = page.locator("#dri img");
  await expect(photo).toHaveAttribute("src", "/products/dri-rwanda-specialty-arabica.jpg");
  await expect(photo).toHaveAttribute(
    "alt",
    "Three DRI roasted coffee bags in 1 kg, 500 g, and 250 g sizes on a bed of roasted beans."
  );
});
