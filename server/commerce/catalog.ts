import type { Product } from "../../types/product";
import { medusaHeaders, medusaRuntime } from "./medusa-client";

const toCents = (amount: number) => (amount <= 100 ? Math.round(amount * 100) : Math.round(amount));

const text = (metadata: Record<string, unknown> | null | undefined, key: string) =>
  typeof metadata?.[key] === "string" ? (metadata[key] as string) : "";

interface StoreVariant {
  id: string;
  title: string;
  sku: string | null;
  metadata?: { fixture_variant_id?: string } | null;
  calculated_price?: { calculated_amount?: number | null } | null;
}

interface StoreProductPayload {
  title: string;
  handle: string;
  description?: string | null;
  thumbnail?: string | null;
  metadata?: Record<string, unknown> | null;
  images?: Array<{ url: string }>;
  variants?: StoreVariant[];
}

export const toStorefrontProduct = (product: StoreProductPayload): Product => {
  const variants = product.variants ?? [];
  const sizes =
    variants.length > 1
      ? variants
          .map((variant) => ({
            id: variant.metadata?.fixture_variant_id || variant.id,
            label: variant.title,
            priceCents: toCents(variant.calculated_price?.calculated_amount ?? 0),
          }))
          .sort((left, right) => left.priceCents - right.priceCents)
      : undefined;
  const variant = variants[0];
  const amount = sizes
    ? Math.min(...sizes.map((size) => size.priceCents))
    : toCents(variant?.calculated_price?.calculated_amount ?? 0);
  const brand = text(product.metadata, "brand");
  const imageSrc = product.thumbnail || product.images?.[0]?.url || "";
  const imageAlt = text(product.metadata, "imageAlt");
  const recipeLabel = text(product.metadata, "recipeLabel");
  return {
    slug: product.handle,
    name: product.title,
    origin: text(product.metadata, "origin"),
    process: text(product.metadata, "process"),
    notes: Array.isArray(product.metadata?.notes) ? (product.metadata?.notes as string[]) : [],
    roast: text(product.metadata, "roast"),
    priceCents: amount,
    ...(!sizes && variant?.title ? { unitLabel: variant.title } : {}),
    altitude: text(product.metadata, "altitude"),
    recipe: text(product.metadata, "recipe"),
    ...(brand ? { brand, description: product.description ?? "" } : {}),
    ...(recipeLabel ? { recipeLabel } : {}),
    ...(imageSrc && imageAlt ? { image: { src: imageSrc, alt: imageAlt } } : {}),
    ...(sizes ? { sizes } : {}),
  };
};

let regionId: string | undefined;

const region = async () => {
  if (regionId) return regionId;
  const runtime = medusaRuntime();
  const response = await fetch(`${runtime.backendUrl}/store/regions`, { headers: medusaHeaders() });
  if (!response.ok) throw new Error(`Medusa regions failed (${response.status})`);
  const body = (await response.json()) as { regions?: Array<{ id: string; currency_code: string }> };
  const match = body.regions?.find((item) => item.currency_code === "eur");
  if (!match) throw new Error("Medusa has no EUR region");
  regionId = match.id;
  return regionId;
};

export const fetchCatalog = async (handle?: string): Promise<Product[]> => {
  const runtime = medusaRuntime();
  const region_id = await region();
  const params = new URLSearchParams({
    limit: "20",
    region_id,
    fields: "*variants,*variants.calculated_price,*variants.metadata,+metadata",
  });
  if (handle) params.set("handle", handle);
  const response = await fetch(`${runtime.backendUrl}/store/products?${params}`, {
    headers: medusaHeaders(),
  });
  if (!response.ok) throw new Error(`Medusa products failed (${response.status})`);
  const body = (await response.json()) as { products?: StoreProductPayload[] };
  return (body.products ?? []).map(toStorefrontProduct);
};
