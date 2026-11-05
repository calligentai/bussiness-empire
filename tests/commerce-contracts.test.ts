import { describe, it, expect } from "vitest";
import {
  catalog,
  calculateVariantPrice,
  findProductByHandle,
  listProducts,
} from "../data/medusa-catalog";
import { products, findProduct } from "../data/products";
import type { StorePriceSet, StoreProductVariant } from "../types/medusa";

describe("R3.1 Medusa product contract", () => {
  it("exposes every product with the required Store API product fields", () => {
    expect(catalog.length).toBeGreaterThan(0);

    for (const product of catalog) {
      expect(product.id).toMatch(/^prod_/);
      expect(product.handle).toMatch(/^[a-z0-9-]+$/);
      expect(product.title.length).toBeGreaterThan(0);
      expect(product.status).toBe("published");
      expect(Array.isArray(product.options)).toBe(true);
      expect(product.options.length).toBeGreaterThan(0);
      expect(Array.isArray(product.images)).toBe(true);
      expect(Array.isArray(product.variants)).toBe(true);
      expect(product.variants.length).toBeGreaterThan(0);
    }

    const handles = catalog.map((product) => product.handle);
    expect(new Set(handles).size).toBe(handles.length);
  });

  it("exposes variants with options and a price set", () => {
    for (const product of catalog) {
      for (const variant of product.variants) {
        expect(variant.id).toMatch(/^variant_/);
        expect(variant.title.length).toBeGreaterThan(0);
        expect(variant.sku).toMatch(/^LB-/);
        expect(Array.isArray(variant.options)).toBe(true);
        expect(variant.options.length).toBeGreaterThan(0);
        expect(variant.price_set.id).toMatch(/^pset_/);
        expect(variant.price_set.prices.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("R3.1 Medusa catalog contract", () => {
  it("returns the Medusa list envelope { products, count, offset, limit }", () => {
    const response = listProducts();

    expect(Object.keys(response).sort()).toEqual(
      ["count", "limit", "offset", "products"].sort()
    );
    expect(response.count).toBe(catalog.length);
    expect(response.offset).toBe(0);
    expect(response.limit).toBeGreaterThan(0);
    expect(response.products).toHaveLength(catalog.length);
  });

  it("paginates with limit and offset while keeping the total count", () => {
    const page = listProducts({ limit: 2, offset: 1 });

    expect(page.products).toHaveLength(2);
    expect(page.count).toBe(catalog.length);
    expect(page.offset).toBe(1);
    expect(page.limit).toBe(2);
  });

  it("supports the handle filter used by product detail pages", () => {
    const match = findProductByHandle("kivu-natural");

    expect(match?.title).toBe("Kivu Natural");
    expect(findProductByHandle("does-not-exist")).toBeUndefined();

    const filtered = listProducts({ handle: "virunga-washed" });
    expect(filtered.count).toBe(1);
    expect(filtered.products[0]?.handle).toBe("virunga-washed");
  });
});

describe("R3.1 Medusa price contract", () => {
  it("calculates prices in major units for the requested currency", () => {
    const variant = findProductByHandle("virunga-washed")!.variants[0];
    const calculated = calculateVariantPrice(variant, { currency_code: "eur" });

    expect(calculated?.currency_code).toBe("eur");
    expect(calculated?.calculated_amount).toBe(18.5);
    expect(calculated?.original_amount).toBe(18.5);
  });

  it("returns no calculated price for an unsupported currency", () => {
    const variant = findProductByHandle("virunga-washed")!.variants[0];

    expect(calculateVariantPrice(variant, { currency_code: "usd" })).toBeNull();
  });

  it("honours min_quantity price tiers", () => {
    const variant: StoreProductVariant = {
      id: "variant_tiered",
      title: "Tiered",
      sku: "LB-TIER-1",
      options: [{ id: "optval_1", value: "1 kg" }],
      price_set: {
        id: "pset_tiered",
        prices: [
          { id: "price_tier_base", amount: 20, currency_code: "eur" },
          {
            id: "price_tier_bulk",
            amount: 18,
            currency_code: "eur",
            min_quantity: 2,
          },
        ],
      },
    };

    expect(
      calculateVariantPrice(variant, { currency_code: "eur", quantity: 1 })
        ?.calculated_amount
    ).toBe(20);
    expect(
      calculateVariantPrice(variant, { currency_code: "eur", quantity: 2 })
        ?.calculated_amount
    ).toBe(18);
  });

  it("leaves the medusa price set untouched when calculating", () => {
    const variant = findProductByHandle("kivu-natural")!.variants[0];
    const priceSet: StorePriceSet = variant.price_set;
    const before = JSON.stringify(priceSet);

    calculateVariantPrice(variant, { currency_code: "eur" });

    expect(JSON.stringify(priceSet)).toBe(before);
  });
});

describe("R3.1 Nuxt catalogue is derived from the Medusa contract", () => {
  it("maps every Medusa product to one legacy Product", () => {
    expect(products).toHaveLength(catalog.length);
  });

  it("keeps legacy prices as integer cents derived from the calculated price", () => {
    expect(findProduct("virunga-washed")?.priceCents).toBe(1850);
    expect(findProduct("kivu-natural")?.priceCents).toBe(2100);
    expect(findProduct("basalt-dark")?.priceCents).toBe(1950);

    for (const product of products) {
      expect(Number.isInteger(product.priceCents)).toBe(true);
    }
  });

  it("carries the Lava Bean product details from Medusa metadata", () => {
    const product = findProduct("virunga-washed");

    expect(product?.name).toBe("Virunga Washed");
    expect(product?.origin).toBe("Rwanda");
    expect(product?.process).toBe("Washed");
    expect(product?.notes.length).toBeGreaterThan(0);
    expect(product?.roast.length).toBeGreaterThan(0);
    expect(product?.altitude.length).toBeGreaterThan(0);
    expect(product?.recipe.length).toBeGreaterThan(0);
  });
});
