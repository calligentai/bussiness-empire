import { computed, ref, watch } from "vue";
import type { CartItem, Order, PaymentResult } from "../types/order";

export interface CartState {
  items: CartItem[];
}

export const CART_STORAGE_KEY = "lavabean.cart.v1";
export const ORDER_STORAGE_KEY = "lavabean.orders.v1";

export interface CartStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const cart = ref<CartItem[]>([]);
let storageOverride: CartStorage | null | undefined;
let hydrating = false;

const isCartItem = (value: unknown): value is CartItem => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.slug === "string" &&
    item.slug.length > 0 &&
    typeof item.name === "string" &&
    item.name.length > 0 &&
    typeof item.priceCents === "number" &&
    Number.isFinite(item.priceCents) &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
};

const readStoredItems = (source: CartStorage | null): CartItem[] => {
  if (!source) return [];
  const raw = source.getItem(CART_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartItem);
  } catch {
    return [];
  }
};

let detectedStorage: CartStorage | null | undefined;

const defaultStorage = (): CartStorage | null => {
  if (detectedStorage !== undefined) return detectedStorage;
  try {
    if (typeof localStorage === "undefined") {
      detectedStorage = null;
      return detectedStorage;
    }
    localStorage.setItem(`${CART_STORAGE_KEY}.probe`, "1");
    localStorage.removeItem(`${CART_STORAGE_KEY}.probe`);
    detectedStorage = localStorage;
  } catch {
    detectedStorage = null;
  }
  return detectedStorage;
};

const activeStorage = (): CartStorage | null => {
  if (storageOverride === null) return null;
  return storageOverride ?? defaultStorage();
};

const saveCart = () => {
  const target = activeStorage();
  if (!target || hydrating) return;
  target.setItem(CART_STORAGE_KEY, JSON.stringify(cart.value));
};

watch(cart, saveCart, { deep: true, flush: "sync" });

export const configureCartStorage = (next: CartStorage | null) => {
  storageOverride = next;
};

export const unloadCart = () => {
  hydrating = true;
  cart.value = [];
  hydrating = false;
};

export const hydrateCart = (source?: CartStorage | null) => {
  const target = source === undefined ? activeStorage() : source;
  hydrating = true;
  cart.value = readStoredItems(target);
  hydrating = false;
};

const ORDER_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

const isOrder = (value: unknown): value is Order => {
  if (!value || typeof value !== "object") return false;
  const order = value as Partial<Order>;
  return (
    typeof order.id === "string" &&
    order.id.length > 0 &&
    Array.isArray(order.items) &&
    order.items.every(isCartItem) &&
    typeof order.totalCents === "number" &&
    Number.isFinite(order.totalCents) &&
    typeof order.status === "string" &&
    ORDER_STATUSES.includes(order.status as Order["status"]) &&
    (order.paymentId === null || typeof order.paymentId === "string") &&
    typeof order.createdAt === "string" &&
    typeof order.updatedAt === "string"
  );
};

const readStoredOrders = (
  source: CartStorage | null
): { orders: Order[]; webhookIds: string[] } => {
  if (!source) return { orders: [], webhookIds: [] };
  const raw = source.getItem(ORDER_STORAGE_KEY);
  if (!raw) return { orders: [], webhookIds: [] };
  try {
    const parsed = JSON.parse(raw) as { orders?: unknown; webhookIds?: unknown };
    const storedOrders = Array.isArray(parsed.orders) ? parsed.orders.filter(isOrder) : [];
    const webhookIds = Array.isArray(parsed.webhookIds)
      ? parsed.webhookIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
    return { orders: storedOrders, webhookIds };
  } catch {
    return { orders: [], webhookIds: [] };
  }
};

const orders = ref<Order[]>([]);
const processedWebhookIds = new Set<string>();
export const ordersReady = ref(false);

const saveOrders = () => {
  const target = activeStorage();
  if (!target || hydrating) return;
  target.setItem(
    ORDER_STORAGE_KEY,
    JSON.stringify({
      orders: orders.value,
      webhookIds: [...processedWebhookIds],
    })
  );
};

watch(orders, saveOrders, { deep: true, flush: "sync" });

export const unloadOrders = () => {
  hydrating = true;
  orders.value = [];
  processedWebhookIds.clear();
  hydrating = false;
};

export const hydrateOrders = (source?: CartStorage | null) => {
  const target = source === undefined ? activeStorage() : source;
  const stored = readStoredOrders(target);
  hydrating = true;
  orders.value = stored.orders;
  processedWebhookIds.clear();
  for (const id of stored.webhookIds) processedWebhookIds.add(id);
  hydrating = false;
  ordersReady.value = true;
};

export interface PaymentWebhookEvent {
  id: string;
  orderId: string;
  status: "paid" | "failed";
  paymentId: string;
}

export interface RefundResult {
  ok: boolean;
  order?: Order;
  error?: "order_not_found" | "not_refundable" | "already_refunded";
}

export const useCart = () => {
  const items = computed(() => cart.value);
  const itemCount = computed(() =>
    cart.value.reduce((total, item) => total + item.quantity, 0)
  );
  const subtotalCents = computed(() =>
    cart.value.reduce((total, item) => total + item.priceCents * item.quantity, 0)
  );

  const addItem = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    const existing = cart.value.find((i) => i.slug === item.slug);
    if (existing) {
      existing.quantity += quantity;
      return;
    }
    cart.value.push({ ...item, quantity });
  };

  const removeItem = (slug: string) => {
    cart.value = cart.value.filter((i) => i.slug !== slug);
  };

  const updateQuantity = (slug: string, quantity: number) => {
    const item = cart.value.find((i) => i.slug === slug);
    if (!item) return;
    if (quantity <= 0) {
      removeItem(slug);
      return;
    }
    item.quantity = quantity;
  };

  const clearCart = () => {
    cart.value = [];
  };

  return {
    items,
    itemCount,
    subtotalCents,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
};

export const useOrders = () => {
  const allOrders = computed(() => orders.value);

  const createOrder = (cartItems: CartItem[]): Order => {
    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }
    const totalCents = cartItems.reduce(
      (total, item) => total + item.priceCents * item.quantity,
      0
    );
    const now = new Date().toISOString();
    const order: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      items: JSON.parse(JSON.stringify(cartItems)),
      totalCents,
      status: "pending",
      paymentId: null,
      createdAt: now,
      updatedAt: now,
    };
    orders.value.push(order);
    return order;
  };

  const getOrder = (id: string): Order | undefined => {
    return orders.value.find((o) => o.id === id);
  };

  const updateOrderStatus = (
    id: string,
    status: Order["status"],
    paymentId?: string | null
  ): Order | undefined => {
    const order = orders.value.find((o) => o.id === id);
    if (!order) return undefined;
    order.status = status;
    if (paymentId !== undefined) {
      order.paymentId = paymentId;
    }
    order.updatedAt = new Date().toISOString();
    return order;
  };

  const applyPaymentWebhook = (event: PaymentWebhookEvent) => {
    const existing = getOrder(event.orderId);
    if (!existing) {
      return { applied: false, order: undefined, error: "order_not_found" };
    }
    if (existing.status === "refunded") {
      return { applied: false, order: existing, error: "already_refunded" };
    }
    if (existing.status === "paid") {
      return { applied: false, order: existing };
    }
    if (processedWebhookIds.has(event.id)) {
      return { applied: false, order: existing };
    }
    processedWebhookIds.add(event.id);
    return {
      applied: true,
      order: updateOrderStatus(event.orderId, event.status, event.paymentId),
    };
  };

  const refundOrder = (id: string, reason?: string): RefundResult => {
    const order = getOrder(id);
    if (!order) return { ok: false, error: "order_not_found" };
    if (order.status === "refunded") {
      return { ok: false, order, error: "already_refunded" };
    }
    if (order.status !== "paid") {
      return { ok: false, order, error: "not_refundable" };
    }
    order.status = "refunded";
    order.refundedAt = new Date().toISOString();
    if (reason !== undefined) order.refundReason = reason;
    order.updatedAt = order.refundedAt;
    return { ok: true, order };
  };

  return {
    orders: allOrders,
    createOrder,
    getOrder,
    updateOrderStatus,
    applyPaymentWebhook,
    refundOrder,
  };
};

export const processPayment = async (
  orderId: string,
  amountCents: number,
  shouldSucceed: boolean = true
): Promise<PaymentResult> => {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { success: false, paymentId: "", error: "Invalid amount" };
  }
  // Simulate payment processing
  await new Promise((resolve) => setTimeout(resolve, 10));
  
  if (shouldSucceed) {
    return {
      success: true,
      paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  } else {
    return {
      success: false,
      paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error: "Payment declined",
    };
  }
};

export const settleSandboxPayment = async (
  orderId: string,
  shouldSucceed: boolean
) => {
  const { getOrder, applyPaymentWebhook } = useOrders();
  const order = getOrder(orderId);
  if (!order) {
    return { applied: false, order: undefined, error: "order_not_found" as const };
  }
  if (order.status === "paid" || order.status === "refunded") {
    return { applied: false, order };
  }

  const result = await processPayment(order.id, order.totalCents, shouldSucceed);
  const outcome = applyPaymentWebhook({
    id: `evt_${order.id}_${result.paymentId}`,
    orderId: order.id,
    status: result.success ? "paid" : "failed",
    paymentId: result.paymentId,
  });

  return { ...outcome, result };
};
