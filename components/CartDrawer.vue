<script setup lang="ts">
import { useCart } from "../composables/useCart";

const emit = defineEmits<{ close: [] }>();
const { items, updateQuantity } = useCart();
</script>

<template>
  <div class="lb-drawer__body">
    <header class="lb-drawer__header">
      <h2 id="cart-drawer-title">Cart</h2>
      <LavaButton type="button" variant="secondary" @click="emit('close')">Close</LavaButton>
    </header>

    <p v-if="items.length === 0">Your cart is empty.</p>
    <CartLines
      v-else
      :items="items"
      total-test-id="drawer-total"
      @set-quantity="updateQuantity"
    />

    <p class="lb-drawer__note">Review quantities here, then continue to checkout.</p>
    <div class="lb-drawer__actions">
      <NuxtLink to="/cart" @click="emit('close')">Review cart</NuxtLink>
      <NuxtLink v-if="items.length > 0" to="/checkout" @click="emit('close')">Checkout</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.lb-drawer__header,
.lb-drawer__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--lb-space-3);
}

.lb-drawer__header h2 {
  font-size: var(--lb-text-500);
}

.lb-drawer__note {
  margin-bottom: var(--lb-space-4);
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

.lb-drawer__actions a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
}
</style>
