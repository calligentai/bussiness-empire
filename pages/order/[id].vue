<script setup lang="ts">
import { computed } from "vue";
import { ordersReady, useOrders } from "../../composables/useCart";

const route = useRoute();
const { getOrder } = useOrders();

const orderId = String(route.params.id);
const order = computed(() => getOrder(orderId));
</script>

<template>
  <article class="lb-order-status">
    <header class="lb-order-status__header">
      <h1>Order status</h1>
    </header>

    <p v-if="!ordersReady">Loading order…</p>

    <section v-else-if="!order" class="lb-order-status__not-found">
      <p>Order not found.</p>
    </section>

    <section v-else class="lb-order-status__body">
      <dl class="lb-order-status__details">
        <dt>Order ID</dt>
        <dd>{{ order.id }}</dd>
        <dt>Status</dt>
        <dd class="lb-order-status__status" :class="`lb-order-status__status--${order.status}`">
          {{ order.status }}
        </dd>
        <dt>Total</dt>
        <dd>{{ (order.totalCents / 100).toFixed(2) }} EUR</dd>
        <dt>Payment ID</dt>
        <dd>{{ order.paymentId ?? "—" }}</dd>
        <dt>Created</dt>
        <dd>{{ new Date(order.createdAt).toLocaleString() }}</dd>
      </dl>

      <ul class="lb-order-status__items">
        <li v-for="item in order.items" :key="item.slug">
          {{ item.name }} × {{ item.quantity }}
        </li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.lb-order-status {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--lb-space-8) var(--lb-space-4);
}

.lb-order-status__header h1 {
  font-size: var(--lb-text-700);
  margin-bottom: var(--lb-space-4);
}

.lb-order-status__details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--lb-space-2);
  margin-bottom: var(--lb-space-6);
}

.lb-order-status__status {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--lb-tracking-wide);
}

.lb-order-status__status--paid {
  color: var(--lb-color-lava);
}

.lb-order-status__status--failed {
  color: var(--lb-color-danger);
}

.lb-order-status__items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-2);
}
</style>