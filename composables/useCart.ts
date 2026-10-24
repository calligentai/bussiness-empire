import { computed, ref } from "vue";
import type { CartItem, Order, PaymentResult } from "../types/order";

export interface CartState {
  items: CartItem[];
}

const cart = ref<CartItem[]>([]);
const orders = ref<Order[]>([]);

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

  return {
    orders: allOrders,
    createOrder,
    getOrder,
    updateOrderStatus,
  };
};

export const processPayment = async (
  orderId: string,
  amountCents: number,
  shouldSucceed: boolean = true
): Promise<PaymentResult> => {
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
