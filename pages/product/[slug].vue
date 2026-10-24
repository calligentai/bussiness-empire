<script setup lang="ts">
import { findProduct } from "../../data/products";
import { useCart } from "../../composables/useCart";

const route = useRoute();
const product = findProduct(String(route.params.slug));

if (!product) {
  throw createError({ statusCode: 404, statusMessage: "Coffee lot not found" });
}

useSeoMeta({
  title: `${product.name} — Lava Bean`,
  description: `${product.name}: ${product.origin} ${product.process}, ${product.notes.join(", ")}.`,
});

const price = new Intl.NumberFormat("en-NL", {
  style: "currency",
  currency: "EUR",
}).format(product.priceCents / 100);

const facts = computed(() => [
  { label: "Origin", value: product.origin },
  { label: "Process", value: product.process },
  { label: "Altitude", value: product.altitude },
  { label: "Roast", value: product.roast },
  { label: "Reference recipe", value: product.recipe },
]);

const { addItem } = useCart();
const added = ref(false);
const addToCart = () => {
  addItem({ slug: product.slug, name: product.name, priceCents: product.priceCents });
  added.value = true;
  setTimeout(() => (added.value = false), 2000);
};
</script>

<template>
  <article class="lb-product lb-container">
    <nav class="lb-breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/">Home</NuxtLink>
      <span aria-hidden="true">/</span>
      <NuxtLink to="/#shop">Shop</NuxtLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{{ product.name }}</span>
    </nav>

    <div class="lb-product__grid">
      <div class="lb-product__visual" aria-hidden="true">
        <span class="lb-product__lot">LOT 022</span>
        <div class="lb-product__bean"><span /></div>
      </div>

      <div class="lb-product__details">
        <p class="lb-eyebrow">{{ product.origin }} · {{ product.process }} · {{ product.altitude }}</p>
        <h1 class="lb-product__title">{{ product.name }}</h1>
        <p class="lb-product__notes">{{ product.notes.join(" · ") }}</p>
        <p class="lb-product__price">{{ price }} <span>/ 250 g</span></p>

        <LavaButton size="lg" @click="addToCart">Add to cart</LavaButton>
        <p v-if="added" class="lb-product__added">Added to cart</p>

        <p class="lb-product__shipping">
          Roasted to order. Ships within two working days from the Netherlands.
        </p>

        <dl class="lb-facts">
          <div v-for="fact in facts" :key="fact.label" class="lb-facts__row">
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <section class="lb-product__story" aria-labelledby="story-title">
      <p class="lb-eyebrow">Why this lot</p>
      <h2 id="story-title">Grown on basalt, roasted for clarity.</h2>
      <p>
        {{ product.name }} comes from smallholder plots on Rwanda's volcanic slopes. The
        {{ product.process.toLowerCase() }} process protects the fruit character while the
        medium-dark development keeps the cup grounded. Expect
        {{ product.notes.join(", ").toLowerCase() }}.
      </p>
    </section>
  </article>
</template>

<style scoped>
.lb-product {
  padding-block: var(--lb-space-6) var(--lb-space-9);
}

.lb-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: var(--lb-space-2);
  color: var(--lb-color-muted);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
}

.lb-breadcrumb a {
  text-decoration: none;
}

.lb-breadcrumb a:hover {
  color: var(--lb-color-lava);
}

.lb-product__grid {
  display: grid;
  gap: var(--lb-space-7);
  margin-top: var(--lb-space-6);
}

.lb-product__visual {
  position: relative;
  display: grid;
  min-height: 380px;
  place-items: center;
  border-radius: var(--lb-radius-md);
  background: var(--lb-color-surface);
  overflow: hidden;
}

.lb-product__lot {
  position: absolute;
  top: var(--lb-space-5);
  left: var(--lb-space-5);
  color: var(--lb-color-ember);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  letter-spacing: var(--lb-tracking-wide);
}

.lb-product__bean {
  width: 190px;
  height: 260px;
  border-radius: 50% 50% 46% 46% / 58% 58% 42% 42%;
  background: var(--lb-color-ink);
  box-shadow: inset 0 0 0 var(--lb-border-strong) var(--lb-color-ember);
}

.lb-product__bean span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--lb-border-strong);
  height: 185px;
  border-radius: var(--lb-radius-pill);
  background: var(--lb-color-lava);
  transform: translate(-50%, -50%) rotate(7deg);
}

.lb-product__details {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-4);
}

.lb-product__title {
  font-size: clamp(var(--lb-text-600), 6vw, var(--lb-text-700));
  line-height: var(--lb-leading-tight);
}

.lb-product__notes {
  color: var(--lb-color-muted);
  font-size: var(--lb-text-400);
}

.lb-product__price {
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-500);
}

.lb-product__price span {
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

.lb-product__shipping {
  max-width: 40ch;
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

.lb-facts {
  margin: var(--lb-space-4) 0 0;
  border-top: var(--lb-border-hairline) solid var(--lb-color-line);
}

.lb-facts__row {
  display: flex;
  justify-content: space-between;
  gap: var(--lb-space-4);
  padding-block: var(--lb-space-3);
  border-bottom: var(--lb-border-hairline) solid var(--lb-color-line);
  font-size: var(--lb-text-200);
}

.lb-facts dt {
  color: var(--lb-color-muted);
}

.lb-facts dd {
  margin: 0;
  font-family: var(--lb-font-mono);
  text-align: right;
}

.lb-product__story {
  max-width: 62ch;
  margin-top: var(--lb-space-9);
}

.lb-product__story h2 {
  margin-block: var(--lb-space-2) var(--lb-space-4);
  font-size: var(--lb-text-500);
}

.lb-product__story p:last-child {
  color: var(--lb-color-muted);
}

@media (min-width: 768px) {
  .lb-product__grid {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }

  .lb-product__visual {
    min-height: 520px;
  }
}
</style>
