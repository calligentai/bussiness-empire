import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalog, findProductByHandle } from "../data/medusa-catalog";
import { findProduct, products } from "../data/products";

const HANDLE = "dri-coffee-specialty-arabica-rwanda";
const IMAGE = "/products/dri-rwanda-specialty-arabica.jpg";

const jpegSize = (buffer: Buffer) => {
  expect(buffer[0]).toBe(0xff);
  expect(buffer[1]).toBe(0xd8);
  let offset = 2;
  while (offset < buffer.length) {
    expect(buffer[offset]).toBe(0xff);
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG size marker not found");
};

describe("DRI Rwanda product", () => {
  it("adds DRI Rwanda after the existing Lava Bean lots", () => {
    expect(catalog.map((product) => product.handle)).toEqual([
      "virunga-washed",
      "kivu-natural",
      "basalt-dark",
      HANDLE,
    ]);
    expect(findProduct("virunga-washed")).toMatchObject({
      name: "Virunga Washed",
      priceCents: 1850,
    });
    expect(findProduct("kivu-natural")?.priceCents).toBe(2100);
    expect(findProduct("basalt-dark")?.priceCents).toBe(1950);
    expect(findProduct("virunga-washed")).not.toHaveProperty("brand");
    expect(findProduct("kivu-natural")).not.toHaveProperty("sizes");
    expect(findProduct("basalt-dark")).not.toHaveProperty("image");
  });

  it("prices the three DRI sizes in euros and keeps DRI skus", () => {
    const product = findProductByHandle(HANDLE);
    expect(product?.title).toBe(
      "DRI Coffee – Specialty Arabica from Rwanda, Medium Roast"
    );
    expect(product?.metadata?.brand).toBe("DRI");
    expect(product?.variants.map((variant) => [variant.sku, variant.title, variant.calculated_price?.calculated_amount])).toEqual([
      ["DRI-RW-250G", "250 g", 9.49],
      ["DRI-RW-500G", "500 g", 16.96],
      ["DRI-RW-1KG", "1 kg", 29.96],
    ]);

    const legacy = findProduct(HANDLE);
    expect(legacy?.priceCents).toBe(949);
    expect(legacy?.sizes).toEqual([
      { id: "variant_dri_rwanda_250g", label: "250 g", priceCents: 949 },
      { id: "variant_dri_rwanda_500g", label: "500 g", priceCents: 1696 },
      { id: "variant_dri_rwanda_1kg", label: "1 kg", priceCents: 2996 },
    ]);
    expect(products.filter((item) => item.brand === "DRI")).toHaveLength(1);
  });

  it("uses the supplied origin facts without certification or review claims", () => {
    const product = findProduct(HANDLE);
    expect(product?.origin).toBe("Rwanda");
    expect(product?.process).toBe("Fully washed");
    expect(product?.roast).toBe("Medium");
    expect(product?.altitude).toBe("1,600–2,000 m");
    expect(product?.notes).toEqual(["Floral", "Light fruit", "Clean finish"]);
    expect(product?.recipe).toBe("Filter, pour-over, espresso");
    expect(product?.recipeLabel).toBe("Brew");
    expect(product?.description).toMatch(/100% Arabica/);
    expect(product?.description).toMatch(/filter, pour-over, and espresso/i);
    expect(product?.description).not.toMatch(/certif|laboratory|lab test|organic|fair trade|review/i);
  });

  it("stores one local product photo and does not hotlink it", () => {
    const product = findProductByHandle(HANDLE);
    expect(product?.thumbnail).toBe(IMAGE);
    expect(product?.images.map((image) => image.url)).toEqual([IMAGE]);
    expect(IMAGE.startsWith("/")).toBe(true);
    expect(IMAGE).not.toMatch(/^https?:/);

    const file = readFileSync(new URL(`../public${IMAGE}`, import.meta.url));
    expect(file.byteLength).toBeGreaterThan(20_000);
    expect(file.byteLength).toBeLessThan(400_000);
    expect(jpegSize(file)).toEqual({ width: 1400, height: 1449 });
    expect(findProduct(HANDLE)?.image).toEqual({
      src: IMAGE,
      alt: "Three DRI roasted coffee bags in 1 kg, 500 g, and 250 g sizes on a bed of roasted beans.",
    });
  });
});
