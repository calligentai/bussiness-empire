import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getOrder, placeOrder } from "../server/commerce/store";

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

const dataDir = () => mkdtempSync(join(tmpdir(), "lb-order-"));

describe("manual sandbox checkout", () => {
  it("prices a DRI size from the catalog and ignores a client-supplied price", async () => {
    const dir = dataDir();
    const order = await placeOrder(
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
        idempotencyKey: "idem-dri-500-2",
      },
      { dataDir: dir, env },
    );

    expect(order.id).toMatch(/^LB-\d+$/);
    expect(order.status).toBe("paid");
    expect(order.currency).toBe("eur");
    expect(order.payment.provider).toBe("manual");
    expect(order.payment.paymentId).toMatch(/^manual_/);
    expect(order.items).toEqual([
      expect.objectContaining({
        sku: "DRI-RW-500G",
        variantId: "variant_dri_rwanda_500g",
        quantity: 2,
        unitPriceCents: 1696,
      }),
    ]);
    expect(order.totalCents).toBe(3392);
    expect(order.customer).toEqual(buyer.customer);
    expect(order.shipping.city).toBe("Amsterdam");
  });

  it("accepts the size encoded in the product-page cart slug", async () => {
    const dir = dataDir();
    const order = await placeOrder(
      {
        ...buyer,
        items: [
          {
            slug: "dri-coffee-specialty-arabica-rwanda--variant_dri_rwanda_250g",
            quantity: 1,
          },
        ],
        idempotencyKey: "idem-dri-slug-250",
      },
      { dataDir: dir, env },
    );

    expect(order.items[0]).toEqual(
      expect.objectContaining({ sku: "DRI-RW-250G", unitPriceCents: 949, quantity: 1 }),
    );
    expect(order.totalCents).toBe(949);
  });

  it("prices the product-page payload that sends both the composite slug and the variant id", async () => {
    const dir = dataDir();
    const order = await placeOrder(
      {
        ...buyer,
        items: [
          {
            slug: "dri-coffee-specialty-arabica-rwanda--variant_dri_rwanda_500g",
            variantId: "variant_dri_rwanda_500g",
            quantity: 2,
          },
        ],
        idempotencyKey: "idem-dri-both",
      },
      { dataDir: dir, env },
    );

    expect(order.totalCents).toBe(3392);
    expect(order.items[0]?.sku).toBe("DRI-RW-500G");
  });

  it("retrieves a paid single-variant order by its order number", async () => {
    const dir = dataDir();
    const order = await placeOrder(
      {
        ...buyer,
        items: [{ slug: "virunga-washed", quantity: 1 }],
        idempotencyKey: "idem-virunga-1",
      },
      { dataDir: dir, env },
    );

    const loaded = await getOrder(order.id, { dataDir: dir });
    expect(loaded?.id).toBe(order.id);
    expect(loaded?.status).toBe("paid");
    expect(loaded?.totalCents).toBe(1850);
    expect(loaded?.items[0]?.sku).toBe("LB-VIR-1KG");
  });

  it("returns the original order when the same idempotency key is replayed", async () => {
    const dir = dataDir();
    const input = {
      ...buyer,
      items: [{ slug: "kivu-natural", quantity: 1 }],
      idempotencyKey: "idem-replay-kivu",
    };
    const first = await placeOrder(input, { dataDir: dir, env });
    const second = await placeOrder(input, { dataDir: dir, env });
    const other = await placeOrder(
      { ...input, idempotencyKey: "idem-replay-kivu-other" },
      { dataDir: dir, env },
    );

    expect(second.id).toBe(first.id);
    expect(other.id).not.toBe(first.id);
    expect((await getOrder(first.id, { dataDir: dir }))?.payment.paymentId).toBe(
      first.payment.paymentId,
    );
  });

  it("rejects a reused idempotency key that does not match the original cart", async () => {
    const dir = dataDir();
    await placeOrder(
      {
        ...buyer,
        items: [{ slug: "kivu-natural", quantity: 1 }],
        idempotencyKey: "idem-conflict-kivu",
      },
      { dataDir: dir, env },
    );

    await expect(
      placeOrder(
        {
          ...buyer,
          items: [{ slug: "kivu-natural", quantity: 3 }],
          idempotencyKey: "idem-conflict-kivu",
        },
        { dataDir: dir, env },
      ),
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("keeps a declined manual payment retrievable and unpaid", async () => {
    const dir = dataDir();
    const order = await placeOrder(
      {
        ...buyer,
        items: [{ slug: "basalt-dark", quantity: 1 }],
        idempotencyKey: "idem-decline-basalt",
        paymentOutcome: "failed",
      },
      { dataDir: dir, env },
    );

    expect(order.status).toBe("failed");
    expect(order.status).not.toBe("paid");
    expect(order.totalCents).toBe(1950);
    expect((await getOrder(order.id, { dataDir: dir }))?.status).toBe("failed");
  });

  it("rejects an empty cart, a bad customer, and a missing DRI size", async () => {
    const dir = dataDir();
    await expect(
      placeOrder({ ...buyer, items: [], idempotencyKey: "idem-empty-cart" }, { dataDir: dir, env }),
    ).rejects.toMatchObject({ code: "empty_cart" });

    await expect(
      placeOrder(
        {
          customer: { name: "A", email: "not-an-email" },
          shipping: buyer.shipping,
          items: [{ slug: "virunga-washed", quantity: 1 }],
          idempotencyKey: "idem-bad-email",
        },
        { dataDir: dir, env },
      ),
    ).rejects.toMatchObject({ code: "invalid_customer" });

    await expect(
      placeOrder(
        {
          ...buyer,
          items: [{ slug: "dri-coffee-specialty-arabica-rwanda", quantity: 1 }],
          idempotencyKey: "idem-need-size",
        },
        { dataDir: dir, env },
      ),
    ).rejects.toMatchObject({ code: "variant_required" });
  });

  it("refuses live keys and does not call Stripe or Mollie", async () => {
    const dir = dataDir();
    const items = [{ slug: "virunga-washed", quantity: 1 }];

    await expect(
      placeOrder(
        { ...buyer, items, idempotencyKey: "idem-live-stripe" },
        { dataDir: dir, env: { ...env, STRIPE_SECRET_KEY: "sk_live_secret" } },
      ),
    ).rejects.toMatchObject({ code: "live_payment_refused" });

    await expect(
      placeOrder(
        { ...buyer, items, idempotencyKey: "idem-stripe-test" },
        {
          dataDir: dir,
          env: { APP_ENV: "test", PAYMENT_PROVIDER: "stripe", STRIPE_SECRET_KEY: "sk_test_123" },
        },
      ),
    ).rejects.toMatchObject({ code: "stripe_test_unwired" });

    await expect(
      placeOrder(
        { ...buyer, items, idempotencyKey: "idem-mollie-test" },
        {
          dataDir: dir,
          env: { APP_ENV: "test", PAYMENT_PROVIDER: "mollie", MOLLIE_API_KEY: "test_123" },
        },
      ),
    ).rejects.toMatchObject({ code: "mollie_test_unwired" });

    expect(await getOrder("LB-100001", { dataDir: dir })).toBeUndefined();
  });

  it("refuses to take a sandbox order when APP_ENV is production", async () => {
    const dir = dataDir();
    await expect(
      placeOrder(
        {
          ...buyer,
          items: [{ slug: "virunga-washed", quantity: 1 }],
          idempotencyKey: "idem-production",
        },
        { dataDir: dir, env: { APP_ENV: "production", PAYMENT_PROVIDER: "manual" } },
      ),
    ).rejects.toMatchObject({ code: "production_disabled" });
  });
});
