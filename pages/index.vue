<script setup lang="ts">
import { products } from "../data/products";

useSeoMeta({
  title: "Lava Bean — Volcanic precision. No noise.",
  description:
    "Rwandan specialty coffee, calibrated to your taste. Traceable beans, measured recipes, no marketing fog.",
});

const stats = [
  { value: "1,900 m", label: "Growing altitude" },
  { value: "3", label: "Signature lots" },
  { value: "28 s", label: "Reference extraction" },
];
</script>

<template>
  <section class="lb-hero">
    <div class="lb-container lb-hero__inner">
      <div class="lb-hero__copy">
        <p class="lb-eyebrow">Rwanda · Washed · Volcanic soil</p>
        <h1 class="lb-hero__title">Coffee,<br />calibrated.</h1>
        <p class="lb-hero__lead">
          We source the bean, measure the extraction and adjust the next cup. No slogans.
          Just provenance you can trace and a recipe that fits you.
        </p>
        <div class="lb-hero__actions">
          <NuxtLink to="/product/virunga-washed" class="lb-hero__button lb-hero__button--primary">
            Shop the bean
          </NuxtLink>
          <a href="#provenance" class="lb-hero__button lb-hero__button--secondary">
            See the source
          </a>
        </div>
      </div>
      <div class="lb-hero__visual" aria-hidden="true">
        <div class="lb-hero__ring" />
        <div class="lb-hero__bean">
          <span class="lb-hero__vein" />
        </div>
        <p class="lb-hero__stamp">LOT 022<br />RWANDA</p>
      </div>
    </div>
  </section>

  <section id="shop" class="lb-section lb-container" aria-labelledby="shop-title">
    <div class="lb-section__head">
      <p class="lb-eyebrow">Current lots</p>
      <h2 id="shop-title" class="lb-section__title">Three beans. Zero guesswork.</h2>
    </div>
    <div class="lb-grid">
      <ProductCard v-for="product in products" :key="product.slug" :product="product" />
    </div>
  </section>

  <section id="provenance" class="lb-provenance">
    <div class="lb-container lb-provenance__inner">
      <div>
        <p class="lb-eyebrow lb-eyebrow--light">Provenance</p>
        <h2 class="lb-provenance__title">From the vulcanic slope to the port of Rotterdam.</h2>
        <p class="lb-provenance__body">
          Our green coffee comes from the volcanic hills of Rwanda and moves through
          HiFanny's European distribution. Every lot carries its altitude, process and
          harvest date before it reaches the roaster.
        </p>
      </div>
      <ul class="lb-stats">
        <li v-for="stat in stats" :key="stat.label">
          <span class="lb-stats__value">{{ stat.value }}</span>
          <span class="lb-stats__label">{{ stat.label }}</span>
        </li>
      </ul>
    </div>
  </section>

  <section id="science" class="lb-section lb-container" aria-labelledby="science-title">
    <div class="lb-science">
      <div>
        <p class="lb-eyebrow">The method</p>
        <h2 id="science-title" class="lb-section__title">Taste is a measurement problem.</h2>
      </div>
      <div class="lb-science__copy">
        <p>
          The machine records dose, yield, time and temperature. Your feedback closes the
          loop, and the next recipe starts from evidence instead of a hunch.
        </p>
        <p>
          The bean stays the hero. Technology only removes the distance between what you
          like and what lands in the cup.
        </p>
      </div>
    </div>
  </section>

  <section class="lb-container">
    <div class="lb-cta">
      <p class="lb-cta__title">Start with the reference lot.</p>
      <NuxtLink to="/product/virunga-washed" class="lb-cta__link">Virunga Washed →</NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.lb-hero {
  overflow: hidden;
  border-bottom: var(--lb-border-hairline) solid var(--lb-color-line);
}

.lb-hero__inner {
  display: grid;
  gap: var(--lb-space-8);
  padding-block: var(--lb-space-8) var(--lb-space-9);
}

.lb-hero__title {
  margin-top: var(--lb-space-3);
  font-size: clamp(var(--lb-text-700), 9vw, var(--lb-text-800));
  line-height: var(--lb-leading-tight);
}

.lb-hero__lead {
  max-width: 34rem;
  margin-top: var(--lb-space-5);
  color: var(--lb-color-muted);
  font-size: var(--lb-text-400);
}

.lb-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--lb-space-3);
  margin-top: var(--lb-space-6);
}

.lb-hero__button {
  display: inline-flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  border-radius: var(--lb-radius-sm);
  padding: var(--lb-space-3) var(--lb-space-6);
  font-size: var(--lb-text-200);
  font-weight: var(--lb-weight-medium);
  letter-spacing: var(--lb-tracking-wide);
  text-decoration: none;
  text-transform: uppercase;
}

.lb-hero__button--primary {
  background: var(--lb-color-ember);
  color: var(--lb-color-ink);
}

.lb-hero__button--primary:hover {
  background: var(--lb-color-lava);
}

.lb-hero__button--secondary {
  border: var(--lb-border-hairline) solid var(--lb-color-ink);
}

.lb-hero__button--secondary:hover {
  background: var(--lb-color-ink);
  color: var(--lb-color-paper);
}

.lb-hero__visual {
  position: relative;
  display: grid;
  min-height: 320px;
  place-items: center;
}

.lb-hero__ring {
  width: min(360px, 80vw);
  aspect-ratio: 1;
  border: var(--lb-border-hairline) solid var(--lb-color-line);
  border-radius: var(--lb-radius-pill);
}

.lb-hero__bean {
  position: absolute;
  width: 150px;
  height: 210px;
  border-radius: 50% 50% 46% 46% / 58% 58% 42% 42%;
  background: var(--lb-color-ink);
  box-shadow: inset 0 0 0 var(--lb-border-strong) var(--lb-color-ember);
}

.lb-hero__vein {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--lb-border-strong);
  height: 150px;
  border-radius: var(--lb-radius-pill);
  background: var(--lb-color-lava);
  transform: translate(-50%, -50%) rotate(7deg);
}

.lb-hero__stamp {
  position: absolute;
  right: var(--lb-space-2);
  bottom: var(--lb-space-2);
  color: var(--lb-color-muted);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  letter-spacing: var(--lb-tracking-wide);
  text-align: right;
}

.lb-section__head {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-2);
  margin-bottom: var(--lb-space-6);
}

.lb-section__title {
  max-width: 20ch;
  font-size: var(--lb-text-600);
}

.lb-provenance {
  margin-block: var(--lb-space-9);
  padding-block: var(--lb-space-8);
  background: var(--lb-color-ink);
  color: var(--lb-color-paper);
}

.lb-provenance__inner {
  display: grid;
  gap: var(--lb-space-7);
}

.lb-eyebrow--light {
  color: var(--lb-color-ember);
}

.lb-provenance__title {
  max-width: 24ch;
  margin-top: var(--lb-space-3);
  font-size: var(--lb-text-600);
}

.lb-provenance__body {
  max-width: 42ch;
  margin-top: var(--lb-space-4);
  color: var(--lb-color-line);
}

.lb-stats {
  display: grid;
  gap: var(--lb-space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.lb-stats li {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-1);
  padding-top: var(--lb-space-3);
  border-top: var(--lb-border-hairline) solid var(--lb-color-muted);
}

.lb-stats__value {
  font-family: var(--lb-font-display);
  font-size: var(--lb-text-600);
  font-weight: var(--lb-weight-bold);
}

.lb-stats__label {
  color: var(--lb-color-line);
  font-size: var(--lb-text-200);
}

.lb-science {
  display: grid;
  gap: var(--lb-space-6);
}

.lb-science__copy {
  display: grid;
  gap: var(--lb-space-4);
  max-width: 54ch;
  color: var(--lb-color-muted);
}

.lb-cta {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-4);
  padding: var(--lb-space-7);
  border-radius: var(--lb-radius-md);
  background: var(--lb-color-ember);
}

.lb-cta__title {
  font-family: var(--lb-font-display);
  font-size: var(--lb-text-500);
  font-weight: var(--lb-weight-bold);
  letter-spacing: var(--lb-tracking-tight);
}

.lb-cta__link {
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-300);
}

@media (min-width: 768px) {
  .lb-hero__inner {
    grid-template-columns: 1.15fr 0.85fr;
    align-items: center;
    padding-block: var(--lb-space-9);
  }

  .lb-provenance__inner {
    grid-template-columns: 1.4fr 0.6fr;
    align-items: start;
  }

  .lb-science {
    grid-template-columns: 0.9fr 1.1fr;
  }

  .lb-cta {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
