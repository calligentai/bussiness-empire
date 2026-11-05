import type {
  ConceptRecord,
  CreateSupplierSkuMappingInput,
  SupplierItem,
  SupplierSkuMapping,
} from "../../../packages/contracts/supplier/mapping";

export type { SupplierSkuMapping } from "../../../packages/contracts/supplier/mapping";

/** Adds a mapping while enforcing a one-to-one relationship within a supplier. */
export function createSupplierSkuMapping(
  existing: readonly SupplierSkuMapping[],
  input: CreateSupplierSkuMappingInput,
): SupplierSkuMapping {
  if (!input.actor.canManageSupplierMappings) {
    throw new Error("Not authorized to manage supplier mappings");
  }

  const supplierId = input.supplierId.trim();
  const supplierSku = input.supplierSku.trim();
  const productId = input.productId.trim();
  if (!supplierId || !supplierSku || !productId) {
    throw new Error("Supplier ID, supplier SKU, and product ID are required");
  }

  if (existing.some((mapping) => mapping.supplierId === supplierId && mapping.supplierSku === supplierSku)) {
    throw new Error("Supplier SKU is already mapped");
  }
  if (existing.some((mapping) => mapping.supplierId === supplierId && mapping.productId === productId)) {
    throw new Error("Product already has a supplier mapping");
  }

  return { supplierId, supplierSku, productId };
}

/** Persists a mapping only after applying the same authorization and uniqueness checks. */
export async function writeSupplierSkuMapping(
  existing: readonly SupplierSkuMapping[],
  input: CreateSupplierSkuMappingInput,
  persist: (mapping: SupplierSkuMapping) => Promise<void>,
): Promise<SupplierSkuMapping> {
  const mapping = createSupplierSkuMapping(existing, input);
  await persist(mapping);
  return mapping;
}

/** Converts an imported item into a catalog concept without creating an order. */
export function importSupplierItemAsConcept(item: SupplierItem): ConceptRecord {
  const supplierId = item.supplierId.trim();
  const supplierSku = item.supplierSku.trim();
  const name = item.name.trim();
  if (!supplierId || !supplierSku || !name) {
    throw new Error("Supplier ID, supplier SKU, and item name are required");
  }

  return {
    kind: "concept",
    supplierId,
    supplierSku,
    name,
  };
}
