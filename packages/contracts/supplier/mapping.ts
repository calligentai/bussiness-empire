export interface SupplierSkuMapping {
  supplierId: string;
  supplierSku: string;
  productId: string;
}

export interface MappingActor {
  canManageSupplierMappings: boolean;
}

export interface CreateSupplierSkuMappingInput {
  supplierId: string;
  supplierSku: string;
  productId: string;
  actor: MappingActor;
}

export interface SupplierItem {
  supplierId: string;
  supplierSku: string;
  name: string;
}

export interface ConceptRecord extends SupplierItem {
  kind: "concept";
}

