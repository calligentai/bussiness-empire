import { describe, expect, it, vi } from "vitest";
import {
  createDealer,
  createDealerDomain,
  resolveDealerForHostname,
  readCustomerForDealer,
  readOrderForDealer,
  type CustomerRecord,
  type DealerDomain,
  type Dealer,
  type OrderRecord,
  resolveDealerBrand,
  createBrandTemplate,
  createDealerBrandOverride,
  resolveDealerSeoSettings,
} from "../../packages/contracts/dealer";
import { createVerifiedPrincipal, type VerifiedPrincipal } from "../../packages/contracts/auth";
import { requestPaidDataForSeo } from "../../packages/contracts/dealer";

/* Sandbox-only two-dealer checkout-to-dashboard integration regression.
 * All fixtures are fictional; no servers, no real customer data, no payment, no paid APIs.
 * The store mimics the shared data layer every dealer flows through. */

type SandboxItem = { variantId: string; amountMinor: number };

const checkoutCustomer = (dealerId: string, customerId: string, name: string): CustomerRecord => ({
  customerId,
  dealerId,
  name,
});

function placeOrder(
  principal: VerifiedPrincipal,
  customer: CustomerRecord | undefined,
  items: SandboxItem[],
): OrderRecord {
  if (!principal.verified || !principal.dealerId.trim()) throw new Error("Checkout requires a verified dealer session");
  if (!customer || customer.dealerId !== principal.dealerId) throw new Error("Checkout customer is outside the active dealer");
  if (!items.length) throw new Error("Checkout requires items");
  const orderId = `order-${principal.dealerId}-${customer.customerId}`;
  return { orderId, dealerId: principal.dealerId, customerId: customer.customerId };
}

describe("BUS-117 sandbox two-dealer checkout-to-dashboard isolation", () => {
  const dealer = (dealerId: string, displayName: string, hostname: string): { dealer: Dealer; domain: DealerDomain } => {
    const dealerRecord = createDealer({ dealerId, slug: dealerId, legalName: `${displayName} B.V. (sandbox)`, displayName });
    const domain = createDealerDomain([], { domainId: `domain-${dealerId}`, dealerId, hostname });
    return { dealer: dealerRecord, domain };
  };

  const a = dealer("dealer-a", "Dealer A", "shopa.sandbox.example");
  const b = dealer("dealer-b", "Dealer B", "shopb.sandbox.example");
  const domains: DealerDomain[] = [
    { ...a.domain, verificationStatus: "verified", verifiedAt: "2026-10-31T00:00:00.000Z" },
    { ...b.domain, verificationStatus: "verified", verifiedAt: "2026-10-31T00:00:00.000Z" },
  ];
  const principalFor = (hostDealerId: string): VerifiedPrincipal =>
    createVerifiedPrincipal(
      { sub: "sandbox-user", dealerId: hostDealerId, issuer: "lavabean-auth", expiresAt: 200 },
      { signatureValid: true, nowEpochSeconds: 100 },
    );

  it("each dealer checks out its own sandbox customer and the order lands scoped to that dealer", () => {
    const custA = checkoutCustomer(principalFor("dealer-a").dealerId, "cust-a-sandbox", "Sandboxklant A");
    const orderA = placeOrder(principalFor("dealer-a"), custA, [{ variantId: "variant_lb250-sandbox", amountMinor: 2500 }]);
    expect(orderA).toEqual({ orderId: "order-dealer-a-cust-a-sandbox", dealerId: "dealer-a", customerId: "cust-a-sandbox" });
    const custB = checkoutCustomer(principalFor("dealer-b").dealerId, "cust-b-sandbox", "Sandboxklant B");
    const orderB = placeOrder(principalFor("dealer-b"), custB, [{ variantId: "variant_lb500-sandbox", amountMinor: 5000 }]);
    expect(orderB.dealerId).toBe("dealer-b");
  });

  it("a checkout cannot attach dealer B's customer to dealer A's session", () => {
    const custB = checkoutCustomer("dealer-b", "cust-b-sandbox", "Sandboxklant B");
    expect(() => placeOrder(principalFor("dealer-a"), custB, [{ variantId: "variant_lb250-sandbox", amountMinor: 2500 }])).toThrow(
      "Checkout customer is outside the active dealer",
    );
    const custOrphan = checkoutCustomer("", "cust-orphan-sandbox", "Unscoped sandbox customer");
    expect(() => placeOrder(principalFor("dealer-a"), custOrphan, [{ variantId: "variant_lb250-sandbox", amountMinor: 2500 }])).toThrow(
      "Checkout customer is outside the active dealer",
    );
    expect(() => placeOrder(principalFor("dealer-a"), undefined, [{ variantId: "variant_lb250-sandbox", amountMinor: 2500 }])).toThrow(
      "Checkout customer is outside the active dealer",
    );
  });

  it("with both orders in one shared store, dealer A cannot read dealer B's order and vice versa", () => {
    const orders: OrderRecord[] = [
      { orderId: "order-dealer-a-cust-a-sandbox", dealerId: "dealer-a", customerId: "cust-a-sandbox" },
      { orderId: "order-dealer-b-cust-b-sandbox", dealerId: "dealer-b", customerId: "cust-b-sandbox" },
      { orderId: "order-ghost-sandbox", customerId: "cust-ghost-sandbox" },
    ];
    expect(readOrderForDealer(orders, "order-dealer-b-cust-b-sandbox", "dealer-a")).toBeUndefined();
    expect(readOrderForDealer(orders, "order-dealer-a-cust-a-sandbox", "dealer-b")).toBeUndefined();
    expect(readOrderForDealer(orders, "order-ghost-sandbox", "dealer-a")).toBeUndefined();
    expect(readOrderForDealer(orders, "order-dealer-a-cust-a-sandbox", "dealer-a")).toEqual(orders[0]);
    const customers: CustomerRecord[] = [checkoutCustomer("dealer-a", "cust-a-sandbox", "Sandboxklant A"), checkoutCustomer("dealer-b", "cust-b-sandbox", "Sandboxklant B")];
    expect(readCustomerForDealer(customers, "cust-b-sandbox", "dealer-a")).toBeUndefined();
  });

  it("dashboard routing cannot elevate: a hostname resolves to exactly its own dealer and a pending domain to nobody", () => {
    expect(resolveDealerForHostname(domains, "SHOpa.SANDBOX.example")).toBe("dealer-a");
    expect(resolveDealerForHostname(domains, "shopb.sandbox.example")).toBe("dealer-b");
    const pendingDomain = createDealerDomain([], { domainId: "domain-c", dealerId: "dealer-a", hostname: "shopc.sandbox.example" });
    expect(resolveDealerForHostname([pendingDomain], "shopc.sandbox.example")).toBeUndefined();

    const resolvedDealerId = resolveDealerForHostname(domains, "shopa.sandbox.example");
    const customers = [checkoutCustomer("dealer-a", "cust-a-sandbox", "Sandboxklant A"), checkoutCustomer("dealer-b", "cust-b-sandbox", "Sandboxklant B")];
    expect(readCustomerForDealer(customers, "cust-b-sandbox", resolvedDealerId ?? "")).toBeUndefined();
  });

  it("the dealer dashboard composes only that dealer's own brand, SEO settings and orders", () => {
    const template = createBrandTemplate({ templateId: "base", version: 2, values: { accent: "#c60", logo: "lava.svg" } });
    const overrideA = createDealerBrandOverride([], { dealerId: "dealer-a", templateId: "base", values: { accent: "#a00" } });
    const seoSettings = [{ dealerId: "dealer-a", budgetPolicy: undefined }];
    const orders: OrderRecord[] = [
      { orderId: "order-dealer-a-cust-a-sandbox", dealerId: "dealer-a", customerId: "cust-a-sandbox" },
      { orderId: "order-dealer-b-cust-b-sandbox", dealerId: "dealer-b", customerId: "cust-b-sandbox" },
    ];
    const dashboards = orders.map((order) => order.orderId);
    const dashboardFor = (dealerId: string) => ({
      brand: resolveDealerBrand(template, [overrideA], dealerId),
      seo: resolveDealerSeoSettings(seoSettings, dealerId, { metadata: { title: "Central sandbox" } }),
      mine: dashboards.filter((id) => readOrderForDealer(orders, id, dealerId)),
      unreadable: [dashboards[0], dashboards[1]].filter((id) => !readOrderForDealer(orders, id, dealerId)),
    });
    const dashboardA = dashboardFor("dealer-a");
    expect(dashboardA.brand.values.accent).toBe("#a00");
    expect(dashboardA.mine).toEqual(["order-dealer-a-cust-a-sandbox"]);
    expect(dashboardA.unreadable).toEqual(["order-dealer-b-cust-b-sandbox"]);
    const dashboardB = dashboardFor("dealer-b");
    expect(dashboardB.brand.values.accent).toBe("#c60");
    expect(dashboardB.seo.budgetPolicy).toBeUndefined();
    expect(dashboardB.mine).toEqual(["order-dealer-b-cust-b-sandbox"]);
    expect(dashboardB.unreadable).toEqual(["order-dealer-a-cust-a-sandbox"]);
  });

  it("the paid data surface stays closed end-to-end in the sandbox (€0 free tier only)", async () => {
    const dispatch = vi.fn(async () => "PAID");
    await expect(
      requestPaidDataForSeo({ dealerId: "dealer-a", operation: "keyword_lookup", now: "2026-10-31T00:00:00.000Z", dispatch }),
    ).resolves.toEqual({ status: "refused", reason: "no_approved_budget" });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
