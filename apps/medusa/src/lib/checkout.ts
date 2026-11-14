import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";
import {
  addShippingMethodToCartWorkflow,
  addToCartWorkflow,
  capturePaymentWorkflow,
  completeCartWorkflow,
  createCartWorkflow,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
  refundPaymentWorkflow,
  updateCartWorkflow,
} from "@medusajs/medusa/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";
import { LAVABEAN_MODULE } from "../modules/lavabean";

/**
 * Shopper-facing order projection. Medusa remains the order record.
 * Amounts at or below 100 are major-unit euros (the seed prices). Larger
 * integers are already cents. This catalog has no 100 euro price.
 */
export const toCents = (amount: number) => {
  if (!Number.isFinite(amount)) {
    throw new SandboxError("Medusa returned a price that is not a number", 500, "price_unreadable");
  }
  if (amount <= 100) return Math.round(amount * 100);
  return Math.round(amount);
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value === "object") {
    const record = value as { numeric?: unknown; value?: unknown; raw?: { value?: unknown } };
    if ("numeric" in record) return toNumber(record.numeric);
    if ("value" in record) return toNumber(record.value);
    if (record.raw) return toNumber(record.raw.value);
  }
  return undefined;
};

export class SandboxError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "SandboxError";
  }
}

export interface PublicOrder {
  id: string;
  status: "paid" | "failed" | "refunded";
  currency: "eur";
  items: Array<{
    slug: string;
    variantId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  totalCents: number;
  customer: { name: string; email: string };
  shipping: { line1: string; postalCode: string; city: string; country: string };
  payment: { provider: "manual"; paymentId: string; status: "paid" | "failed" | "refunded" };
  medusaOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  refundReason?: string;
  refundedAt?: string;
}

interface CheckoutBody {
  items?: Array<{ slug?: string; variantId?: string; quantity?: number; priceCents?: number }>;
  customer?: { name?: string; email?: string };
  shipping?: { line1?: string; postalCode?: string; city?: string; country?: string };
  idempotencyKey?: string;
  paymentOutcome?: "paid" | "failed";
}

interface CatalogVariant {
  fixture_variant_id: string;
  sku: string;
  prices: Array<{ amount: number; currency_code: string }>;
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const catalogBySku = () => {
  const catalog = JSON.parse(
    readFileSync(join(process.cwd(), "src/data/catalog.json"), "utf8"),
  ) as Array<{ variants: CatalogVariant[] }>;
  const bySku = new Map<string, number>();
  for (const product of catalog) {
    for (const variant of product.variants) {
      const price = variant.prices.find((item) => item.currency_code === "eur");
      if (price) bySku.set(variant.sku, price.amount);
    }
  }
  return bySku;
};

const serviceOf = (container: MedusaContainer) => container.resolve(LAVABEAN_MODULE) as any;

const queryOf = (container: MedusaContainer) => container.resolve(ContainerRegistrationKeys.QUERY);

const readNamespaceHeader = (header: string | string[] | undefined, token: string | string[] | undefined) => {
  const configured = process.env.LAVABEAN_INTERNAL_TOKEN ?? "";
  const provided = Array.isArray(token) ? token[0] : token;
  const requested = Array.isArray(header) ? header[0] : header;
  if (
    configured &&
    provided === configured &&
    typeof requested === "string" &&
    requested.length > 0 &&
    requested.length < 400
  ) {
    return requested;
  }
  return "default";
};

export const namespaceFrom = (headers: Record<string, string | string[] | undefined>) =>
  readNamespaceHeader(headers["x-lavabean-namespace"], headers["x-lavabean-internal-token"]);

const priceAmount = (variant: any) => {
  const prices = Array.isArray(variant?.prices)
    ? variant.prices
    : Array.isArray(variant?.price_set?.prices)
      ? variant.price_set.prices
      : [];
  const eur = prices.find((price: any) => price?.currency_code === "eur") ?? prices[0];
  const amount = toNumber(eur?.amount);
  if (amount === undefined) return undefined;
  const expected = catalogBySku().get(variant.sku);
  if (expected !== undefined) {
    const cents = Math.round(expected * 100);
    if (Math.abs(amount - expected) < 0.001 || Math.abs(amount - cents) < 0.001) return toCents(amount);
  }
  return toCents(amount);
};

const loadProducts = async (container: MedusaContainer) => {
  const query = queryOf(container);
  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "status",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.metadata",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "variants.price_set.prices.amount",
      "variants.price_set.prices.currency_code",
    ],
  });
  return (data ?? []) as any[];
};

const resolveLines = (products: any[], items: CheckoutBody["items"]) => {
  const lines = (items ?? []).map((item) => {
    const rawSlug = text(item.slug);
    let handle = rawSlug;
    let variantKey = text(item.variantId);
    if (rawSlug.includes("--")) {
      const splitAt = rawSlug.indexOf("--");
      handle = rawSlug.slice(0, splitAt);
      if (!variantKey) variantKey = rawSlug.slice(splitAt + 2);
    }
    if (!handle) throw new SandboxError("Each cart line needs a product", 400, "unknown_product");
    if (!Number.isInteger(item.quantity) || (item.quantity ?? 0) < 1 || (item.quantity ?? 0) > 99) {
      throw new SandboxError("Quantity must be a whole number from 1 to 99", 400, "invalid_quantity");
    }
    const product = products.find((candidate) => candidate.handle === handle && candidate.status !== "draft");
    if (!product) throw new SandboxError("Unknown product", 400, "unknown_product");
    const variants = product.variants ?? [];
    if (!variantKey) {
      if (variants.length !== 1) throw new SandboxError("Choose a size", 400, "variant_required");
      variantKey = variants[0].id;
    }
    const variant = variants.find((candidate: any) => {
      const fixtureId = candidate.metadata?.fixture_variant_id;
      return candidate.id === variantKey || candidate.sku === variantKey || fixtureId === variantKey;
    });
    if (!variant) throw new SandboxError("Unknown size", 400, "unknown_variant");
    const unitPriceCents = priceAmount(variant);
    if (unitPriceCents === undefined) {
      throw new SandboxError("No EUR price for this size", 400, "unknown_variant");
    }
    return {
      slug: product.handle,
      variantId: String(variant.metadata?.fixture_variant_id ?? variant.id),
      medusaVariantId: variant.id as string,
      sku: variant.sku as string,
      name: `${product.title} (${variant.title})`,
      quantity: item.quantity as number,
      unitPriceCents,
    };
  });
  return lines;
};

const customerOf = (input: CheckoutBody["customer"]) => {
  const name = text(input?.name);
  const email = text(input?.email);
  if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new SandboxError("A name and email are required", 400, "invalid_customer");
  }
  return { name, email };
};

const shippingOf = (input: CheckoutBody["shipping"]) => {
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
    throw new SandboxError("A shipping address is required", 400, "invalid_shipping");
  }
  if (!/^[A-Za-z]{2}$/.test(shipping.country)) {
    throw new SandboxError("Country must be a two-letter code", 400, "invalid_shipping");
  }
  return shipping;
};

const fingerprintOf = (
  lines: Array<{ variantId: string; quantity: number }>,
  customer: PublicOrder["customer"],
  shipping: PublicOrder["shipping"],
  paymentOutcome: "paid" | "failed",
) =>
  JSON.stringify({
    items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
    customer,
    shipping,
    paymentOutcome,
  });

const allocatePublicId = async (container: MedusaContainer) => {
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any;
  const updated = await knex("order_number").whereNull("deleted_at").increment("next_value", 1).returning("next_value");
  const row = Array.isArray(updated) ? updated[0] : updated;
  const next = toNumber(row?.next_value ?? row);
  if (next === undefined) {
    throw new SandboxError("Order number counter is missing. Run the Medusa seed.", 500, "order_counter_missing");
  }
  return `LB-${next - 1}`;
};

const projectionOf = (record: any): PublicOrder => record.projection as PublicOrder;

const findByScope = async (container: MedusaContainer, scopeKey: string) => {
  const rows = await serviceOf(container).listCheckoutRecords({ scope_key: scopeKey });
  return rows?.[0];
};

const findByPublicId = async (container: MedusaContainer, namespace: string, publicId: string) => {
  const rows = await serviceOf(container).listCheckoutRecords({ namespace, public_id: publicId });
  return rows?.[0];
};

const commerceContext = async (container: MedusaContainer) => {
  const query = queryOf(container);
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code", "name"],
  });
  const region = (regions ?? []).find((item: any) => item.currency_code === "eur");
  if (!region) throw new SandboxError("No EUR region is seeded", 500, "region_missing");

  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  const channel =
    (channels ?? []).find((item: { name?: string }) => item.name === "Lava Bean") ?? (channels ?? [])[0];
  if (!channel) throw new SandboxError("No sales channel is seeded", 500, "sales_channel_missing");

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  });
  const shipping = (options ?? []).find((item: any) => item.name === "Lava Bean shipping") ?? (options ?? [])[0];
  if (!shipping) throw new SandboxError("No shipping option is seeded", 500, "shipping_missing");
  return { regionId: region.id as string, salesChannelId: channel.id as string, shippingOptionId: shipping.id as string };
};

const splitName = (name: string) => {
  const [first, ...rest] = name.split(/\s+/);
  return { first_name: first, last_name: rest.join(" ") || "-" };
};

const placePaidCart = async (
  container: MedusaContainer,
  lines: Array<{ medusaVariantId: string; quantity: number; unitPriceCents: number }>,
  customer: PublicOrder["customer"],
  shipping: PublicOrder["shipping"],
  publicId: string,
) => {
  const { regionId, salesChannelId, shippingOptionId } = await commerceContext(container);
  const { first_name, last_name } = splitName(customer.name);
  const address = {
    first_name,
    last_name,
    address_1: shipping.line1,
    city: shipping.city,
    country_code: shipping.country.toLowerCase(),
    postal_code: shipping.postalCode,
  };

  const { result: cart } = await createCartWorkflow(container).run({
    input: {
      region_id: regionId,
      sales_channel_id: salesChannelId,
      email: customer.email,
      currency_code: "eur",
      metadata: { public_id: publicId },
    },
  });

  await updateCartWorkflow(container).run({
    input: {
      id: cart.id,
      email: customer.email,
      shipping_address: address,
      billing_address: address,
    },
  });

  await addToCartWorkflow(container).run({
    input: {
      cart_id: cart.id,
      items: lines.map((line) => ({ variant_id: line.medusaVariantId, quantity: line.quantity })),
    },
  });

  const query = queryOf(container);
  const priced = await query.graph({
    entity: "cart",
    fields: ["id", "total", "item_subtotal", "shipping_total", "items.unit_price", "items.quantity", "items.variant_id"],
    filters: { id: cart.id },
  });
  const pricedCart = priced.data?.[0] as any;
  const expected = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const itemTotal = toNumber(pricedCart?.item_subtotal ?? pricedCart?.total);
  if (itemTotal !== undefined && toCents(itemTotal) !== expected) {
    throw new SandboxError(
      `Medusa cart total ${itemTotal} does not match the catalog total of ${expected} cents`,
      409,
      "price_mismatch",
    );
  }

  await addShippingMethodToCartWorkflow(container).run({
    input: { cart_id: cart.id, options: [{ id: shippingOptionId }] },
  });

  const { result: collection } = await createPaymentCollectionForCartWorkflow(container).run({
    input: { cart_id: cart.id },
  });

  await createPaymentSessionsWorkflow(container).run({
    input: {
      payment_collection_id: collection.id,
      provider_id: "pp_system_default",
    },
  });

  const { result: completed } = await completeCartWorkflow(container).run({
    input: { id: cart.id },
  });

  const orderRead = await query.graph({
    entity: "order",
    fields: [
      "id",
      "payment_status",
      "payment_collections.payments.id",
      "payment_collections.payments.captured_at",
    ],
    filters: { id: completed.id },
  });
  const order = orderRead.data?.[0] as any;
  const payment = order?.payment_collections?.[0]?.payments?.[0];
  const paymentId = payment?.id as string | undefined;
  if (!paymentId || !String(paymentId).startsWith("pay_")) {
    throw new SandboxError("Medusa completed the cart without a payment", 500, "payment_missing");
  }
  if (!payment.captured_at) {
    await capturePaymentWorkflow(container).run({ input: { payment_id: paymentId } });
  }
  return { medusaOrderId: completed.id as string, paymentId };
};

export const placeCheckout = async (container: MedusaContainer, namespace: string, body: CheckoutBody) => {
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) throw new SandboxError("Cart is empty", 400, "empty_cart");
  const idempotencyKey = text(body.idempotencyKey);
  if (!/^[A-Za-z0-9_.:-]{8,80}$/.test(idempotencyKey)) {
    throw new SandboxError("A stable idempotency key is required", 400, "invalid_idempotency");
  }
  const paymentOutcome = body.paymentOutcome === "failed" ? "failed" : "paid";
  const products = await loadProducts(container);
  const lines = resolveLines(products, items);
  const customer = customerOf(body.customer);
  const shipping = shippingOf(body.shipping);
  const fingerprint = fingerprintOf(lines, customer, shipping, paymentOutcome);
  const scopeKey = `${namespace}::${idempotencyKey}`;
  const existing = await findByScope(container, scopeKey);
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      throw new SandboxError("This checkout key was already used for a different order", 409, "idempotency_conflict");
    }
    return projectionOf(existing);
  }

  const publicId = await allocatePublicId(container);
  const now = new Date().toISOString();
  const totalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);

  if (paymentOutcome === "failed") {
    const projection: PublicOrder = {
      id: publicId,
      status: "failed",
      currency: "eur",
      items: lines.map(({ medusaVariantId: _ignored, ...line }) => line),
      totalCents,
      customer,
      shipping,
      payment: { provider: "manual", paymentId: `manual_${publicId}`, status: "failed" },
      medusaOrderId: null,
      createdAt: now,
      updatedAt: now,
    };
    await serviceOf(container).createCheckoutRecords({
      scope_key: scopeKey,
      namespace,
      idempotency_key: idempotencyKey,
      fingerprint,
      public_id: publicId,
      status: "failed",
      medusa_order_id: null,
      payment_id: null,
      projection,
    });
    return projection;
  }

  const paid = await placePaidCart(container, lines, customer, shipping, publicId);
  const projection: PublicOrder = {
    id: publicId,
    status: "paid",
    currency: "eur",
    items: lines.map(({ medusaVariantId: _ignored, ...line }) => line),
    totalCents,
    customer,
    shipping,
    payment: { provider: "manual", paymentId: `manual_${paid.paymentId}`, status: "paid" },
    medusaOrderId: paid.medusaOrderId,
    createdAt: now,
    updatedAt: now,
  };
  await serviceOf(container).createCheckoutRecords({
    scope_key: scopeKey,
    namespace,
    idempotency_key: idempotencyKey,
    fingerprint,
    public_id: publicId,
    status: "paid",
    medusa_order_id: paid.medusaOrderId,
    payment_id: paid.paymentId,
    projection,
  });
  return projection;
};

export const getCheckout = async (container: MedusaContainer, namespace: string, publicId: string) => {
  const id = text(publicId);
  if (!id) return undefined;
  const record = await findByPublicId(container, namespace, id);
  return record ? projectionOf(record) : undefined;
};

export const refundCheckout = async (
  container: MedusaContainer,
  namespace: string,
  publicId: string,
  reason: string,
) => {
  const record = await findByPublicId(container, namespace, text(publicId));
  if (!record) return { ok: false as const, error: "order_not_found" as const };
  if (record.status === "refunded") {
    return { ok: false as const, error: "already_refunded" as const, status: "refunded" as const };
  }
  if (record.status !== "paid" || !record.payment_id) {
    return { ok: false as const, error: "not_refundable" as const };
  }
  await refundPaymentWorkflow(container).run({
    input: {
      payment_id: record.payment_id,
      note: reason,
      idempotency_key: `refund:${record.public_id}`,
    },
  });
  const refundedAt = new Date().toISOString();
  const projection = projectionOf(record);
  projection.status = "refunded";
  projection.payment.status = "refunded";
  projection.refundReason = reason;
  projection.refundedAt = refundedAt;
  projection.updatedAt = refundedAt;
  await serviceOf(container).updateCheckoutRecords({
    id: record.id,
    status: "refunded",
    projection,
  });
  return { ok: true as const, status: "refunded" as const, refundedAt };
};

export interface WebhookBody {
  id?: string;
  orderId?: string;
  status?: "paid" | "failed";
  paymentId?: string;
}

export const applyWebhook = async (container: MedusaContainer, namespace: string, body: WebhookBody) => {
  const eventId = text(body.id);
  const publicId = text(body.orderId);
  if (!eventId || !publicId) {
    throw new SandboxError("Webhook id and orderId are required", 400, "invalid_webhook");
  }
  const record = await findByPublicId(container, namespace, publicId);
  if (!record) return { applied: false as const, error: "order_not_found" as const };
  if (record.status === "refunded") {
    return { applied: false as const, error: "already_refunded" as const };
  }
  if (record.status === "failed") {
    return { applied: false as const, error: "not_payable" as const };
  }
  const seen = await serviceOf(container).listWebhookEvents({ event_id: eventId });
  if (seen?.length) return { applied: false as const };
  try {
    await serviceOf(container).createWebhookEvents({
      event_id: eventId,
      public_id: publicId,
      outcome: body.status === "failed" ? "failed" : "paid",
    });
  } catch (error) {
    if (error instanceof MedusaError && error.type === MedusaError.Types.DUPLICATE_ERROR) {
      return { applied: false as const };
    }
    const message = error instanceof Error ? error.message : "";
    if (/duplicate|unique/i.test(message)) return { applied: false as const };
    throw error;
  }
  return { applied: true as const };
};
