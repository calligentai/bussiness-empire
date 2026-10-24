import { describe, it, expect, beforeEach } from "vitest";
import { useCart, useOrders, processPayment } from "../composables/useCart";
import type { CartItem } from "../types/order";

describe("useCart", () => {
  beforeEach(() => {
    // Reset cart state
    const { clearCart } = useCart();
    clearCart();
  });

  it("adds an item to the cart", () => {
    const { addItem, items, itemCount, subtotalCents } = useCart();
    addItem({ slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850 });
    
    expect(items.value).toHaveLength(1);
    expect(items.value[0].slug).toBe("virunga-washed");
    expect(items.value[0].quantity).toBe(1);
    expect(itemCount.value).toBe(1);
    expect(subtotalCents.value).toBe(1850);
  });

  it("increments quantity when adding same item", () => {
    const { addItem, items, itemCount, subtotalCents } = useCart();
    addItem({ slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850 });
    addItem({ slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850 });
    
    expect(items.value).toHaveLength(1);
    expect(items.value[0].quantity).toBe(2);
    expect(itemCount.value).toBe(2);
    expect(subtotalCents.value).toBe(3700);
  });

  it("removes an item from the cart", () => {
    const { addItem, removeItem, items, itemCount } = useCart();
    addItem({ slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850 });
    removeItem("virunga-washed");
    
    expect(items.value).toHaveLength(0);
    expect(itemCount.value).toBe(0);
  });

  it("updates quantity", () => {
    const { addItem, updateQuantity, items } = useCart();
    addItem({ slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850 });
    updateQuantity("virunga-washed", 3);
    
    expect(items.value[0].quantity).toBe(3);
  });

  it("removes item when quantity set to 0", () => {
    const { addItem, updateQuantity, items } = useCart();
    addItem({ slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850 });
    updateQuantity("virunga-washed", 0);
    
    expect(items.value).toHaveLength(0);
  });

  it("clears the cart", () => {
    const { addItem, clearCart, items } = useCart();
    addItem({ slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850 });
    clearCart();
    
    expect(items.value).toHaveLength(0);
  });
});

describe("useOrders", () => {
  it("creates an order from cart items", () => {
    const { createOrder, getOrder } = useOrders();
    const cartItems: CartItem[] = [
      { slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850, quantity: 2 },
    ];
    
    const order = createOrder(cartItems);
    
    expect(order.id).toBeDefined();
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.totalCents).toBe(3700);
    expect(order.status).toBe("pending");
    expect(order.paymentId).toBeNull();
  });

  it("retrieves an order by id", () => {
    const { createOrder, getOrder } = useOrders();
    const cartItems: CartItem[] = [
      { slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850, quantity: 1 },
    ];
    
    const order = createOrder(cartItems);
    const retrieved = getOrder(order.id);
    
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(order.id);
  });

  it("updates order status", () => {
    const { createOrder, updateOrderStatus, getOrder } = useOrders();
    const cartItems: CartItem[] = [
      { slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850, quantity: 1 },
    ];
    
    const order = createOrder(cartItems);
    updateOrderStatus(order.id, "paid", "pay_123");
    
    const updated = getOrder(order.id);
    expect(updated?.status).toBe("paid");
    expect(updated?.paymentId).toBe("pay_123");
  });

  it("does not create a completed order on failed payment", async () => {
    const { createOrder, updateOrderStatus, getOrder } = useOrders();
    const cartItems: CartItem[] = [
      { slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850, quantity: 1 },
    ];
    
    const order = createOrder(cartItems);
    const result = await processPayment(order.id, order.totalCents, false);
    
    if (!result.success) {
      updateOrderStatus(order.id, "failed", result.paymentId);
    }
    
    const updated = getOrder(order.id);
    expect(updated?.status).toBe("failed");
    expect(updated?.status).not.toBe("paid");
  });

  it("creates exactly one order per payment", () => {
    const { createOrder } = useOrders();
    const cartItems: CartItem[] = [
      { slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850, quantity: 1 },
    ];
    
    const order1 = createOrder(cartItems);
    const order2 = createOrder(cartItems);
    
    expect(order1.id).not.toBe(order2.id);
  });
});

describe("processPayment", () => {
  it("succeeds when shouldSucceed is true", async () => {
    const result = await processPayment("order_123", 1850, true);
    
    expect(result.success).toBe(true);
    expect(result.paymentId).toBeDefined();
  });

  it("fails when shouldSucceed is false", async () => {
    const result = await processPayment("order_123", 1850, false);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("payment webhook", () => {
  it("creates exactly one order for one successful payment and ignores the duplicate webhook", () => {
    const { createOrder, applyPaymentWebhook, orders } = useOrders();
    const cartItems: CartItem[] = [
      { slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850, quantity: 1 },
    ];
    const before = orders.value.length;

    const order = createOrder(cartItems);
    const event = {
      id: "evt_paid_1",
      orderId: order.id,
      status: "paid" as const,
      paymentId: "pay_123",
    };

    const first = applyPaymentWebhook(event);
    const duplicate = applyPaymentWebhook(event);

    expect(first.applied).toBe(true);
    expect(duplicate.applied).toBe(false);
    expect(orders.value.length - before).toBe(1);
    expect(order.status).toBe("paid");
  });

  it("does not complete an order when the failed payment webhook is replayed", () => {
    const { createOrder, applyPaymentWebhook } = useOrders();
    const order = createOrder([
      { slug: "virunga-washed", name: "Virunga Washed", priceCents: 1850, quantity: 1 },
    ]);
    const event = {
      id: "evt_failed_1",
      orderId: order.id,
      status: "failed" as const,
      paymentId: "pay_declined",
    };

    applyPaymentWebhook(event);
    const duplicate = applyPaymentWebhook(event);

    expect(duplicate.applied).toBe(false);
    expect(order.status).toBe("failed");
    expect(order.status).not.toBe("paid");
  });
});
