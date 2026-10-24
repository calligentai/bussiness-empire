<script setup lang="ts">
import tokens from "../brand/tokens.json";

const colors = Object.entries(tokens.color);
const spacing = Object.entries(tokens.space);
const typeSizes = Object.entries(tokens.typography.size);
</script>

<template>
  <div class="token-grid">
    <section>
      <h2>Colour</h2>
      <ul class="swatches">
        <li v-for="[name, value] in colors" :key="name">
          <span class="swatch" :style="{ background: value }" />
          <span>{{ name }}</span>
          <code>{{ value }}</code>
        </li>
      </ul>
    </section>

    <section>
      <h2>Spacing</h2>
      <ul class="spacing">
        <li v-for="[name, value] in spacing" :key="name">
          <span class="bar" :style="{ width: value }" />
          <code>space-{{ name }} {{ value }}</code>
        </li>
      </ul>
    </section>

    <section>
      <h2>Type</h2>
      <p v-for="[name, value] in typeSizes" :key="name" :style="{ fontSize: value }">
        {{ name }} · Volcanic precision
      </p>
    </section>
  </div>
</template>

<style scoped>
.token-grid {
  display: grid;
  gap: var(--lb-space-6);
  padding: var(--lb-space-6);
  background: var(--lb-color-paper);
  color: var(--lb-color-ink);
  font-family: var(--lb-font-body);
}

h2 {
  margin-bottom: var(--lb-space-3);
  font-family: var(--lb-font-display);
  font-size: var(--lb-text-400);
}

.swatches,
.spacing {
  display: grid;
  gap: var(--lb-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.swatches li {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center;
  gap: var(--lb-space-3);
}

.swatch {
  width: 32px;
  height: 32px;
  border: var(--lb-border-hairline) solid var(--lb-color-line);
  border-radius: var(--lb-radius-sm);
}

.spacing li {
  display: flex;
  align-items: center;
  gap: var(--lb-space-3);
}

.bar {
  height: 12px;
  background: var(--lb-color-lava);
  border-radius: var(--lb-radius-pill);
}

code {
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
  color: var(--lb-color-muted);
}
</style>
