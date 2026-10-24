import type { Meta, StoryObj } from "@storybook/vue3";
import TokenGrid from "./TokenGrid.vue";

const meta = {
  title: "Foundations/Tokens",
  component: TokenGrid,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TokenGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {};
