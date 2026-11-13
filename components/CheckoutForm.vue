<script setup lang="ts">
import { ref } from "vue";
import { useCart } from "../composables/useCart";
import { formatEur } from "../utils/money";

const { items, subtotalCents, clearCart } = useCart();
const idempotencyKey = crypto.randomUUID();
const pending = ref(false);
const errorMessage = ref("");

const name = ref("");
const email = ref("");
const line1 = ref("");
const postalCode = ref("");
const city = ref("");
const country = ref("NL");

const pay = async () => {
  if (items.value.length === 0 || pending.value) return;
  errorMessage.value = "";
  pending.value = true;
  try {
    const order = await $fetch<{ id: string }>("/api/checkout", {
      method: "POST",
      body: {
        items: items.value.map((item) => ({
          slug: item.slug,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        customer: { name: name.value, email: email.value },
        shipping: {
          line1: line1.value,
          postalCode: postalCode.value,
          city: city.value,
          country: country.value,
        },
        idempotencyKey,
      },
    });
    clearCart();
    await navigateTo(`/order/${order.id}`);
  } catch {
    errorMessage.value = "The test payment was not completed. No paid order was created.";
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <article class="lb-checkout lb-container">
    <header class="lb-checkout__header">
      <p class="lb-eyebrow">Test checkout</p>
      <h1>Checkout</h1>
    </header>

    <p v-if="items.length === 0" class="lb-checkout__empty">
      Your cart is empty. <NuxtLink to="/cart">Return to cart</NuxtLink>
    </p>

    <form v-else class="lb-checkout__form" @submit.prevent="pay">
      <ul class="lb-checkout__lines">
        <li v-for="item in items" :key="item.slug">
          <span>{{ item.name }} × {{ item.quantity }}</span>
          <span>{{ formatEur(item.priceCents * item.quantity) }}</span>
        </li>
      </ul>
      <p class="lb-checkout__total">
        Total <strong>{{ formatEur(subtotalCents) }}</strong>
      </p>

      <fieldset>
        <legend>Customer</legend>
        <label for="checkout-name">Full name</label>
        <input id="checkout-name" v-model="name" name="name" autocomplete="name" required minlength="2" />
        <label for="checkout-email">Email</label>
        <input id="checkout-email" v-model="email" name="email" type="email" autocomplete="email" required />
      </fieldset>

      <fieldset>
        <legend>Shipping</legend>
        <label for="checkout-address">Address</label>
        <input id="checkout-address" v-model="line1" name="address" autocomplete="address-line1" required minlength="4" />
        <label for="checkout-postal">Postal code</label>
        <input id="checkout-postal" v-model="postalCode" name="postal-code" autocomplete="postal-code" required minlength="2" />
        <label for="checkout-city">City</label>
        <input id="checkout-city" v-model="city" name="city" autocomplete="address-level2" required minlength="2" />
        <label for="checkout-country">Country</label>
        <input id="checkout-country" v-model="country" name="country" autocomplete="country" required minlength="2" />
      </fieldset>

      <p class="lb-checkout__sandbox">
        Test payment. Provider: manual. No card is charged and no live payment service is contacted.
      </p>
      <p v-if="errorMessage" class="lb-checkout__error" role="alert">{{ errorMessage }}</p>
      <LavaButton type="submit" size="lg" :disabled="pending">Pay now</LavaButton>
    </form>
  </article>
</template>

<style scoped>
.lb-checkout {
  padding-block: var(--lb-space-7) var(--lb-space-9);
}

.lb-checkout__header {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-2);
  margin-bottom: var(--lb-space-5);
}

.lb-checkout__header h1 {
  font-size: var(--lb-text-700);
}

.lb-checkout__lines {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-3);
  margin: 0 0 var(--lb-space-4);
  padding: 0;
  list-style: none;
}

.lb-checkout__lines li,
.lb-checkout__total {
  display: flex;
  justify-content: space-between;
  gap: var(--lb-space-4);
}

.lb-checkout__total {
  margin-bottom: var(--lb-space-5);
  padding-top: var(--lb-space-3);
  border-top: var(--lb-border-hairline) solid var(--lb-color-line);
  font-size: var(--lb-text-400);
}

.lb-checkout__form {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-4);
  max-width: 40rem;
}

.lb-checkout__form fieldset {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-2);
  margin: 0;
  padding: var(--lb-space-4);
  border: var(--lb-border-hairline) solid var(--lb-color-line);
  border-radius: var(--lb-radius-md);
}

.lb-checkout__form legend {
  padding-inline: var(--lb-space-2);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
}

.lb-checkout__form input {
  min-height: 44px;
  border: var(--lb-border-hairline) solid var(--lb-color-line);
  border-radius: var(--lb-radius-sm);
  padding: var(--lb-space-2) var(--lb-space-3);
  background: var(--lb-color-paper);
  color: var(--lb-color-ink);
  font: inherit;
}

.lb-checkout__sandbox,
.lb-checkout__empty {
  max-width: 48ch;
  color: var(--lb-color-muted);
}

.lb-checkout__error {
  color: var(--lb-color-ink);
}
</style>
