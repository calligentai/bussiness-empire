import { medusaHeaders, medusaRuntime } from "./medusa-client";

/**
 * Storefront checkout against Medusa.
 *
 * Prices, the cart, the manual payment (pp_system_default), and the order
 * live in Medusa. This module refuses live keys before that call. Stripe and
 * Mollie stay unwired. Nothing here calls an AI gateway.
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
  status: "paid" | "failed" | "refunded";
  currency: "eur";
  items: StoredOrderItem[];
  totalCents: number;
  customer: { name: string; email: string };
  shipping: { line1: string; postalCode: string; city: string; country: string };
  payment: {
    provider: "manual";
    paymentId: string;
    status: "paid" | "failed" | "refunded";
  };
  medusaOrderId: string | null;
  createdAt: string;
  updatedAt: string;
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

const namespaceOf = (options: StoreOptions) => options.dataDir || "default";

export const placeOrder = async (input: PlaceOrderInput, options: StoreOptions = {}): Promise<StoredOrder> => {
  const env = options.env ?? {};
  assertSandbox(env);
  const runtime = medusaRuntime();
  const response = await fetch(`${runtime.backendUrl}/store/lavabean/checkout`, {
    method: "POST",
    headers: medusaHeaders(namespaceOf(options)),
    body: JSON.stringify(input),
  });
  const body = (await response.json()) as StoredOrder & { message?: string; code?: string };
  if (!response.ok) {
    throw new CheckoutError(body.message || "Checkout failed", response.status, body.code || "checkout_failed");
  }
  return body;
};

export const getOrder = async (id: string, options: StoreOptions = {}): Promise<StoredOrder | undefined> => {
  const orderId = text(id);
  if (!orderId) return undefined;
  const runtime = medusaRuntime();
  const response = await fetch(
    `${runtime.backendUrl}/store/lavabean/orders/${encodeURIComponent(orderId)}`,
    { headers: medusaHeaders(namespaceOf(options)) },
  );
  if (response.status === 404) return undefined;
  const body = (await response.json()) as StoredOrder & { message?: string; code?: string };
  if (!response.ok) {
    throw new CheckoutError(body.message || "Order lookup failed", response.status, body.code || "order_lookup_failed");
  }
  return body;
};
