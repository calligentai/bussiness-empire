import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getOrder, placeOrder } from "../server/commerce/store";
import { applySandboxWebhook, refundSandboxOrder } from "../server/commerce/medusa-orders";

/**
 * M3 acceptance against a running Medusa process.
 * A paid sandbox checkout creates one Medusa order. A declined payment does not.
 * Refunds and duplicate webhooks are Medusa routes, not the in-memory composable.
 */

const runtimePath = join(process.cwd(), "apps/medusa/.runtime.json");

const runtime = () => JSON.parse(readFileSync(runtimePath, "utf8")) as {
  backendUrl: string;
  publishableKey: string;
  adminEmail: string;
  adminPassword: string;
  internalToken: string;
};

const buyer = {
  customer: { name: "Test Buyer", email: "buyer@example.com" },
  shipping: {
    line1: "Keizersgracht 1",
    postalCode: "1015 CJ",
    city: "Amsterdam",
    country: "NL",
  },
};

const env = { APP_ENV: "test", PAYMENT_PROVIDER: "manual" };
const dataDir = () => mkdtempSync(join(tmpdir(), "lb-medusa-"));

const adminToken = async () => {
  const { backendUrl, adminEmail, adminPassword } = runtime();
  const response = await fetch(`${backendUrl}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  if (!response.ok) {
    throw new Error(`Medusa admin login failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { token?: string };
  if (!body.token) throw new Error("Medusa admin login returned no token");
  return body.token;
};

const adminOrders = async () => {
  const { backendUrl } = runtime();
  const token = await adminToken();
  const response = await fetch(`${backendUrl}/admin/orders?limit=50&order=-created_at&fields=id,metadata`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Medusa order list failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as {
    orders?: Array<{ id: string; metadata?: { public_id?: string } | null }>;
  };
  return body.orders ?? [];
};

const orderIdsForPublicId = async (publicId: string) =>
  (await adminOrders())
    .filter((order) => order.metadata?.public_id === publicId)
    .map((order) => order.id);

const adminPaymentStatus = async (orderId: string) => {
  const { backendUrl } = runtime();
  const token = await adminToken();
  const response = await fetch(`${backendUrl}/admin/orders/${orderId}?fields=id,payment_status`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Medusa order read failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { order?: { payment_status?: string } };
  return body.order?.payment_status;
};

describe("M3 Medusa catalog", () => {
  it("serves the seeded DRI 500 g price and photo from the Store API", async () => {
    const { backendUrl, publishableKey } = runtime();
    const headers = { "x-publishable-api-key": publishableKey };
    const regionsResponse = await fetch(`${backendUrl}/store/regions`, { headers });
    expect(regionsResponse.ok).toBe(true);
    const regions = (await regionsResponse.json()) as {
      regions: Array<{ id: string; currency_code: string }>;
    };
    const region = regions.regions.find((item) => item.currency_code === "eur");
    expect(region?.id).toBeTruthy();

    const productsResponse = await fetch(
      `${backendUrl}/store/products?limit=20&region_id=${region?.id}&fields=*variants,*variants.calculated_price`,
      { headers },
    );
    expect(productsResponse.ok).toBe(true);
    const body = (await productsResponse.json()) as {
      products: Array<{
        handle: string;
        thumbnail: string | null;
        variants: Array<{
          sku: string;
          calculated_price?: { calculated_amount?: number | null };
        }>;
      }>;
    };
    const handles = body.products.map((product) => product.handle);
    expect(handles).toEqual(
      expect.arrayContaining([
        "virunga-washed",
        "kivu-natural",
        "basalt-dark",
        "dri-coffee-specialty-arabica-rwanda",
      ]),
    );
    const dri = body.products.find(
      (product) => product.handle === "dri-coffee-specialty-arabica-rwanda",
    );
    expect(dri?.thumbnail).toBe("/products/dri-rwanda-specialty-arabica.jpg");
    const size = dri?.variants.find((variant) => variant.sku === "DRI-RW-500G");
    const amount = size?.calculated_price?.calculated_amount;
    const euros = typeof amount === "number" && amount > 100 ? amount / 100 : amount;
    expect(euros).toBeCloseTo(16.96, 2);
  });
});

describe("M3 Medusa checkout", () => {
  it("creates exactly one Medusa order for a paid DRI checkout and none when payment is declined", async () => {
    const dir = dataDir();
    const paid = await placeOrder(
      {
        ...buyer,
        items: [
          {
            slug: "dri-coffee-specialty-arabica-rwanda",
            variantId: "variant_dri_rwanda_500g",
            quantity: 2,
            priceCents: 1,
          },
        ],
        idempotencyKey: "idem-medusa-dri-500",
      },
      { dataDir: dir, env },
    );

    expect(paid.status).toBe("paid");
    expect(paid.totalCents).toBe(3392);
    expect(paid.payment.provider).toBe("manual");
    expect(paid.medusaOrderId).toMatch(/^order_/);
    expect(await orderIdsForPublicId(paid.id)).toEqual([paid.medusaOrderId]);

    const replay = await placeOrder(
      {
        ...buyer,
        items: [
          {
            slug: "dri-coffee-specialty-arabica-rwanda",
            variantId: "variant_dri_rwanda_500g",
            quantity: 2,
          },
        ],
        idempotencyKey: "idem-medusa-dri-500",
      },
      { dataDir: dir, env },
    );
    expect(replay.id).toBe(paid.id);
    expect(replay.medusaOrderId).toBe(paid.medusaOrderId);
    expect(await orderIdsForPublicId(paid.id)).toEqual([paid.medusaOrderId]);

    const declined = await placeOrder(
      {
        ...buyer,
        customer: { name: "Test Buyer", email: "declined@example.com" },
        items: [{ slug: "basalt-dark", quantity: 1 }],
        idempotencyKey: "idem-medusa-decline",
        paymentOutcome: "failed",
      },
      { dataDir: dir, env },
    );
    expect(declined.status).toBe("failed");
    expect(declined.status).not.toBe("paid");
    expect(declined.medusaOrderId).toBeNull();
    expect((await getOrder(declined.id, { dataDir: dir }))?.status).toBe("failed");
    expect(await orderIdsForPublicId(declined.id)).toEqual([]);
    expect(await orderIdsForPublicId(paid.id)).toEqual([paid.medusaOrderId]);
  });

  it("still checks out when the AI gateway address is closed", async () => {
    const dir = dataDir();
    const order = await placeOrder(
      {
        ...buyer,
        items: [{ slug: "virunga-washed", quantity: 1 }],
        idempotencyKey: "idem-medusa-no-ai",
      },
      {
        dataDir: dir,
        env: {
          ...env,
          AI_GATEWAY_URL: "http://127.0.0.1:9",
          PAPERCLIP_URL: "http://127.0.0.1:9",
        },
      },
    );
    expect(order.status).toBe("paid");
    expect(order.totalCents).toBe(1850);
    expect(order.medusaOrderId).toMatch(/^order_/);
  });
});

describe("M3 Medusa refunds and webhooks", () => {
  it("refunds a paid order once through Medusa and does not refund an unpaid order", async () => {
    const dir = dataDir();
    const paid = await placeOrder(
      {
        ...buyer,
        items: [{ slug: "kivu-natural", quantity: 1 }],
        idempotencyKey: "idem-medusa-refund",
      },
      { dataDir: dir, env },
    );

    const first = await refundSandboxOrder(paid.id, "customer_request", { dataDir: dir });
    expect(first.ok).toBe(true);
    expect(first.status).toBe("refunded");
    expect((await getOrder(paid.id, { dataDir: dir }))?.status).toBe("refunded");
    expect(await adminPaymentStatus(paid.medusaOrderId as string)).toBe("refunded");

    const again = await refundSandboxOrder(paid.id, "customer_request", { dataDir: dir });
    expect(again.ok).toBe(false);
    expect(again.error).toBe("already_refunded");
    expect((await getOrder(paid.id, { dataDir: dir }))?.status).toBe("refunded");

    const declined = await placeOrder(
      {
        ...buyer,
        items: [{ slug: "kivu-natural", quantity: 1 }],
        idempotencyKey: "idem-medusa-refund-unpaid",
        paymentOutcome: "failed",
      },
      { dataDir: dir, env },
    );
    const unpaid = await refundSandboxOrder(declined.id, "customer_request", { dataDir: dir });
    expect(unpaid.ok).toBe(false);
    expect(unpaid.error).toBe("not_refundable");

    const missing = await refundSandboxOrder("LB-missing", "customer_request", { dataDir: dir });
    expect(missing.ok).toBe(false);
    expect(missing.error).toBe("order_not_found");
  });

  it("applies one webhook once and does not reopen a refunded order", async () => {
    const dir = dataDir();
    const paid = await placeOrder(
      {
        ...buyer,
        items: [{ slug: "virunga-washed", quantity: 1 }],
        idempotencyKey: "idem-medusa-webhook",
      },
      { dataDir: dir, env },
    );
    const event = {
      id: `evt_${paid.id}`,
      orderId: paid.id,
      status: "paid" as const,
      paymentId: paid.payment.paymentId,
    };
    const first = await applySandboxWebhook(event, { dataDir: dir });
    const duplicate = await applySandboxWebhook(event, { dataDir: dir });
    expect(first.applied).toBe(true);
    expect(duplicate.applied).toBe(false);
    expect((await getOrder(paid.id, { dataDir: dir }))?.status).toBe("paid");

    await refundSandboxOrder(paid.id, "customer_request", { dataDir: dir });
    const late = await applySandboxWebhook(
      { ...event, id: `evt_${paid.id}_late` },
      { dataDir: dir },
    );
    expect(late.applied).toBe(false);
    expect(late.error).toBe("already_refunded");
    expect((await getOrder(paid.id, { dataDir: dir }))?.status).toBe("refunded");

    const unknown = await applySandboxWebhook(
      { id: "evt_orphan", orderId: "LB-does-not-exist", status: "paid", paymentId: "pay_x" },
      { dataDir: dir },
    );
    expect(unknown.applied).toBe(false);
    expect(unknown.error).toBe("order_not_found");
  });
});
