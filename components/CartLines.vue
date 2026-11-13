<script setup lang="ts">
import { computed } from "vue";
import type { CartItem } from "../types/order";
import { formatEur } from "../utils/money";

const props = withDefaults(
  defineProps<{
    items: CartItem[];
    totalTestId?: string;
  }>(),
  { totalTestId: "cart-total" },
);

const emit = defineEmits<{
  setQuantity: [slug: string, quantity: number];
}>();

const subtotalCents = computed(() =>
  props.items.reduce((total, item) => total + item.priceCents * item.quantity, 0),
);
</script>

<template>
  <ul class="lb-lines">
    <li v-for="item in items" :key="item.slug" class="lb-lines__row">
      <p class="lb-lines__name">{{ item.name }}</p>
      <div class="lb-lines__qty">
        <LavaButton
          type="button"
          variant="secondary"
          :aria-label="`Decrease quantity of ${item.name}`"
          @click="emit('setQuantity', item.slug, item.quantity - 1)"
        >
          −
        </LavaButton>
        <span>{{ item.quantity }}</span>
        <LavaButton
          type="button"
          variant="secondary"
          :aria-label="`Increase quantity of ${item.name}`"
          @click="emit('setQuantity', item.slug, item.quantity + 1)"
        >
          +
        </LavaButton>
      </div>
      <p class="lb-lines__amount">{{ formatEur(item.priceCents * item.quantity) }}</p>
    </li>
  </ul>
  <p class="lb-lines__total">
    Total
    <strong :data-testid="totalTestId">{{ formatEur(subtotalCents) }}</strong>
  </p>
</template>

<style scoped>
.lb-lines {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-4);
  margin: var(--lb-space-5) 0;
  padding: 0;
  list-style: none;
}

.lb-lines__row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--lb-space-3);
  align-items: center;
  padding-bottom: var(--lb-space-4);
  border-bottom: var(--lb-border-hairline) solid var(--lb-color-line);
}

.lb-lines__name {
  grid-column: 1 / -1;
}

.lb-lines__qty {
  display: flex;
  align-items: center;
  gap: var(--lb-space-3);
  font-family: var(--lb-font-mono);
}

.lb-lines__amount,
.lb-lines__total strong {
  font-family: var(--lb-font-mono);
}

.lb-lines__total {
  display: flex;
  justify-content: space-between;
  gap: var(--lb-space-4);
  margin-bottom: var(--lb-space-5);
  font-size: var(--lb-text-400);
}
</style>
