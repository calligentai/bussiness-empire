<script setup lang="ts">
import { useCart } from "../composables/useCart";

const { items, updateQuantity } = useCart();
</script>

<template>
  <article class="lb-cart lb-container">
    <header class="lb-cart__header">
      <p class="lb-eyebrow">Your selection</p>
      <h1>Cart</h1>
    </header>

    <p v-if="items.length === 0" class="lb-cart__empty">
      Your cart is empty. <NuxtLink to="/#shop">Continue shopping</NuxtLink>
    </p>
    <template v-else>
      <CartLines :items="items" @set-quantity="updateQuantity" />
      <NuxtLink class="lb-cart__checkout" to="/checkout">Checkout</NuxtLink>
    </template>
  </article>
</template>

<style scoped>
.lb-cart {
  padding-block: var(--lb-space-7) var(--lb-space-9);
}

.lb-cart__header {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-2);
  margin-bottom: var(--lb-space-5);
}

.lb-cart__header h1 {
  font-size: var(--lb-text-700);
}

.lb-cart__empty {
  max-width: 42ch;
}

.lb-cart__checkout {
  display: inline-flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  padding: var(--lb-space-3) var(--lb-space-6);
  border-radius: var(--lb-radius-sm);
  background: var(--lb-color-ember);
  color: var(--lb-color-ink);
  font-size: var(--lb-text-200);
  font-weight: var(--lb-weight-medium);
  letter-spacing: var(--lb-tracking-wide);
  text-decoration: none;
  text-transform: uppercase;
}
</style>
