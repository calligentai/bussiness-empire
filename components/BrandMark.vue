<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number;
    label?: string;
  }>(),
  { size: 32, label: "Lava Bean" },
);
</script>

<template>
  <img
    src="/brand/lavabean-mark.svg"
    :width="size"
    :height="size"
    :alt="label"
    decoding="async"
  />
</template>
