import { beforeEach, describe, expect, it } from "vitest";
import { processPayment, useCart, useOrders } from "../../composables/useCart";
import { createVerifiedPrincipal, type VerifiedPrincipal } from "../../packages/contracts/auth";
import { resolveDealerFromVerifiedToken } from "../../packages/contracts/dealer";

const { addItem, clearCart, items } = useCart();
const { applyPaymentWebhook, createOrder, getOrderForDealer } = useOrders();

const epoch = Math.floor(Date.now() / 1000);

function dealerAWallet() {
  return createVerifiedPrincipal(
    { sub: "user-a", dealerId: "dealer-a", issuer: "lavabean-auth", expiresAt: epoch + 600 },
    { signatureValid: true, nowEpochSeconds: epoch },
  );
}

function dealerBWallet() {
  return createVerifiedPrincipal(
    { sub: "user-b", dealerId: "dealer-b", issuer: "lavabean-auth", expiresAt: epoch + 600 },
    { signatureValid: true, nowEpochSeconds: epoch },
  );
}

const grounds = { priceCents: 1900, slug: "lava-bean-grounds", name: "Lava Bean Grounds 250g" };

async function checkoutToPaid(dealerWallet: () => VerifiedPrincipal) {
  addItem(grounds, 2);
  const order = createOrder(items.value, dealerWallet());
  expect(await processPayment(order.id, order.totalCents, true)).toMatchObject({ success: true });
  applyPaymentWebhook({ id: `evt_${order.id}`, orderId: order.id, status: "paid", paymentId: "pay_sandbox" });
  clearCart();
  return order;
}

beforeEach(() => {
  clearCart();
});

describe("M8 two-dealer checkout-to-dashboard tenant isolation (sandbox)", () => {
  it("dealer B's dashboard session cannot read dealer A's paid order", async () => {
    const aOrder = await checkoutToPaid(dealerAWallet);
    const bOrder = await checkoutToPaid(dealerBWallet);

    expect(aOrder.dealerId).toBe("dealer-a");
    expect(bOrder.dealerId).toBe("dealer-b");

    const bDashboardPrincipal = dealerBWallet();
    expect(getOrderForDealer(aOrder.id, bDashboardPrincipal)).toBeUndefined();
    expect(getOrderForDealer(bOrder.id, dealerAWallet())).toBeUndefined();
  });

  it("each dealer's own dashboard still sees its own order", async () => {
    const aOrder = await checkoutToPaid(dealerAWallet);
    expect(getOrderForDealer(aOrder.id, dealerAWallet())).toMatchObject({
      id: aOrder.id,
      dealerId: "dealer-a",
      status: "paid",
    });
  });

  it("rejects unverified dealer sessions before creating or reading scoped orders", () => {
    const unverified = { verified: false, dealerId: "dealer-b" } as unknown as VerifiedPrincipal;
    expect(() => createOrder([{ ...grounds, quantity: 1 }], unverified)).toThrow("Invalid dealer token");
    expect(() => getOrderForDealer("not-found", unverified)).toThrow("Invalid dealer token");
    expect(() => resolveDealerFromVerifiedToken(unverified)).toThrow("Invalid dealer token");
  });
});
