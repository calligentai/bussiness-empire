import { h } from "vue";
import type { Preview } from "@storybook/vue3";
import "../assets/css/tokens.css";
import "../assets/css/base.css";

const NuxtLink = {
  props: { to: { type: String, default: "#" } },
  setup(props: { to: string }, { slots }: { slots: { default?: () => unknown } }) {
    return () => h("a", { href: props.to }, slots.default?.() as never);
  },
};

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "paper",
      values: [
        { name: "paper", value: "var(--lb-color-paper)" },
        { name: "ink", value: "var(--lb-color-ink)" },
      ],
    },
    a11y: {
      config: {
        rules: [{ id: "color-contrast", enabled: true }],
      },
    },
  },
  setup(app) {
    app.component("NuxtLink", NuxtLink);
  },
};

export default preview;
