import { expect, test } from "@playwright/test";

test("places one DRI size-variant order and reads it back", async ({ page }) => {
  await page.goto("/product/dri-coffee-specialty-arabica-rwanda");
  await page.getByRole("radio", { name: /500 g/ }).check();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to cart")).toBeVisible();

  await page.getByRole("button", { name: /^Cart\b/ }).click();
  const drawer = page.getByRole("dialog", { name: "Cart" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText(/500 g/)).toBeVisible();
  await expect(drawer.getByTestId("drawer-total")).toHaveText("€16.96");
  await drawer.getByRole("link", { name: "Review cart" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Cart" })).toBeVisible();
  await page.getByRole("button", { name: /Increase quantity/ }).click();
  await expect(page.getByTestId("cart-total")).toHaveText("€33.92");

  await page.getByRole("link", { name: "Checkout" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
  await page.getByLabel("Full name").fill("Test Buyer");
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByLabel("Address").fill("Keizersgracht 1");
  await page.getByLabel("Postal code").fill("1015 CJ");
  await page.getByLabel("City").fill("Amsterdam");
  await page.getByLabel("Country").fill("NL");
  await page.getByRole("button", { name: "Pay now" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Order confirmed" })).toBeVisible();
  const orderNumber = page.getByTestId("order-number");
  await expect(orderNumber).toHaveText(/^LB-\d+$/);
  const id = (await orderNumber.innerText()).trim();
  await expect(page.getByTestId("order-status")).toHaveText("paid");
  await expect(page.getByText("€33.92")).toBeVisible();
  await expect(page.getByText("Test Buyer")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("order-number")).toHaveText(id);
  await expect(page.getByTestId("order-status")).toHaveText("paid");

  const status = await page.request.get(`/api/orders/${id}`);
  expect(status.ok()).toBeTruthy();
  const body = await status.json();
  expect(body.id).toBe(id);
  expect(body.status).toBe("paid");
  expect(body.totalCents).toBe(3392);
  expect(body.payment.provider).toBe("manual");
  expect(body.items[0].sku).toBe("DRI-RW-500G");
  expect(body.items[0].quantity).toBe(2);
});
