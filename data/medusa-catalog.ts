import type {
  StoreCalculatedPriceSet,
  StoreProduct,
  StoreProductListParams,
  StoreProductListResponse,
  StoreProductVariant,
  StoreMoneyAmount,
} from "../types/medusa";

export const DEFAULT_CURRENCY = "eur";
export const DEFAULT_LIMIT = 20;

export const catalog: StoreProduct[] = [
  {
    id: "prod_virunga_washed",
    title: "Virunga Washed",
    handle: "virunga-washed",
    subtitle: "Washed Rwandan lot",
    description:
      "A washed lot from the Virunga highlands with red apple, cocoa nib and brown sugar.",
    status: "published",
    thumbnail: null,
    origin_country: "RW",
    metadata: {
      origin: "Rwanda",
      process: "Washed",
      notes: ["Red apple", "Cocoa nib", "Brown sugar"],
      roast: "Medium",
      altitude: "1,900 m",
      recipe: "12.4 g in · 36 g out · 28 s",
    },
    options: [{ id: "opt_weight", title: "Weight", values: [{ id: "optval_1kg", value: "1 kg" }] }],
    variants: [
      {
        id: "variant_virunga_1kg",
        title: "1 kg",
        sku: "LB-VIR-1KG",
        options: [{ id: "optval_1kg", value: "1 kg" }],
        price_set: {
          id: "pset_virunga_1kg",
          prices: [
            { id: "price_virunga_eur", amount: 18.5, currency_code: "eur" },
          ],
        },
        inventory_quantity: 24,
        manage_inventory: true,
      },
    ],
    images: [],
  },
  {
    id: "prod_kivu_natural",
    title: "Kivu Natural",
    handle: "kivu-natural",
    subtitle: "Natural Rwandan lot",
    description:
      "A natural lot from Lake Kivu with strawberry, dark cherry and cane syrup.",
    status: "published",
    thumbnail: null,
    origin_country: "RW",
    metadata: {
      origin: "Rwanda",
      process: "Natural",
      notes: ["Strawberry", "Dark cherry", "Cane syrup"],
      roast: "Light",
      altitude: "1,750 m",
      recipe: "13 g in · 39 g out · 26 s",
    },
    options: [{ id: "opt_weight", title: "Weight", values: [{ id: "optval_1kg", value: "1 kg" }] }],
    variants: [
      {
        id: "variant_kivu_1kg",
        title: "1 kg",
        sku: "LB-KIV-1KG",
        options: [{ id: "optval_1kg", value: "1 kg" }],
        price_set: {
          id: "pset_kivu_1kg",
          prices: [{ id: "price_kivu_eur", amount: 21, currency_code: "eur" }],
        },
        inventory_quantity: 18,
        manage_inventory: true,
      },
    ],
    images: [],
  },
  {
    id: "prod_basalt_dark",
    title: "Basalt Dark",
    handle: "basalt-dark",
    subtitle: "Honey Rwandan lot",
    description:
      "A honey-processed lot from the basalt soils with bitter chocolate, hazelnut and molasses.",
    status: "published",
    thumbnail: null,
    origin_country: "RW",
    metadata: {
      origin: "Rwanda",
      process: "Honey",
      notes: ["Bitter chocolate", "Hazelnut", "Molasses"],
      roast: "Dark",
      altitude: "1,820 m",
      recipe: "12 g in · 34 g out · 30 s",
    },
    options: [{ id: "opt_weight", title: "Weight", values: [{ id: "optval_1kg", value: "1 kg" }] }],
    variants: [
      {
        id: "variant_basalt_1kg",
        title: "1 kg",
        sku: "LB-BAS-1KG",
        options: [{ id: "optval_1kg", value: "1 kg" }],
        price_set: {
          id: "pset_basalt_1kg",
          prices: [{ id: "price_basalt_eur", amount: 19.5, currency_code: "eur" }],
        },
        inventory_quantity: 12,
        manage_inventory: true,
      },
    ],
    images: [],
  },
  {
    id: "prod_dri_rwanda",
    title: "DRI Coffee – Specialty Arabica from Rwanda, Medium Roast",
    handle: "dri-coffee-specialty-arabica-rwanda",
    subtitle: "DRI Coffee",
    description:
      "100% Arabica from Rwanda's volcanic highlands at 1,600–2,000 m. Fully washed and medium roasted, with floral and light fruity notes and a clean finish. Suited to filter, pour-over, and espresso.",
    status: "published",
    thumbnail: "/products/dri-rwanda-specialty-arabica.jpg",
    origin_country: "RW",
    metadata: {
      brand: "DRI",
      origin: "Rwanda",
      process: "Fully washed",
      notes: ["Floral", "Light fruit", "Clean finish"],
      roast: "Medium",
      altitude: "1,600–2,000 m",
      recipe: "Filter, pour-over, espresso",
      recipeLabel: "Brew",
      imageAlt:
        "Three DRI roasted coffee bags in 1 kg, 500 g, and 250 g sizes on a bed of roasted beans.",
    },
    options: [
      {
        id: "opt_dri_rwanda_weight",
        title: "Weight",
        values: [
          { id: "optval_dri_rw_250g", value: "250 g" },
          { id: "optval_dri_rw_500g", value: "500 g" },
          { id: "optval_dri_rw_1kg", value: "1 kg" },
        ],
      },
    ],
    variants: [
      {
        id: "variant_dri_rwanda_250g",
        title: "250 g",
        sku: "DRI-RW-250G",
        options: [{ id: "optval_dri_rw_250g", value: "250 g" }],
        price_set: {
          id: "pset_dri_rwanda_250g",
          prices: [{ id: "price_dri_rwanda_250g_eur", amount: 9.49, currency_code: "eur" }],
        },
        inventory_quantity: null,
        manage_inventory: false,
      },
      {
        id: "variant_dri_rwanda_500g",
        title: "500 g",
        sku: "DRI-RW-500G",
        options: [{ id: "optval_dri_rw_500g", value: "500 g" }],
        price_set: {
          id: "pset_dri_rwanda_500g",
          prices: [{ id: "price_dri_rwanda_500g_eur", amount: 16.96, currency_code: "eur" }],
        },
        inventory_quantity: null,
        manage_inventory: false,
      },
      {
        id: "variant_dri_rwanda_1kg",
        title: "1 kg",
        sku: "DRI-RW-1KG",
        options: [{ id: "optval_dri_rw_1kg", value: "1 kg" }],
        price_set: {
          id: "pset_dri_rwanda_1kg",
          prices: [{ id: "price_dri_rwanda_1kg_eur", amount: 29.96, currency_code: "eur" }],
        },
        inventory_quantity: null,
        manage_inventory: false,
      },
    ],
    images: [
      {
        id: "img_dri_rwanda_01",
        url: "/products/dri-rwanda-specialty-arabica.jpg",
        rank: 0,
      },
    ],
  },
];

const applicablePrice = (
  prices: StoreMoneyAmount[],
  currency_code: string,
  quantity: number
): StoreMoneyAmount | undefined => {
  const inRange = prices.filter((price) => {
    if (price.currency_code !== currency_code) return false;
    const min = price.min_quantity ?? 1;
    const max = price.max_quantity ?? Number.POSITIVE_INFINITY;
    return quantity >= min && quantity <= max;
  });

  return inRange.sort(
    (a, b) => (b.min_quantity ?? 1) - (a.min_quantity ?? 1)
  )[0];
};

const basePrice = (
  prices: StoreMoneyAmount[],
  currency_code: string
): StoreMoneyAmount | undefined =>
  prices.find(
    (price) =>
      price.currency_code === currency_code && (price.min_quantity ?? 1) === 1
  );

export const calculateVariantPrice = (
  variant: StoreProductVariant,
  { currency_code, quantity = 1 }: { currency_code: string; quantity?: number }
): StoreCalculatedPriceSet | null => {
  const prices = variant.price_set.prices;
  const selected = applicablePrice(prices, currency_code, quantity);
  if (!selected) return null;

  return {
    id: selected.id,
    calculated_amount: selected.amount,
    original_amount: basePrice(prices, currency_code)?.amount ?? selected.amount,
    currency_code,
  };
};

const withCalculatedPrices = (
  product: StoreProduct,
  currency_code: string
): StoreProduct => ({
  ...product,
  variants: product.variants.map((variant) => ({
    ...variant,
    calculated_price: calculateVariantPrice(variant, { currency_code }),
  })),
});

export const listProducts = (
  params: StoreProductListParams = {}
): StoreProductListResponse => {
  const currency_code = params.currency_code ?? DEFAULT_CURRENCY;
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;

  const matching = catalog.filter((product) => {
    if (product.status !== "published") return false;
    if (params.handle && product.handle !== params.handle) return false;
    return true;
  });

  return {
    products: matching
      .slice(offset, offset + limit)
      .map((product) => withCalculatedPrices(product, currency_code)),
    count: matching.length,
    offset,
    limit,
  };
};

export const findProductByHandle = (
  handle: string,
  params: Omit<StoreProductListParams, "handle"> = {}
): StoreProduct | undefined =>
  listProducts({ ...params, handle, limit: 1 }).products[0];
