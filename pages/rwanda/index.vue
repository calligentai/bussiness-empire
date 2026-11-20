<script setup lang="ts">
import { findProduct } from "../../data/products";

const product = findProduct("virunga-washed");
if (!product) {
  throw createError({ statusCode: 404, statusMessage: "Coffee lot not found" });
}

const price = new Intl.NumberFormat("en-NL", { style: "currency", currency: "EUR" }).format(
  product.priceCents / 100,
);

useSeoMeta({
  title: "Virunga Washed — Single-origin Rwandan arabica | Lava Bean",
  description: `Single-origin, washed arabica from Rwanda, grown at ${product.altitude}. ${product.notes.join(", ")}. ${price} per kilo.`,
});

const specs = [
  { label: "Origin", value: product.origin },
  { label: "Species", value: "Arabica" },
  { label: "Process", value: product.process },
  { label: "Altitude", value: product.altitude },
  { label: "Roast", value: product.roast },
];

const method = [
  {
    title: "Picked ripe",
    body: "Only fully red cherries go in the basket. Ripeness sets the ceiling for sweetness before anything else happens.",
  },
  {
    title: "Pulped the same day",
    body: "The skin and most of the fruit come off within hours, so the seed does not start fermenting on its own terms.",
  },
  {
    title: "Fermented and washed",
    body: "The remaining mucilage breaks down in water, then clean water carries it away. This is what makes the cup clear.",
  },
  {
    title: "Dried slowly",
    body: "Parchment rests on raised beds in the highland air and is turned by hand until it is stable enough to travel.",
  },
];

// One kilo at the reference dose of 12.4 g gives roughly 80 doubles.
const cups = Math.floor(1000 / 12.4);

const faq = [
  {
    q: "What does washed mean for the cup?",
    a: "The fruit is removed before drying. The result is a clean, bright cup where the bean's own sweetness and acidity are easy to taste.",
  },
  {
    q: "Is this espresso or filter coffee?",
    a: `Both work. The reference recipe is an espresso: ${product.recipe}. For filter, start at 60 g per litre and adjust from there.`,
  },
  {
    q: "How much coffee is in a bag?",
    a: `One kilo of whole beans, about ${cups} espressos at the reference dose.`,
  },
  {
    q: "Where is it shipped from?",
    a: "Green coffee travels from Rwanda through our European distribution partner before roasting. Orders ship within Europe.",
  },
];

// Contour rings for the volcano illustration: each ring is a little wider and drifts a little.
const rings = Array.from({ length: 9 }, (_, i) => ({
  rx: 40 + i * 22,
  ry: 26 + i * 15,
  cx: 200 + i * 2.2,
  cy: 200 - i * 1.6,
  rotate: -8 + i * 1.5,
}));
</script>

<template>
  <div class="lb-funnel">
    <!-- 1. Hero -->
    <section class="lb-hero" aria-labelledby="hero-title">
      <div class="lb-container lb-hero__inner">
        <div class="lb-hero__copy">
          <p class="lb-kicker">Single origin · Washed · Arabica</p>
          <h1 id="hero-title" class="lb-hero__title">
            Rwanda,<br />
            <span class="lb-hero__accent">at {{ product.altitude }}.</span>
          </h1>
          <p class="lb-hero__lead">
            {{ product.name }} grows on volcanic hillsides in Rwanda's highlands. It is washed for
            clarity and roasted to taste of {{ product.notes.join(", ").toLowerCase() }}.
          </p>
          <div class="lb-hero__actions">
            <NuxtLink to="/rwanda/select" class="lb-pill lb-pill--primary">
              Reserve a bag · {{ price }}
            </NuxtLink>
            <a href="#origin" class="lb-pill lb-pill--ghost">Read the origin</a>
          </div>
          <p class="lb-hero__note">1 kg whole bean · about {{ cups }} espressos</p>
        </div>

        <figure class="lb-hero__art" aria-hidden="true">
          <svg viewBox="0 0 400 400" class="lb-contours">
            <ellipse
              v-for="(ring, i) in rings"
              :key="i"
              :cx="ring.cx"
              :cy="ring.cy"
              :rx="ring.rx"
              :ry="ring.ry"
              :transform="`rotate(${ring.rotate} ${ring.cx} ${ring.cy})`"
              :class="{ 'is-summit': i === 0 }"
            />
          </svg>
          <figcaption class="lb-hero__tag">
            <span>LOT · {{ product.name.toUpperCase() }}</span>
            <span>{{ product.altitude }} · {{ product.process.toUpperCase() }}</span>
          </figcaption>
        </figure>
      </div>

      <dl class="lb-container lb-specs">
        <div v-for="spec in specs" :key="spec.label" class="lb-specs__item">
          <dt>{{ spec.label }}</dt>
          <dd>{{ spec.value }}</dd>
        </div>
      </dl>
    </section>

    <!-- 2. Origin -->
    <section id="origin" class="lb-band lb-band--paper" aria-labelledby="origin-title">
      <div class="lb-container lb-split">
        <div>
          <p class="lb-kicker lb-kicker--dark">The origin</p>
          <h2 id="origin-title" class="lb-h2">Altitude does the slow work.</h2>
        </div>
        <div class="lb-prose">
          <p>
            At {{ product.altitude }} the nights are cool, so the cherry ripens slowly. A slower
            ripening gives the seed more time to build the sugars you later taste as sweetness.
          </p>
          <p>
            Volcanic soil drains well and holds minerals. Together with the altitude, it gives
            Rwandan coffee its reputation for bright acidity and a clean, structured finish.
          </p>
        </div>
      </div>
    </section>

    <!-- 3. Method -->
    <section class="lb-band lb-band--parchment" aria-labelledby="method-title">
      <div class="lb-container">
        <p class="lb-kicker lb-kicker--dark">The washed method</p>
        <h2 id="method-title" class="lb-h2">Four steps between the tree and the cup.</h2>
        <ol class="lb-method">
          <li v-for="(step, i) in method" :key="step.title" class="lb-method__step">
            <span class="lb-method__n">0{{ i + 1 }}</span>
            <h3 class="lb-method__title">{{ step.title }}</h3>
            <p class="lb-method__body">{{ step.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- 4. Taste -->
    <section class="lb-band lb-band--ink" aria-labelledby="taste-title">
      <div class="lb-container">
        <p class="lb-kicker">In the cup</p>
        <h2 id="taste-title" class="lb-h2 lb-h2--light">Three notes. Nothing added.</h2>
        <ul class="lb-notes">
          <li v-for="(note, i) in product.notes" :key="note" class="lb-notes__item">
            <span class="lb-notes__n">{{ ["First sip", "Middle", "Finish"][i] ?? "" }}</span>
            <span class="lb-notes__name">{{ note }}</span>
          </li>
        </ul>
        <div class="lb-recipe">
          <p class="lb-kicker">Reference recipe</p>
          <p class="lb-recipe__value">{{ product.recipe }}</p>
          <p class="lb-recipe__hint">Start here. Grind finer if it runs fast, coarser if it runs slow.</p>
        </div>
      </div>
    </section>

    <!-- 5. Offer -->
    <section class="lb-band lb-band--paper" aria-labelledby="offer-title">
      <div class="lb-container">
        <div class="lb-offer">
          <div class="lb-offer__copy">
            <p class="lb-kicker lb-kicker--dark">The bag</p>
            <h2 id="offer-title" class="lb-h2">{{ product.name }}</h2>
            <p class="lb-offer__body">
              One kilo of whole-bean, single-origin washed arabica. Roasted {{ product.roast.toLowerCase() }}.
            </p>
          </div>
          <div class="lb-offer__buy">
            <p class="lb-offer__price">
              {{ price }}<span class="lb-offer__unit"> / kg</span>
            </p>
            <NuxtLink to="/rwanda/select" class="lb-pill lb-pill--primary lb-pill--block">
              Choose your bag
            </NuxtLink>
            <p class="lb-offer__fine">Next: pick how many. You can review everything before paying.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 6. FAQ -->
    <section class="lb-band lb-band--parchment" aria-labelledby="faq-title">
      <div class="lb-container lb-split">
        <div>
          <p class="lb-kicker lb-kicker--dark">Questions</p>
          <h2 id="faq-title" class="lb-h2">Before you order.</h2>
        </div>
        <div class="lb-faq">
          <details v-for="item in faq" :key="item.q" class="lb-faq__item">
            <summary class="lb-faq__q">{{ item.q }}</summary>
            <p class="lb-faq__a">{{ item.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- 7. Closing CTA -->
    <section class="lb-band lb-band--ink lb-close" aria-labelledby="close-title">
      <div class="lb-container lb-close__inner">
        <h2 id="close-title" class="lb-close__title">Taste the hillside.</h2>
        <NuxtLink to="/rwanda/select" class="lb-pill lb-pill--primary">
          Reserve a bag · {{ price }}
        </NuxtLink>
      </div>
    </section>

    <!-- Sticky mobile buy bar -->
    <div class="lb-buybar" role="region" aria-label="Quick purchase">
      <div class="lb-buybar__text">
        <span class="lb-buybar__name">{{ product.name }}</span>
        <span class="lb-buybar__price">{{ price }} / kg</span>
      </div>
      <NuxtLink to="/rwanda/select" class="lb-pill lb-pill--primary">Reserve</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
/* ---------- shared ---------- */
.lb-kicker {
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
  color: var(--lb-color-ember);
}

.lb-kicker--dark {
  color: var(--lb-color-muted);
}

.lb-h2 {
  max-width: 18ch;
  margin-top: var(--lb-space-3);
  font-size: clamp(var(--lb-text-600), 5vw, var(--lb-text-700));
  line-height: var(--lb-leading-tight);
}

.lb-h2--light {
  color: var(--lb-color-paper);
}

.lb-pill {
  display: inline-flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  border: var(--lb-border-hairline) solid transparent;
  border-radius: var(--lb-radius-pill);
  padding: var(--lb-space-3) var(--lb-space-6);
  font-size: var(--lb-text-300);
  font-weight: var(--lb-weight-semibold);
  text-decoration: none;
  white-space: nowrap;
  transition:
    background-color var(--lb-motion-base) var(--lb-motion-ease),
    color var(--lb-motion-base) var(--lb-motion-ease),
    transform var(--lb-motion-fast) var(--lb-motion-ease);
}

.lb-pill:active {
  transform: scale(0.97);
}

.lb-pill--primary {
  background: var(--lb-color-ember);
  color: var(--lb-color-ink);
}

.lb-pill--primary:hover {
  background: var(--lb-color-paper);
}

.lb-pill--ghost {
  border-color: color-mix(in srgb, var(--lb-color-paper) 40%, transparent);
  color: var(--lb-color-paper);
}

.lb-pill--ghost:hover {
  border-color: var(--lb-color-paper);
}

.lb-pill--block {
  width: 100%;
}

.lb-band {
  padding-block: var(--lb-space-9);
}

.lb-band--paper {
  background: var(--lb-color-paper);
}

.lb-band--parchment {
  background: color-mix(in srgb, var(--lb-color-line) 45%, var(--lb-color-paper));
}

.lb-band--ink {
  background: var(--lb-color-ink);
  color: var(--lb-color-paper);
}

.lb-split {
  display: grid;
  gap: var(--lb-space-6);
}

.lb-prose {
  display: grid;
  gap: var(--lb-space-4);
  max-width: 56ch;
  color: var(--lb-color-muted);
  font-size: var(--lb-text-400);
  line-height: var(--lb-leading-body);
}

/* ---------- hero ---------- */
.lb-hero {
  overflow: hidden;
  background: var(--lb-color-ink);
  color: var(--lb-color-paper);
}

.lb-hero__inner {
  display: grid;
  gap: var(--lb-space-7);
  padding-block: var(--lb-space-8) var(--lb-space-7);
}

.lb-hero__copy {
  animation: lb-rise 700ms var(--lb-motion-ease) both;
}

.lb-hero__title {
  margin-top: var(--lb-space-4);
  font-size: clamp(var(--lb-text-700), 10vw, 96px);
  line-height: 1;
  letter-spacing: -0.035em;
}

.lb-hero__accent {
  color: var(--lb-color-ember);
}

.lb-hero__lead {
  max-width: 40ch;
  margin-top: var(--lb-space-5);
  color: var(--lb-color-line);
  font-size: var(--lb-text-400);
}

.lb-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--lb-space-3);
  margin-top: var(--lb-space-6);
}

.lb-hero__note {
  margin-top: var(--lb-space-4);
  color: var(--lb-color-line);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
}

.lb-hero__art {
  position: relative;
  margin: 0;
  animation: lb-fade 1200ms var(--lb-motion-ease) 200ms both;
}

.lb-contours {
  width: 100%;
  max-width: 520px;
  margin-inline: auto;
}

.lb-contours ellipse {
  fill: none;
  stroke: color-mix(in srgb, var(--lb-color-paper) 22%, transparent);
  stroke-width: 1;
}

.lb-contours ellipse.is-summit {
  fill: var(--lb-color-ember);
  stroke: none;
}

.lb-hero__tag {
  position: absolute;
  right: 0;
  bottom: 0;
  display: grid;
  gap: var(--lb-space-1);
  color: var(--lb-color-line);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  letter-spacing: var(--lb-tracking-wide);
  text-align: right;
}

.lb-specs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
  margin-block: 0;
  padding-bottom: var(--lb-space-7);
}

.lb-specs__item {
  padding-block: var(--lb-space-4);
  border-top: var(--lb-border-hairline) solid color-mix(in srgb, var(--lb-color-paper) 18%, transparent);
}

.lb-specs dt {
  color: var(--lb-color-line);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
}

.lb-specs dd {
  margin: var(--lb-space-1) 0 0;
  font-family: var(--lb-font-display);
  font-size: var(--lb-text-400);
  font-weight: var(--lb-weight-bold);
}

/* ---------- method ---------- */
.lb-method {
  display: grid;
  gap: var(--lb-space-6);
  margin: var(--lb-space-8) 0 0;
  padding: 0;
  list-style: none;
}

.lb-method__step {
  padding-top: var(--lb-space-4);
  border-top: var(--lb-border-hairline) solid var(--lb-color-ink);
}

.lb-method__n {
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-200);
  color: var(--lb-color-muted);
}

.lb-method__title {
  margin-top: var(--lb-space-3);
  font-size: var(--lb-text-500);
}

.lb-method__body {
  margin-top: var(--lb-space-3);
  color: var(--lb-color-muted);
}

/* ---------- taste ---------- */
.lb-notes {
  display: grid;
  margin: var(--lb-space-8) 0 0;
  padding: 0;
  list-style: none;
}

.lb-notes__item {
  display: grid;
  gap: var(--lb-space-2);
  padding-block: var(--lb-space-5);
  border-top: var(--lb-border-hairline) solid color-mix(in srgb, var(--lb-color-paper) 18%, transparent);
}

.lb-notes__n {
  color: var(--lb-color-ember);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
}

.lb-notes__name {
  font-family: var(--lb-font-display);
  font-size: clamp(var(--lb-text-600), 7vw, var(--lb-text-800));
  font-weight: var(--lb-weight-bold);
  letter-spacing: var(--lb-tracking-tight);
  line-height: var(--lb-leading-tight);
}

.lb-recipe {
  margin-top: var(--lb-space-8);
  padding: var(--lb-space-6);
  border-radius: var(--lb-radius-md);
  background: var(--lb-color-surface);
}

.lb-recipe__value {
  margin-top: var(--lb-space-3);
  font-family: var(--lb-font-mono);
  font-size: clamp(var(--lb-text-400), 3.4vw, var(--lb-text-600));
}

.lb-recipe__hint {
  margin-top: var(--lb-space-3);
  color: var(--lb-color-line);
}

/* ---------- offer ---------- */
.lb-offer {
  display: grid;
  gap: var(--lb-space-6);
  padding: var(--lb-space-6);
  border: var(--lb-border-hairline) solid var(--lb-color-line);
  border-radius: var(--lb-radius-md);
}

.lb-offer__body {
  max-width: 42ch;
  margin-top: var(--lb-space-4);
  color: var(--lb-color-muted);
  font-size: var(--lb-text-400);
}

.lb-offer__buy {
  display: grid;
  gap: var(--lb-space-4);
  align-content: start;
}

.lb-offer__price {
  font-family: var(--lb-font-display);
  font-size: var(--lb-text-700);
  font-weight: var(--lb-weight-bold);
  letter-spacing: var(--lb-tracking-tight);
  line-height: var(--lb-leading-tight);
}

.lb-offer__unit {
  color: var(--lb-color-muted);
  font-size: var(--lb-text-400);
  font-weight: var(--lb-weight-regular);
}

.lb-offer__fine {
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

/* ---------- faq ---------- */
.lb-faq {
  border-bottom: var(--lb-border-hairline) solid var(--lb-color-ink);
}

.lb-faq__item {
  border-top: var(--lb-border-hairline) solid var(--lb-color-ink);
}

.lb-faq__q {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: var(--lb-space-4);
  font-family: var(--lb-font-display);
  font-size: var(--lb-text-400);
  font-weight: var(--lb-weight-bold);
  list-style: none;
  cursor: pointer;
}

.lb-faq__q::-webkit-details-marker {
  display: none;
}

.lb-faq__q::after {
  content: "+";
  font-family: var(--lb-font-mono);
  font-weight: var(--lb-weight-regular);
  transition: transform var(--lb-motion-base) var(--lb-motion-ease);
}

.lb-faq__item[open] .lb-faq__q::after {
  transform: rotate(45deg);
}

.lb-faq__a {
  max-width: 56ch;
  padding-bottom: var(--lb-space-5);
  color: var(--lb-color-muted);
}

/* ---------- close ---------- */
.lb-close {
  padding-bottom: calc(var(--lb-space-9) + var(--lb-space-8));
}

.lb-close__inner {
  display: grid;
  justify-items: start;
  gap: var(--lb-space-6);
}

.lb-close__title {
  font-size: clamp(var(--lb-text-700), 9vw, 96px);
  line-height: 1;
  letter-spacing: -0.035em;
}

/* ---------- buy bar (floating glass, mobile only) ---------- */
.lb-buybar {
  position: fixed;
  right: var(--lb-space-3);
  bottom: var(--lb-space-3);
  left: var(--lb-space-3);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--lb-space-3);
  padding: var(--lb-space-2) var(--lb-space-2) var(--lb-space-2) var(--lb-space-5);
  border: var(--lb-border-hairline) solid color-mix(in srgb, var(--lb-color-paper) 16%, transparent);
  border-radius: var(--lb-radius-pill);
  background: color-mix(in srgb, var(--lb-color-ink) 82%, transparent);
  color: var(--lb-color-paper);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  backdrop-filter: blur(24px) saturate(1.6);
}

.lb-buybar__text {
  display: grid;
}

.lb-buybar__name {
  font-weight: var(--lb-weight-semibold);
}

.lb-buybar__price {
  color: var(--lb-color-line);
  font-size: var(--lb-text-200);
}

/* ---------- motion ---------- */
@keyframes lb-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

@keyframes lb-fade {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lb-hero__copy,
  .lb-hero__art {
    animation: none;
  }

  .lb-pill,
  .lb-faq__q::after {
    transition: none;
  }
}

/* ---------- breakpoints ---------- */
@media (min-width: 768px) {
  .lb-container {
    padding-inline: var(--lb-grid-margin-desktop);
  }

  .lb-hero__inner {
    grid-template-columns: 1.1fr 0.9fr;
    align-items: center;
    padding-block: var(--lb-space-9);
  }

  .lb-specs {
    grid-template-columns: repeat(5, 1fr);
    column-gap: var(--lb-space-5);
  }

  .lb-split {
    grid-template-columns: 0.9fr 1.1fr;
    gap: var(--lb-space-8);
  }

  .lb-method {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--lb-space-5);
  }

  .lb-notes {
    grid-template-columns: repeat(3, 1fr);
    column-gap: var(--lb-space-5);
  }

  .lb-offer {
    grid-template-columns: 1.4fr 1fr;
    padding: var(--lb-space-8);
  }

  .lb-close {
    padding-bottom: var(--lb-space-9);
  }

  .lb-close__inner {
    grid-template-columns: 1fr auto;
    align-items: end;
  }

  .lb-buybar {
    display: none;
  }
}
</style>
