import type { Product } from "../types/product";
import type { StoreProduct } from "../types/medusa";
import { DEFAULT_CURRENCY, listProducts } from "./medusa-catalog";

const text = (metadata: Record<string, unknown> | null, key: string): string =>
  typeof metadata?.[key] === "string" ? (metadata[key] as string) : "";

const toLegacyProduct = (product: StoreProduct): Product => {
  const variant = product.variants[0];
  const amount = variant?.calculated_price?.calculated_amount ?? 0;

  return {
    slug: product.handle,
    name: product.title,
    origin: text(product.metadata, "origin"),
    process: text(product.metadata, "process"),
    notes: Array.isArray(product.metadata?.notes)
      ? (product.metadata.notes as string[])
      : [],
    roast: text(product.metadata, "roast"),
    priceCents: Math.round(amount * 100),
    altitude: text(product.metadata, "altitude"),
    recipe: text(product.metadata, "recipe"),
  };
};

export const products: Product[] = listProducts({
  currency_code: DEFAULT_CURRENCY,
}).products.map(toLegacyProduct);

export const findProduct = (slug: string) =>
  products.find((product) => product.slug === slug);
