<script setup lang="ts">
import { computed, ref } from "vue";
import { findProduct } from "../../data/products";
import { useCart } from "../../composables/useCart";

const product = findProduct("virunga-washed");
if (!product) {
  throw createError({ statusCode: 404, statusMessage: "Coffee lot not found" });
}

useSeoMeta({
  title: "Choose your bag — Virunga Washed | Lava Bean",
  description: "Pick how many kilos of single-origin washed Rwandan arabica you want.",
});

const money = (cents: number) =>
  new Intl.NumberFormat("en-NL", { style: "currency", currency: "EUR" }).format(cents / 100);

const CUPS_PER_KG = Math.floor(1000 / 12.4);

const options = [
  { kilos: 1, label: "One bag", hint: "Try the lot" },
  { kilos: 2, label: "Two bags", hint: "A month for two" },
  { kilos: 3, label: "Three bags", hint: "For the office or the café" },
];

const kilos = ref(1);
const totalCents = computed(() => product.priceCents * kilos.value);

const { addItem } = useCart();
const submitting = ref(false);

const continueToCheckout = async () => {
  submitting.value = true;
  addItem(
    { slug: product.slug, name: product.name, priceCents: product.priceCents },
    kilos.value,
  );
  await navigateTo("/checkout");
};
</script>

<template>
  <article class="lb-select lb-container">
    <FunnelSteps :current="2" class="lb-select__steps" />

    <div class="lb-select__grid">
      <header class="lb-select__head">
        <p class="lb-select__kicker">Single origin · Washed · Arabica</p>
        <h1 class="lb-select__title">How much {{ product.name }}?</h1>
        <p class="lb-select__lead">
          Whole bean, 1 kg per bag. Grown at {{ product.altitude }} in {{ product.origin }}.
          Tastes of {{ product.notes.join(", ").toLowerCase() }}.
        </p>
      </header>

      <form class="lb-select__form" @submit.prevent="continueToCheckout">
        <fieldset class="lb-choices">
          <legend class="lb-choices__legend">Quantity</legend>
          <label
            v-for="option in options"
            :key="option.kilos"
            class="lb-choice"
            :class="{ 'is-selected': kilos === option.kilos }"
          >
            <input v-model="kilos" type="radio" name="kilos" :value="option.kilos" class="lb-choice__input" />
            <span class="lb-choice__radio" aria-hidden="true" />
            <span class="lb-choice__text">
              <span class="lb-choice__label">{{ option.label }} · {{ option.kilos }} kg</span>
              <span class="lb-choice__hint">
                {{ option.hint }} · about {{ CUPS_PER_KG * option.kilos }} espressos
              </span>
            </span>
            <span class="lb-choice__price">{{ money(product.priceCents * option.kilos) }}</span>
          </label>
        </fieldset>

        <div class="lb-summary" aria-live="polite">
          <div class="lb-summary__row">
            <span>{{ product.name }} × {{ kilos }}</span>
            <span>{{ money(totalCents) }}</span>
          </div>
          <div class="lb-summary__row lb-summary__row--total">
            <span>Total</span>
            <span>{{ money(totalCents) }}</span>
          </div>
          <p class="lb-summary__fine">You can review your order before you pay.</p>
        </div>

        <button type="submit" class="lb-select__cta" :disabled="submitting">
          {{ submitting ? "Opening checkout…" : `Continue to checkout · ${money(totalCents)}` }}
        </button>
        <NuxtLink to="/rwanda" class="lb-select__back">Back to the origin story</NuxtLink>
      </form>
    </div>
  </article>
</template>

<style scoped>
.lb-select {
  padding-block: var(--lb-space-6) var(--lb-space-9);
}

.lb-select__steps {
  max-width: 560px;
}

.lb-select__grid {
  display: grid;
  gap: var(--lb-space-7);
  margin-top: var(--lb-space-7);
}

.lb-select__kicker {
  color: var(--lb-color-muted);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
}

.lb-select__title {
  max-width: 14ch;
  margin-top: var(--lb-space-3);
  font-size: clamp(var(--lb-text-600), 6vw, var(--lb-text-800));
  line-height: var(--lb-leading-tight);
}

.lb-select__lead {
  max-width: 40ch;
  margin-top: var(--lb-space-4);
  color: var(--lb-color-muted);
  font-size: var(--lb-text-400);
}

.lb-select__form {
  display: grid;
  gap: var(--lb-space-5);
  align-content: start;
}

.lb-choices {
  display: grid;
  gap: var(--lb-space-3);
  margin: 0;
  padding: 0;
  border: 0;
}

.lb-choices__legend {
  margin-bottom: var(--lb-space-3);
  font-weight: var(--lb-weight-semibold);
}

.lb-choice {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--lb-space-4);
  min-height: 72px;
  padding: var(--lb-space-4) var(--lb-space-5);
  border: var(--lb-border-hairline) solid var(--lb-color-line);
  border-radius: var(--lb-radius-md);
  cursor: pointer;
  transition:
    border-color var(--lb-motion-base) var(--lb-motion-ease),
    background-color var(--lb-motion-base) var(--lb-motion-ease);
}

.lb-choice:hover {
  border-color: var(--lb-color-muted);
}

.lb-choice.is-selected {
  border: var(--lb-border-strong) solid var(--lb-color-ink);
  padding: calc(var(--lb-space-4) - 1px) calc(var(--lb-space-5) - 1px);
  background: var(--lb-color-white);
}

.lb-choice__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.lb-choice:has(.lb-choice__input:focus-visible) {
  outline: var(--lb-border-strong) solid var(--lb-color-ink);
  outline-offset: var(--lb-space-1);
}

.lb-choice__radio {
  width: 20px;
  height: 20px;
  border: var(--lb-border-strong) solid var(--lb-color-muted);
  border-radius: var(--lb-radius-pill);
}

.is-selected .lb-choice__radio {
  border: 6px solid var(--lb-color-ink);
}

.lb-choice__text {
  display: grid;
  gap: var(--lb-space-1);
}

.lb-choice__label {
  font-weight: var(--lb-weight-semibold);
}

.lb-choice__hint {
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

.lb-choice__price {
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-300);
}

.lb-summary {
  display: grid;
  gap: var(--lb-space-3);
  padding: var(--lb-space-5);
  border-radius: var(--lb-radius-md);
  background: color-mix(in srgb, var(--lb-color-line) 45%, var(--lb-color-paper));
}

.lb-summary__row {
  display: flex;
  justify-content: space-between;
  gap: var(--lb-space-4);
}

.lb-summary__row--total {
  padding-top: var(--lb-space-3);
  border-top: var(--lb-border-hairline) solid var(--lb-color-line);
  font-family: var(--lb-font-display);
  font-size: var(--lb-text-400);
  font-weight: var(--lb-weight-bold);
}

.lb-summary__fine {
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

.lb-select__cta {
  min-height: 56px;
  border: 0;
  border-radius: var(--lb-radius-pill);
  padding: var(--lb-space-3) var(--lb-space-6);
  background: var(--lb-color-ember);
  color: var(--lb-color-ink);
  font-family: var(--lb-font-body);
  font-size: var(--lb-text-300);
  font-weight: var(--lb-weight-semibold);
  cursor: pointer;
  transition:
    background-color var(--lb-motion-base) var(--lb-motion-ease),
    transform var(--lb-motion-fast) var(--lb-motion-ease);
}

.lb-select__cta:hover {
  background: var(--lb-color-ink);
  color: var(--lb-color-paper);
}

.lb-select__cta:active {
  transform: scale(0.97);
}

.lb-select__cta:disabled {
  cursor: progress;
  opacity: 0.7;
}

.lb-select__back {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-self: center;
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

@media (prefers-reduced-motion: reduce) {
  .lb-choice,
  .lb-select__cta {
    transition: none;
  }
}

@media (min-width: 768px) {
  .lb-select {
    padding-inline: var(--lb-grid-margin-desktop);
  }

  .lb-select__grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--lb-space-9);
    margin-top: var(--lb-space-8);
  }

  .lb-select__head {
    position: sticky;
    top: var(--lb-space-9);
    align-self: start;
  }
}
</style>
