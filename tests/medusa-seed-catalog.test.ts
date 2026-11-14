import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalog } from "../data/medusa-catalog";

const seed = JSON.parse(readFileSync("apps/medusa/src/data/catalog.json", "utf8")) as Array<{
  handle: string;
  title: string;
  thumbnail: string | null;
  images: Array<{ url: string }>;
  variants: Array<{ sku: string; fixture_variant_id: string; title: string; prices: Array<{ amount: number; currency_code: string }> }>;
}>;

describe("Medusa seed catalog", () => {
  it("matches the storefront price list, including DRI sizes and the product photo", () => {
    expect(seed.map((product) => product.handle)).toEqual(catalog.map((product) => product.handle));
    for (const product of catalog) {
      const seeded = seed.find((item) => item.handle === product.handle);
      expect(seeded?.title).toBe(product.title);
      expect(seeded?.thumbnail).toBe(product.thumbnail);
      expect(seeded?.images.map((image) => image.url)).toEqual(product.images.map((image) => image.url));
      expect(seeded?.variants.map((variant) => [variant.sku, variant.fixture_variant_id, variant.title, variant.prices[0]?.amount])).toEqual(
        product.variants.map((variant) => [
          variant.sku,
          variant.id,
          variant.title,
          variant.price_set.prices[0]?.amount,
        ]),
      );
    }
  });
});
