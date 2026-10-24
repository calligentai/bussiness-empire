import { h } from "vue";
import type { Meta, StoryObj } from "@storybook/vue3";
import LavaButton from "../components/LavaButton.vue";

const meta = {
  title: "Components/LavaButton",
  component: LavaButton,
  tags: ["autodocs"],
  args: {
    variant: "primary",
    size: "md",
  },
  render: (args) => () => h(LavaButton, args, { default: () => "Shop the bean" }),
} satisfies Meta<typeof LavaButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: "secondary" },
};

export const Large: Story = {
  args: { variant: "primary", size: "lg" },
};
