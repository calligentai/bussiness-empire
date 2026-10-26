import { hydrateCart, hydrateOrders } from "../composables/useCart";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("app:mounted", () => {
    hydrateCart();
    hydrateOrders();
  });
});
