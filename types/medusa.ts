export type StoreProductStatus = "draft" | "proposed" | "published" | "rejected";

export interface StoreMoneyAmount {
  id: string;
  amount: number;
  currency_code: string;
  min_quantity?: number | null;
  max_quantity?: number | null;
}

export interface StorePriceSet {
  id: string;
  prices: StoreMoneyAmount[];
}

export interface StoreCalculatedPriceSet {
  id: string;
  calculated_amount: number | null;
  original_amount: number | null;
  currency_code: string | null;
}

export interface StoreProductOptionValue {
  id: string;
  value: string;
}

export interface StoreProductOption {
  id: string;
  title: string;
  values: StoreProductOptionValue[];
}

export interface StoreProductImage {
  id: string;
  url: string;
  rank?: number;
}

export interface StoreProductVariant {
  id: string;
  title: string;
  sku: string | null;
  options: StoreProductOptionValue[];
  price_set: StorePriceSet;
  calculated_price?: StoreCalculatedPriceSet | null;
  inventory_quantity?: number | null;
  manage_inventory?: boolean | null;
}

export interface StoreProduct {
  id: string;
  title: string;
  handle: string;
  subtitle: string | null;
  description: string | null;
  status: StoreProductStatus;
  thumbnail: string | null;
  origin_country: string | null;
  metadata: Record<string, unknown> | null;
  options: StoreProductOption[];
  variants: StoreProductVariant[];
  images: StoreProductImage[];
}

export interface StoreProductListParams {
  currency_code?: string;
  handle?: string;
  limit?: number;
  offset?: number;
}

export interface StoreProductListResponse {
  products: StoreProduct[];
  count: number;
  offset: number;
  limit: number;
}
