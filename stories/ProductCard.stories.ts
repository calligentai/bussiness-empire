import { h } from "vue";
import type { Meta, StoryObj } from "@storybook/vue3";
import ProductCard from "../components/ProductCard.vue";
import type { Product } from "../types/product";

const product: Product = {
  slug: "virunga-washed",
  name: "Virunga Washed",
  origin: "Rwanda",
  process: "Washed",
  notes: ["Red apple", "Cocoa nib", "Brown sugar"],
  roast: "Medium",
  priceCents: 1850,
  altitude: "1,900 m",
  recipe: "12.4 g in · 36 g out · 28 s",
};

const meta = {
  title: "Components/ProductCard",
  component: ProductCard,
  tags: ["autodocs"],
  args: { product },
  render: (args) => () =>
    h("div", { style: { maxWidth: "360px" } }, [h(ProductCard, { product: args.product })]),
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
