<script setup lang="ts">
import { useCart, useOrders, processPayment } from "../composables/useCart";
import { computed, ref } from "vue";

const { items, subtotalCents, itemCount, clearCart } = useCart();
const { createOrder, updateOrderStatus } = useOrders();

const showForm = ref(true);
const showPaymentSandbox = ref(false);
const showSuccess = ref(false);
const orderId = ref<string | null>(null);
const paymentStatus = ref<"processing" | "paid" | "failed">("processing");
const paymentError = ref<string | null>(null);

const checkout = async () => {
  if (items.value.length === 0) return;
  paymentError.value = null;
  paymentStatus.value = "processing";
  showForm.value = false;
  showPaymentSandbox.value = true;

  const order = createOrder(items.value);
  orderId.value = order.id;

  const result = await processPayment(order.id, order.totalCents, true);

  if (result.success) {
    updateOrderStatus(order.id, "paid", result.paymentId);
    paymentStatus.value = "paid";
    showPaymentSandbox.value = false;
    showSuccess.value = true;
    clearCart();
  } else {
    updateOrderStatus(order.id, "failed", result.paymentId);
    paymentStatus.value = "failed";
    paymentError.value = result.error ?? "Payment declined";
    showPaymentSandbox.value = false;
  }
};

const retry = () => {
  paymentError.value = null;
  paymentStatus.value = "processing";
  showPaymentSandbox.value = true;
};
</script>

<template>
  <article class="lb-checkout">
    <header class="lb-checkout__header">
      <h1>Checkout</h1>
      <p>{{ itemCount }} item{{ itemCount === 1 ? "" : "s" }}</p>
    </header>

    <dl class="lb-checkout__summary">
      <div v-for="item in items" :key="item.slug" class="lb-checkout__line">
        <dt>{{ item.name }}</dt>
        <dd>{{ item.quantity }} × {{ (item.priceCents / 100).toFixed(2) }} EUR</dd>
      </div>
      <dt class="lb-checkout__total-label">Total</dt>
      <dd class="lb-checkout__total-value">{{ (subtotalCents / 100).toFixed(2) }} EUR</dd>
    </dl>

    <form v-if="showForm" @submit.prevent="checkout" class="lb-checkout__form">
      <button type="submit" class="lb-button lb-button--lg">Pay now</button>
    </form>

    <section v-if="showPaymentSandbox" class="lb-payment-sandbox">
      <h2>Payment sandbox</h2>
      <p>Test payment for order <strong>{{ orderId }}</strong></p>
      <div class="lb-payment-sandbox__controls">
        <button @click="checkout" class="lb-button">Complete payment (sandbox)</button>
      </div>
      <p class="lb-payment-sandbox__note">This is a sandbox. No real money is taken.</p>
    </section>

    <section v-if="paymentStatus === 'processing'" class="lb-payment-processing">
      <p>Processing payment...</p>
    </section>

    <section v-if="showSuccess" class="lb-order-success">
      <h2>Order confirmed</h2>
      <p>Your order <strong>{{ orderId }}</strong> has been paid.</p>
      <p>Redirecting to order status...</p>
    </section>

    <section v-if="paymentStatus === 'failed'" class="lb-payment-failed">
      <h2>Payment failed</h2>
      <p>{{ paymentError }}</p>
      <button @click="retry" class="lb-button">Retry payment</button>
    </section>
  </article>
</template>

<style scoped>
.lb-checkout {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--lb-space-8) var(--lb-space-4);
}

.lb-checkout__header h1 {
  font-size: var(--lb-text-700);
  margin-bottom: var(--lb-space-2);
}

.lb-checkout__summary {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--lb-space-2);
  border: var(--lb-border-hairline) solid var(--lb-color-surface);
  padding: var(--lb-space-4);
  border-radius: var(--lb-radius-md);
  margin-bottom: var(--lb-space-6);
}

.lb-checkout__line {
  display: contents;
}

.lb-checkout__total-label,
.lb-checkout__total-value {
  font-weight: 600;
  border-top: var(--lb-border-hairline) solid var(--lb-color-surface);
  padding-top: var(--lb-space-3);
  grid-column: 1 / -1;
}

.lb-checkout__total-value {
  text-align: right;
}

.lb-checkout__form {
  margin-bottom: var(--lb-space-6);
}

.lb-payment-sandbox {
  border: var(--lb-border-hairline) solid var(--lb-color-lava);
  background: var(--lb-color-paper);
  padding: var(--lb-space-5);
  border-radius: var(--lb-radius-md);
  margin-bottom: var(--lb-space-6);
}

.lb-payment-sandbox h2 {
  font-size: var(--lb-text-500);
  margin-top: 0;
  margin-bottom: var(--lb-space-2);
}

.lb-payment-sandbox__controls {
  margin-top: var(--lb-space-3);
}

.lb-payment-sandbox__note {
  font-size: var(--lb-text-100);
  color: var(--lb-color-muted);
  margin-top: var(--lb-space-3);
}

.lb-payment-processing,
.lb-payment-failed,
.lb-order-success {
  padding: var(--lb-space-6);
  border-radius: var(--lb-radius-md);
  margin-bottom: var(--lb-space-6);
}

.lb-payment-processing {
  background: var(--lb-color-surface);
  color: var(--lb-color-paper);
}

.lb-payment-failed {
  border: var(--lb-border-hairline) solid var(--lb-color-danger);
  background: var(--lb-color-paper);
}

.lb-order-success {
  border: var(--lb-border-hairline) solid var(--lb-color-lava);
  background: var(--lb-color-paper);
}

.lb-product__added {
  margin-top: var(--lb-space-2);
  color: var(--lb-color-lava);
  font-size: var(--lb-text-200);
  font-weight: 600;
}
</style>