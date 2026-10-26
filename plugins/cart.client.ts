import { hydrateCart } from "../composables/useCart";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("app:mounted", () => {
    hydrateCart();
  });
});
