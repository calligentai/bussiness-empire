<script setup lang="ts">
import type { Product } from "../types/product";

defineProps<{ product: Product }>();

const price = (cents: number) =>
  new Intl.NumberFormat("en-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
</script>

<template>
  <article class="lb-card">
    <div class="lb-card__visual" aria-hidden="true">
      <span class="lb-card__roast">{{ product.roast }}</span>
      <span class="lb-card__bean" />
    </div>
    <div class="lb-card__body">
      <p class="lb-eyebrow">{{ product.origin }} · {{ product.process }}</p>
      <h3 class="lb-card__name">
        <NuxtLink :to="`/product/${product.slug}`">{{ product.name }}</NuxtLink>
      </h3>
      <p class="lb-card__notes">{{ product.notes.join(" · ") }}</p>
      <p class="lb-card__price">{{ price(product.priceCents) }}</p>
    </div>
  </article>
</template>

<style scoped>
.lb-card {
  display: flex;
  flex-direction: column;
  border: var(--lb-border-hairline) solid var(--lb-color-line);
  border-radius: var(--lb-radius-md);
  background: var(--lb-color-paper);
  overflow: hidden;
}

.lb-card__visual {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 180px;
  background: var(--lb-color-surface);
}

.lb-card__bean {
  width: 86px;
  height: 118px;
  border-radius: 50% 50% 46% 46% / 58% 58% 42% 42%;
  background: var(--lb-color-ink);
  box-shadow: inset 0 0 0 var(--lb-border-hairline) var(--lb-color-ember);
}

.lb-card__bean::after {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(7deg);
}

.lb-card__bean::after {
  content: "";
  position: absolute;
  width: var(--lb-border-strong);
  height: 72px;
  background: var(--lb-color-lava);
  border-radius: var(--lb-radius-pill);
  transform: rotate(7deg);
}

.lb-card__roast {
  position: absolute;
  top: var(--lb-space-3);
  left: var(--lb-space-4);
  color: var(--lb-color-ember);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
}

.lb-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--lb-space-2);
  padding: var(--lb-space-5);
}

.lb-card__name {
  font-size: var(--lb-text-500);
}

.lb-card__name a {
  text-decoration: none;
}

.lb-card__name a:hover {
  text-decoration: underline;
}

.lb-card__notes {
  color: var(--lb-color-muted);
}

.lb-card__price {
  margin-top: auto;
  padding-top: var(--lb-space-3);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-200);
}
</style>
