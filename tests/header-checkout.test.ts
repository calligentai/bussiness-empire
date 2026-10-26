/**
 * @vitest-environment jsdom
 */
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../app.vue";
import { configureCartStorage, useCart } from "../composables/useCart";

describe("header checkout link", () => {
  beforeEach(() => {
    configureCartStorage(null);
    useCart().clearCart();
  });

  it("renders a primary-nav link to /checkout", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          NuxtLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>',
          },
          NuxtPage: true,
          BrandMark: true,
          ClientOnly: { template: "<slot />" },
        },
      },
    });

    const checkout = wrapper.get('nav[aria-label="Primary"] a[href="/checkout"]');
    expect(checkout.text()).toContain("Checkout");
  });
});
