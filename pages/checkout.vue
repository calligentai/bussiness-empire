<template>
  <ClientOnly>
    <CheckoutForm />
    <template #fallback>
      <article class="lb-checkout lb-container">
        <h1>Checkout</h1>
        <p>Loading checkout…</p>
      </article>
    </template>
  </ClientOnly>
</template>

<style scoped>
.lb-checkout {
  padding-block: var(--lb-space-7);
}

.lb-checkout h1 {
  margin-bottom: var(--lb-space-4);
  font-size: var(--lb-text-700);
}
</style>
