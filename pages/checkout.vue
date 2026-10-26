<script setup lang="ts">
import { settleSandboxPayment, useCart, useOrders } from "../composables/useCart";
import { ref } from "vue";

const { items, subtotalCents, itemCount, clearCart } = useCart();
const { createOrder, getOrder } = useOrders();

const showForm = ref(true);
const showPaymentSandbox = ref(false);
const showSuccess = ref(false);
const orderId = ref<string | null>(null);
const paymentStatus = ref<"idle" | "processing" | "paid" | "failed">("idle");
const paymentError = ref<string | null>(null);
const settling = ref(false);

const startCheckout = () => {
  if (items.value.length === 0) return;
  if (!orderId.value) {
    const order = createOrder(items.value);
    orderId.value = order.id;
  }
  paymentError.value = null;
  paymentStatus.value = "idle";
  showForm.value = false;
  showSuccess.value = false;
  showPaymentSandbox.value = true;
};

const settlePayment = async (shouldSucceed: boolean) => {
  if (!orderId.value || settling.value) return;
  const order = getOrder(orderId.value);
  if (!order || order.status === "paid") return;

  settling.value = true;
  paymentError.value = null;
  paymentStatus.value = "processing";
  showPaymentSandbox.value = false;

  try {
    const outcome = await settleSandboxPayment(orderId.value, shouldSucceed);

    if (outcome.result?.success && outcome.applied) {
      paymentStatus.value = "paid";
      showSuccess.value = true;
      clearCart();
      return;
    }

    paymentStatus.value = "failed";
    paymentError.value = outcome.result?.error ?? "Payment declined";
  } finally {
    settling.value = false;
  }
};

const retry = () => {
  paymentError.value = null;
  paymentStatus.value = "idle";
  showSuccess.value = false;
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

    <form v-if="showForm" @submit.prevent="startCheckout" class="lb-checkout__form">
      <button type="submit" class="lb-button lb-button--lg">Pay now</button>
    </form>

    <section v-if="showPaymentSandbox" class="lb-payment-sandbox">
      <h2>Payment sandbox</h2>
      <p>Test payment for order <strong>{{ orderId }}</strong></p>
      <div class="lb-payment-sandbox__controls">
        <button type="button" class="lb-button" @click="settlePayment(true)">Complete payment (sandbox)</button>
        <button type="button" class="lb-button" @click="settlePayment(false)">Fail payment (sandbox)</button>
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
  display: flex;
  flex-wrap: wrap;
  gap: var(--lb-space-3);
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