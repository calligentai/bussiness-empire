import { describe, expect, it } from "vitest";
import {
  createSupplierSkuMapping,
  importSupplierItemAsConcept,
  writeSupplierSkuMapping,
  type SupplierSkuMapping,
} from "../../apps/supplier-engine/src/mapping";

describe("supplier SKU mappings", () => {
  it("creates a unique one-to-one mapping", () => {
    const existing: SupplierSkuMapping[] = [];
    expect(
      createSupplierSkuMapping(existing, {
        supplierId: "supplier-a",
        supplierSku: "SKU-1",
        productId: "product-1",
        actor: { canManageSupplierMappings: true },
      }),
    ).toEqual({ supplierId: "supplier-a", supplierSku: "SKU-1", productId: "product-1" });
  });

  it("rejects duplicate supplier SKUs and duplicate product mappings", () => {
    const existing: SupplierSkuMapping[] = [
      { supplierId: "supplier-a", supplierSku: "SKU-1", productId: "product-1" },
    ];
    expect(() =>
      createSupplierSkuMapping(existing, {
        supplierId: "supplier-a",
        supplierSku: "SKU-1",
        productId: "product-2",
        actor: { canManageSupplierMappings: true },
      }),
    ).toThrow("Supplier SKU is already mapped");
    expect(() =>
      createSupplierSkuMapping(existing, {
        supplierId: "supplier-a",
        supplierSku: "SKU-2",
        productId: "product-1",
        actor: { canManageSupplierMappings: true },
      }),
    ).toThrow("Product already has a supplier mapping");
  });

  it("allows the same SKU and product to be mapped independently for another supplier", () => {
    const existing: SupplierSkuMapping[] = [
      { supplierId: "supplier-a", supplierSku: "SKU-1", productId: "product-1" },
    ];
    expect(
      createSupplierSkuMapping(existing, {
        supplierId: "supplier-b",
        supplierSku: "SKU-1",
        productId: "product-1",
        actor: { canManageSupplierMappings: true },
      }),
    ).toEqual({ supplierId: "supplier-b", supplierSku: "SKU-1", productId: "product-1" });
  });

  it("imports supplier data as a concept, never as a purchase order", () => {
    expect(importSupplierItemAsConcept({ supplierId: "supplier-a", supplierSku: "SKU-1", name: "Tea" })).toEqual({
      kind: "concept",
      supplierId: "supplier-a",
      supplierSku: "SKU-1",
      name: "Tea",
    });
  });

  it("does not allow an unauthorized actor to create a mapping", () => {
    expect(() =>
      createSupplierSkuMapping([], {
        supplierId: "supplier-a",
        supplierSku: "SKU-1",
        productId: "product-1",
        actor: { canManageSupplierMappings: false },
      }),
    ).toThrow("Not authorized to manage supplier mappings");
  });

  it("does not persist a mapping when the actor is unauthorized", async () => {
    let writes = 0;
    await expect(
      writeSupplierSkuMapping(
        [],
        {
          supplierId: "supplier-a",
          supplierSku: "SKU-1",
          productId: "product-1",
          actor: { canManageSupplierMappings: false },
        },
        async () => {
          writes += 1;
        },
      ),
    ).rejects.toThrow("Not authorized to manage supplier mappings");
    expect(writes).toBe(0);
  });

  it("does not persist a mapping when a uniqueness check fails", async () => {
    let writes = 0;
    await expect(
      writeSupplierSkuMapping(
        [{ supplierId: "supplier-a", supplierSku: "SKU-1", productId: "product-1" }],
        {
          supplierId: "supplier-a",
          supplierSku: "SKU-1",
          productId: "product-2",
          actor: { canManageSupplierMappings: true },
        },
        async () => {
          writes += 1;
        },
      ),
    ).rejects.toThrow("Supplier SKU is already mapped");
    expect(writes).toBe(0);
  });

  it("rejects incomplete imported supplier items", () => {
    expect(() =>
      importSupplierItemAsConcept({ supplierId: "supplier-a", supplierSku: "  ", name: "Tea" }),
    ).toThrow("Supplier ID, supplier SKU, and item name are required");
  });
});
