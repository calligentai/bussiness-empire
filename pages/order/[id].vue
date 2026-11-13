<script setup lang="ts">
import { formatEur } from "../../utils/money";

const route = useRoute();
const id = computed(() => String(route.params.id || ""));
const { data: order } = await useFetch(() => `/api/orders/${encodeURIComponent(id.value)}`);
</script>

<template>
  <article class="lb-order lb-container">
    <template v-if="order">
      <p class="lb-eyebrow">{{ order.status === "paid" ? "Test payment received" : "Test payment" }}</p>
      <h1>{{ order.status === "paid" ? "Order confirmed" : "Order status" }}</h1>
      <p>
        Order number
        <strong data-testid="order-number">{{ order.id }}</strong>
      </p>
      <dl class="lb-order__facts">
        <div>
          <dt>Status</dt>
          <dd data-testid="order-status">{{ order.status }}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd data-testid="order-total">{{ formatEur(order.totalCents) }}</dd>
        </div>
        <div>
          <dt>Customer</dt>
          <dd>{{ order.customer.name }}</dd>
        </div>
        <div>
          <dt>Ship to</dt>
          <dd>{{ order.shipping.line1 }}, {{ order.shipping.postalCode }} {{ order.shipping.city }}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd>{{ order.payment.provider }} · {{ order.payment.paymentId }}</dd>
        </div>
      </dl>
      <ul class="lb-order__items">
        <li v-for="item in order.items" :key="item.variantId">
          {{ item.name }} × {{ item.quantity }}
        </li>
      </ul>
      <p class="lb-order__note">
        This order was captured by the manual test provider. No card was charged.
      </p>
    </template>
    <template v-else>
      <h1>Order status</h1>
      <p>Order not found.</p>
    </template>
  </article>
</template>

<style scoped>
.lb-order {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-4);
  padding-block: var(--lb-space-7) var(--lb-space-9);
}

.lb-order h1 {
  font-size: var(--lb-text-700);
}

.lb-order__facts {
  display: grid;
  gap: var(--lb-space-3);
  margin: 0;
}

.lb-order__facts div {
  display: grid;
  grid-template-columns: 8rem 1fr;
  gap: var(--lb-space-3);
}

.lb-order__facts dt {
  color: var(--lb-color-muted);
}

.lb-order__facts dd,
.lb-order__items {
  margin: 0;
}

.lb-order__items {
  padding-left: var(--lb-space-5);
}

.lb-order__note {
  max-width: 48ch;
  color: var(--lb-color-muted);
}

.lb-order strong {
  font-family: var(--lb-font-mono);
}
</style>
