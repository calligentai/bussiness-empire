<template>
  <ClientOnly>
    <CartPanel />
    <template #fallback>
      <article class="lb-cart lb-container">
        <h1>Cart</h1>
        <p>Loading cart…</p>
      </article>
    </template>
  </ClientOnly>
</template>

<style scoped>
.lb-cart {
  padding-block: var(--lb-space-7);
}

.lb-cart h1 {
  margin-bottom: var(--lb-space-4);
  font-size: var(--lb-text-700);
}
</style>
