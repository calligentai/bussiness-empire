import type { Product } from "../types/product";

export const products: Product[] = [
  {
    slug: "virunga-washed",
    name: "Virunga Washed",
    origin: "Rwanda",
    process: "Washed",
    notes: ["Red apple", "Cocoa nib", "Brown sugar"],
    roast: "Medium",
    priceCents: 1850,
    altitude: "1,900 m",
    recipe: "12.4 g in · 36 g out · 28 s",
  },
  {
    slug: "kivu-natural",
    name: "Kivu Natural",
    origin: "Rwanda",
    process: "Natural",
    notes: ["Strawberry", "Dark cherry", "Cane syrup"],
    roast: "Light",
    priceCents: 2100,
    altitude: "1,750 m",
    recipe: "13 g in · 39 g out · 26 s",
  },
  {
    slug: "basalt-dark",
    name: "Basalt Dark",
    origin: "Rwanda",
    process: "Honey",
    notes: ["Bitter chocolate", "Hazelnut", "Molasses"],
    roast: "Dark",
    priceCents: 1950,
    altitude: "1,820 m",
    recipe: "12 g in · 34 g out · 30 s",
  },
];

export const findProduct = (slug: string) =>
  products.find((product) => product.slug === slug);
