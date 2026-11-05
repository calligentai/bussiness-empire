<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost";
    size?: "md" | "lg";
    type?: "button" | "submit" | "reset";
  }>(),
  { variant: "primary", size: "md", type: "button" },
);
</script>

<template>
  <button :type="type" class="lb-button" :class="[`lb-button--${variant}`, `lb-button--${size}`]">
    <slot />
  </button>
</template>

<style scoped>
.lb-button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: var(--lb-space-2);
  border: var(--lb-border-hairline) solid transparent;
  border-radius: var(--lb-radius-sm);
  padding: var(--lb-space-2) var(--lb-space-5);
  font-family: var(--lb-font-body);
  font-size: var(--lb-text-200);
  font-weight: var(--lb-weight-medium);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background-color var(--lb-motion-fast) var(--lb-motion-ease),
    color var(--lb-motion-fast) var(--lb-motion-ease),
    border-color var(--lb-motion-fast) var(--lb-motion-ease);
}

.lb-button--lg {
  min-height: 52px;
  padding: var(--lb-space-3) var(--lb-space-6);
}

.lb-button--primary {
  background: var(--lb-color-ember);
  color: var(--lb-color-ink);
}

.lb-button--primary:hover {
  background: var(--lb-color-lava);
}

.lb-button--secondary {
  background: transparent;
  border-color: var(--lb-color-ink);
  color: var(--lb-color-ink);
}

.lb-button--secondary:hover {
  background: var(--lb-color-ink);
  color: var(--lb-color-paper);
}

.lb-button--ghost {
  background: transparent;
  color: var(--lb-color-paper);
}

.lb-button--ghost:hover {
  color: var(--lb-color-ember);
}
</style>
