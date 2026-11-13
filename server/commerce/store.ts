import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  calculateVariantPrice,
  findProductByHandle,
} from "../../data/medusa-catalog";

/**
 * Local commerce store for the M3 sandbox order.
 *
 * Prices come from the in-repo Medusa-shaped catalog. Payment is the manual
 * provider (Medusa's system provider, pp_system_default): one authorize+capture
 * with no card network. Stripe and Mollie are refused until a real sandbox
 * client exists. This module is not a Medusa server.
 */

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

export interface StoredOrderItem {
  slug: string;
  variantId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface StoredOrder {
  id: string;
  status: "paid" | "failed";
  currency: "eur";
  items: StoredOrderItem[];
  totalCents: number;
  customer: { name: string; email: string };
  shipping: { line1: string; postalCode: string; city: string; country: string };
  payment: {
    provider: "manual";
    paymentId: string;
    status: "paid" | "failed";
  };
  createdAt: string;
  updatedAt: string;
}

interface StoreFile {
  nextNumber: number;
  orders: Record<string, StoredOrder>;
  idempotency: Record<string, { orderId: string; fingerprint: string }>;
}

export interface PlaceOrderInput {
  items?: Array<{ slug?: string; variantId?: string; quantity?: number; priceCents?: number }>;
  customer?: { name?: string; email?: string };
  shipping?: { line1?: string; postalCode?: string; city?: string; country?: string };
  idempotencyKey?: string;
  paymentOutcome?: "paid" | "failed";
}

export interface StoreOptions {
  dataDir?: string;
  env?: NodeJS.ProcessEnv;
}

const locks = new Map<string, Promise<unknown>>();

const emptyStore = (): StoreFile => ({ nextNumber: 100001, orders: {}, idempotency: {} });

export const commerceDataDir = (options: StoreOptions = {}) => {
  if (options.dataDir) return options.dataDir;
  const configured = options.env?.ORDER_DATA_DIR?.trim();
  if (configured) return configured;
  return join(tmpdir(), "lavabean-orders");
};

const withLock = async <T>(dir: string, fn: () => T): Promise<T> => {
  const previous = locks.get(dir) ?? Promise.resolve();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(
    dir,
    previous.then(() => gate, () => gate),
  );
  await previous.catch(() => undefined);
  try {
    return fn();
  } finally {
    release();
  }
};

const readStore = (dir: string): StoreFile => {
  try {
    const parsed = JSON.parse(readFileSync(join(dir, "orders.json"), "utf8")) as StoreFile;
    if (!parsed || typeof parsed !== "object" || !parsed.orders || !parsed.idempotency) {
      return emptyStore();
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyStore();
    throw error;
  }
};

const writeStore = (dir: string, store: StoreFile) => {
  mkdirSync(dir, { recursive: true });
  const temporary = join(dir, `orders.${process.pid}.tmp`);
  writeFileSync(temporary, JSON.stringify(store));
  renameSync(temporary, join(dir, "orders.json"));
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const assertSandbox = (env: NodeJS.ProcessEnv) => {
  const appEnv = text(env.APP_ENV) || "development";
  if (appEnv === "production") {
    throw new CheckoutError(
      "Sandbox checkout is disabled when APP_ENV is production",
      403,
      "production_disabled",
    );
  }

  const stripe = text(env.STRIPE_SECRET_KEY);
  const mollie = text(env.MOLLIE_API_KEY);
  if (stripe.startsWith("sk_live_") || stripe.startsWith("rk_live_") || mollie.startsWith("live_")) {
    throw new CheckoutError("Live payment keys are refused", 403, "live_payment_refused");
  }

  const provider = (text(env.PAYMENT_PROVIDER) || "manual").toLowerCase();
  if (provider === "manual" || provider === "pp_system_default") return;
  if (provider === "stripe") {
    throw new CheckoutError(
      "Stripe test mode is not called by this build. Set PAYMENT_PROVIDER=manual. Stripe test would use STRIPE_SECRET_KEY=sk_test_... and STRIPE_WEBHOOK_SECRET.",
      501,
      "stripe_test_unwired",
    );
  }
  if (provider === "mollie") {
    throw new CheckoutError(
      "Mollie test mode is not called by this build. Set PAYMENT_PROVIDER=manual. Mollie test would use MOLLIE_API_KEY=test_...",
      501,
      "mollie_test_unwired",
    );
  }
  throw new CheckoutError("Unknown payment provider", 400, "unknown_provider");
};

const resolveLine = (item: { slug?: string; variantId?: string; quantity?: number }): StoredOrderItem => {
  const rawSlug = text(item.slug);
  let handle = rawSlug;
  let variantId = text(item.variantId);
  if (rawSlug.includes("--")) {
    const splitAt = rawSlug.indexOf("--");
    handle = rawSlug.slice(0, splitAt);
    if (!variantId) variantId = rawSlug.slice(splitAt + 2);
  }
  if (!handle) {
    throw new CheckoutError("Each cart line needs a product", 400, "unknown_product");
  }
  if (!Number.isInteger(item.quantity) || (item.quantity ?? 0) < 1 || (item.quantity ?? 0) > 99) {
    throw new CheckoutError("Quantity must be a whole number from 1 to 99", 400, "invalid_quantity");
  }

  const product = findProductByHandle(handle);
  if (!product) {
    throw new CheckoutError("Unknown product", 400, "unknown_product");
  }
  if (!variantId) {
    if (product.variants.length !== 1) {
      throw new CheckoutError("Choose a size", 400, "variant_required");
    }
    variantId = product.variants[0].id;
  }
  const variant = product.variants.find((candidate) => candidate.id === variantId);
  if (!variant) {
    throw new CheckoutError("Unknown size", 400, "unknown_variant");
  }
  const price = calculateVariantPrice(variant, { currency_code: "eur", quantity: item.quantity });
  if (!price) {
    throw new CheckoutError("No EUR price for this size", 400, "unknown_variant");
  }

  return {
    slug: product.handle,
    variantId: variant.id,
    sku: variant.sku,
    name: `${product.title} (${variant.title})`,
    quantity: item.quantity as number,
    unitPriceCents: Math.round(price.calculated_amount * 100),
  };
};

const customerOf = (input: PlaceOrderInput["customer"]) => {
  const name = text(input?.name);
  const email = text(input?.email);
  if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CheckoutError("A name and email are required", 400, "invalid_customer");
  }
  return { name, email };
};

const shippingOf = (input: PlaceOrderInput["shipping"]) => {
  const shipping = {
    line1: text(input?.line1),
    postalCode: text(input?.postalCode),
    city: text(input?.city),
    country: text(input?.country),
  };
  if (
    shipping.line1.length < 4 ||
    shipping.postalCode.length < 2 ||
    shipping.city.length < 2 ||
    shipping.country.length < 2
  ) {
    throw new CheckoutError("A shipping address is required", 400, "invalid_shipping");
  }
  return shipping;
};

const fingerprintOf = (
  lines: StoredOrderItem[],
  customer: StoredOrder["customer"],
  shipping: StoredOrder["shipping"],
  paymentOutcome: "paid" | "failed",
) =>
  JSON.stringify({
    items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
    customer,
    shipping,
    paymentOutcome,
  });

export const placeOrder = async (input: PlaceOrderInput, options: StoreOptions = {}): Promise<StoredOrder> => {
  const env = options.env ?? {};
  assertSandbox(env);

  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) {
    throw new CheckoutError("Cart is empty", 400, "empty_cart");
  }
  const idempotencyKey = text(input.idempotencyKey);
  if (!/^[A-Za-z0-9_.:-]{8,80}$/.test(idempotencyKey)) {
    throw new CheckoutError("A stable idempotency key is required", 400, "invalid_idempotency");
  }
  const paymentOutcome = input.paymentOutcome === "failed" ? "failed" : "paid";
  const lines = items.map((item) => resolveLine(item));
  const customer = customerOf(input.customer);
  const shipping = shippingOf(input.shipping);
  const fingerprint = fingerprintOf(lines, customer, shipping, paymentOutcome);
  const totalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const dir = commerceDataDir(options);

  return withLock(dir, () => {
    const store = readStore(dir);
    const existing = store.idempotency[idempotencyKey];
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new CheckoutError(
          "This checkout key was already used for a different order",
          409,
          "idempotency_conflict",
        );
      }
      const previous = store.orders[existing.orderId];
      if (!previous) {
        throw new CheckoutError("Stored order is missing", 500, "order_missing");
      }
      return previous;
    }

    const id = `LB-${store.nextNumber}`;
    const now = new Date().toISOString();
    const order: StoredOrder = {
      id,
      status: paymentOutcome,
      currency: "eur",
      items: lines,
      totalCents,
      customer,
      shipping,
      payment: {
        provider: "manual",
        paymentId: `manual_${id}`,
        status: paymentOutcome,
      },
      createdAt: now,
      updatedAt: now,
    };
    store.nextNumber += 1;
    store.orders[id] = order;
    store.idempotency[idempotencyKey] = { orderId: id, fingerprint };
    writeStore(dir, store);
    return order;
  });
};

export const getOrder = async (id: string, options: StoreOptions = {}): Promise<StoredOrder | undefined> => {
  const orderId = text(id);
  if (!orderId) return undefined;
  const dir = commerceDataDir(options);
  return withLock(dir, () => readStore(dir).orders[orderId]);
};
