<script setup lang="ts">
const props = defineProps<{ current: 1 | 2 | 3 }>();

const steps = [
  { n: 1, label: "Origin", to: "/rwanda" },
  { n: 2, label: "Your bag", to: "/rwanda/select" },
  { n: 3, label: "Checkout", to: "/checkout" },
] as const;
</script>

<template>
  <nav class="lb-steps" aria-label="Purchase progress">
    <ol class="lb-steps__list">
      <li
        v-for="step in steps"
        :key="step.n"
        class="lb-steps__item"
        :class="{
          'is-done': step.n < props.current,
          'is-current': step.n === props.current,
        }"
        :aria-current="step.n === props.current ? 'step' : undefined"
      >
        <NuxtLink v-if="step.n < props.current" :to="step.to" class="lb-steps__link">
          <span class="lb-steps__dot" aria-hidden="true">{{ step.n }}</span>
          <span>{{ step.label }}</span>
        </NuxtLink>
        <span v-else class="lb-steps__link">
          <span class="lb-steps__dot" aria-hidden="true">{{ step.n }}</span>
          <span>{{ step.label }}</span>
        </span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.lb-steps__list {
  display: flex;
  gap: var(--lb-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.lb-steps__item {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--lb-space-2);
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

.lb-steps__item:not(:last-child)::after {
  content: "";
  flex: 1;
  height: var(--lb-border-hairline);
  background: var(--lb-color-line);
}

.lb-steps__link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: var(--lb-space-2);
  color: inherit;
  text-decoration: none;
  white-space: nowrap;
}

.lb-steps__dot {
  display: inline-grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: var(--lb-border-hairline) solid var(--lb-color-line);
  border-radius: var(--lb-radius-pill);
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-100);
}

.is-current {
  color: var(--lb-color-ink);
  font-weight: var(--lb-weight-semibold);
}

.is-current .lb-steps__dot {
  border-color: var(--lb-color-ink);
  background: var(--lb-color-ink);
  color: var(--lb-color-paper);
}

.is-done {
  color: var(--lb-color-ink);
}

.is-done .lb-steps__dot {
  border-color: var(--lb-color-ember);
  background: var(--lb-color-ember);
  color: var(--lb-color-ink);
}

@media (max-width: 479px) {
  .lb-steps__item:not(.is-current) .lb-steps__link > span:last-child {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
}
</style>
