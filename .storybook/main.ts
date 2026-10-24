import type { StorybookConfig } from "@storybook/vue3-vite";
import vue from "@vitejs/plugin-vue";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|js)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/vue3-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: async (viteConfig) => {
    viteConfig.plugins ??= [];
    viteConfig.plugins.push(vue());
    return viteConfig;
  },
};

export default config;
