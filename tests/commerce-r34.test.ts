import { describe, it, expect } from "vitest";
import { processPayment, useOrders } from "../composables/useCart";
import type { CartItem } from "../types/order";

const cartItems = (): CartItem[] => [
  { slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850, quantity: 1 },
];

let webhookSeq = 0;

const paidEvent = (orderId: string, id = `evt_paid_r34_${++webhookSeq}`) => ({
  id,
  orderId,
  status: "paid" as const,
  paymentId: "pay_r34",
});

describe("R3.4 refunds", () => {
  it("refunds a paid order and records the reason", () => {
    const { createOrder, applyPaymentWebhook, refundOrder } = useOrders();
    const order = createOrder(cartItems());
    applyPaymentWebhook(paidEvent(order.id));

    const result = refundOrder(order.id, "customer_request");

    expect(result.ok).toBe(true);
    expect(order.status).toBe("refunded");
    expect(order.paymentId).toBe("pay_r34");
    expect(order.refundReason).toBe("customer_request");
    expect(order.refundedAt).toBeTruthy();
  });

  it("refuses to refund an order that was never paid", () => {
    const { createOrder, refundOrder } = useOrders();
    const order = createOrder(cartItems());

    const result = refundOrder(order.id, "customer_request");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("not_refundable");
    expect(order.status).toBe("pending");
    expect(order.refundedAt).toBeUndefined();
  });

  it("is idempotent: a second refund leaves the order untouched", () => {
    const { createOrder, applyPaymentWebhook, refundOrder } = useOrders();
    const order = createOrder(cartItems());
    applyPaymentWebhook(paidEvent(order.id));
    expect(refundOrder(order.id, "customer_request").ok).toBe(true);
    const refundedAt = order.refundedAt;

    const again = refundOrder(order.id, "customer_request");

    expect(again.ok).toBe(false);
    expect(again.error).toBe("already_refunded");
    expect(order.status).toBe("refunded");
    expect(order.refundedAt).toBe(refundedAt);
  });

  it("reports an unknown order instead of throwing", () => {
    const { refundOrder } = useOrders();

    const result = refundOrder("order_missing", "customer_request");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("order_not_found");
  });
});

describe("R3.4 payment errors", () => {
  it("rejects checkout with an empty cart", () => {
    const { createOrder } = useOrders();

    expect(() => createOrder([])).toThrow(/empty/i);
  });

  it("returns a declined result when the sandbox payment fails", async () => {
    const result = await processPayment("order_x", 1850, false);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Payment declined");
  });

  it("rejects a non-positive amount instead of charging", async () => {
    const zero = await processPayment("order_x", 0, true);
    const negative = await processPayment("order_x", -100, true);

    expect(zero.success).toBe(false);
    expect(zero.error).toMatch(/amount/i);
    expect(negative.success).toBe(false);
    expect(negative.error).toMatch(/amount/i);
  });
});

describe("R3.4 duplicate and late webhooks", () => {
  it("applies the same webhook event only once", () => {
    const { createOrder, applyPaymentWebhook } = useOrders();
    const order = createOrder(cartItems());
    const event = paidEvent(order.id);

    const first = applyPaymentWebhook(event);
    const duplicate = applyPaymentWebhook(event);

    expect(first.applied).toBe(true);
    expect(duplicate.applied).toBe(false);
    expect(order.status).toBe("paid");
    expect(order.paymentId).toBe("pay_r34");
  });

  it("ignores a webhook for an unknown order", () => {
    const { applyPaymentWebhook } = useOrders();

    const result = applyPaymentWebhook(paidEvent("order_missing", "evt_orphan"));

    expect(result.applied).toBe(false);
    expect(result.order).toBeUndefined();
    expect(result.error).toBe("order_not_found");
  });

  it("does not resurrect a refunded order from a late paid webhook", () => {
    const { createOrder, applyPaymentWebhook, refundOrder } = useOrders();
    const order = createOrder(cartItems());
    applyPaymentWebhook(paidEvent(order.id, "evt_paid_first"));
    refundOrder(order.id, "customer_request");

    const late = applyPaymentWebhook(paidEvent(order.id, "evt_paid_late"));

    expect(late.applied).toBe(false);
    expect(late.error).toBe("already_refunded");
    expect(order.status).toBe("refunded");
  });
});
