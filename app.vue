<script setup lang="ts">
import { useCart } from "./composables/useCart";

const navigation = [
  { label: "Shop", to: "/#shop" },
  { label: "Provenance", to: "/#provenance" },
  { label: "Science", to: "/#science" },
];

const { itemCount } = useCart();
</script>

<template>
  <a class="lb-skip" href="#main">Skip to content</a>
  <header class="lb-header">
    <div class="lb-container lb-header__inner">
      <NuxtLink to="/" class="lb-header__brand" aria-label="Lava Bean home">
        <BrandMark :size="34" />
        <span>Lava Bean</span>
      </NuxtLink>
      <nav aria-label="Primary">
        <ul class="lb-header__nav">
          <li v-for="item in navigation" :key="item.label" class="lb-header__nav-section">
            <a :href="item.to">{{ item.label }}</a>
          </li>
          <li>
            <NuxtLink to="/checkout" class="lb-header__checkout">
              Checkout
              <ClientOnly>
                <span v-if="itemCount > 0" class="lb-header__count">{{ itemCount }}</span>
              </ClientOnly>
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <NuxtLink to="/product/virunga-washed" class="lb-header__cta">Shop the bean</NuxtLink>
    </div>
  </header>

  <main id="main">
    <NuxtPage />
  </main>

  <footer class="lb-footer">
    <div class="lb-container lb-footer__inner">
      <div>
        <p class="lb-footer__brand">Lava Bean</p>
        <p class="lb-footer__note">Volcanic precision. No noise.</p>
      </div>
      <p class="lb-footer__legal">Business Empire · LAVABEAN-PLATFORM · Rwanda → Europe</p>
    </div>
  </footer>
</template>

<style scoped>
.lb-skip {
  position: absolute;
  top: var(--lb-space-2);
  left: var(--lb-space-2);
  z-index: 10;
  padding: var(--lb-space-2) var(--lb-space-4);
  background: var(--lb-color-ink);
  color: var(--lb-color-paper);
  transform: translateY(-160%);
}

.lb-skip:focus {
  transform: none;
}

.lb-header {
  position: sticky;
  top: 0;
  z-index: 5;
  border-bottom: var(--lb-border-hairline) solid var(--lb-color-line);
  background: var(--lb-color-paper);
}

.lb-header__inner {
  display: flex;
  min-height: 68px;
  align-items: center;
  justify-content: space-between;
  gap: var(--lb-space-4);
}

.lb-header__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--lb-space-2);
  font-family: var(--lb-font-display);
  font-size: var(--lb-text-400);
  font-weight: var(--lb-weight-bold);
  letter-spacing: var(--lb-tracking-tight);
  text-decoration: none;
}

.lb-header__nav {
  display: flex;
  align-items: center;
  gap: var(--lb-space-5);
  margin: 0;
  margin-left: auto;
  padding: 0;
  list-style: none;
  font-size: var(--lb-text-200);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
}

.lb-header__nav-section {
  display: none;
}

.lb-header__nav a {
  text-decoration: none;
}

.lb-header__nav a:hover {
  color: var(--lb-color-lava);
}

.lb-header__checkout {
  display: inline-flex;
  align-items: center;
  gap: var(--lb-space-2);
  padding: var(--lb-space-2) var(--lb-space-4);
  border: var(--lb-border-hairline) solid var(--lb-color-ink);
  border-radius: var(--lb-radius-sm);
}

.lb-header__nav a.lb-header__checkout:hover {
  background: var(--lb-color-ink);
  color: var(--lb-color-paper);
}

.lb-header__count {
  font-family: var(--lb-font-mono);
  letter-spacing: 0;
}

.lb-header__cta {
  display: none;
  padding: var(--lb-space-2) var(--lb-space-4);
  border: var(--lb-border-hairline) solid var(--lb-color-ink);
  border-radius: var(--lb-radius-sm);
  font-size: var(--lb-text-200);
  letter-spacing: var(--lb-tracking-wide);
  text-decoration: none;
  text-transform: uppercase;
}

.lb-header__cta:hover {
  background: var(--lb-color-ink);
  color: var(--lb-color-paper);
}

.lb-footer {
  margin-top: var(--lb-space-9);
  padding-block: var(--lb-space-8);
  background: var(--lb-color-ink);
  color: var(--lb-color-paper);
}

.lb-footer__inner {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-4);
}

.lb-footer__brand {
  font-family: var(--lb-font-display);
  font-size: var(--lb-text-500);
  font-weight: var(--lb-weight-bold);
}

.lb-footer__note,
.lb-footer__legal {
  color: var(--lb-color-line);
  font-size: var(--lb-text-200);
}

.lb-footer__legal {
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
}

@media (min-width: 768px) {
  .lb-header__nav-section {
    display: list-item;
  }

  .lb-header__cta {
    display: flex;
  }

  .lb-footer__inner {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}
</style>
