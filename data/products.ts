import type { Product } from "../types/product";
import type { StoreProduct } from "../types/medusa";
import { DEFAULT_CURRENCY, listProducts } from "./medusa-catalog";

const text = (metadata: Record<string, unknown> | null, key: string): string =>
  typeof metadata?.[key] === "string" ? (metadata[key] as string) : "";

const toLegacyProduct = (product: StoreProduct): Product => {
  const variant = product.variants[0];
  const sizes =
    product.variants.length > 1
      ? product.variants.map((item) => ({
          id: item.id,
          label: item.title,
          priceCents: Math.round((item.calculated_price?.calculated_amount ?? 0) * 100),
        }))
      : undefined;
  const amount = sizes
    ? Math.min(...sizes.map((size) => size.priceCents)) / 100
    : (variant?.calculated_price?.calculated_amount ?? 0);
  const brand = text(product.metadata, "brand");
  const imageSrc = product.thumbnail ?? product.images[0]?.url ?? "";
  const imageAlt = text(product.metadata, "imageAlt");
  const recipeLabel = text(product.metadata, "recipeLabel");

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
    ...(brand ? { brand, description: product.description ?? "" } : {}),
    ...(recipeLabel ? { recipeLabel } : {}),
    ...(imageSrc && imageAlt ? { image: { src: imageSrc, alt: imageAlt } } : {}),
    ...(sizes ? { sizes } : {}),
  };
};

export const products: Product[] = listProducts({
  currency_code: DEFAULT_CURRENCY,
}).products.map(toLegacyProduct);

export const findProduct = (slug: string) =>
  products.find((product) => product.slug === slug);
