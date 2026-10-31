import { describe, expect, it, vi } from "vitest";
import {
  createSeoBudgetPolicy,
  readSeoBudgetPolicyForDealer,
  reserveSeoSpend,
  requestPaidDataForSeo,
  resolveDealerSeoSettings,
  readCustomerForDealer,
  readOrderForDealer,
  resolveDealerFromVerifiedToken,
  createBrandTemplate,
  publishBrandTemplate,
  createDealerBrandOverride,
  resolveDealerBrand,
  type CustomerRecord,
  type OrderRecord,
  type SeoBudgetPolicy,
  type SeoSpendReservation,
} from "../../packages/contracts/dealer";
import { createVerifiedPrincipal, type DealerTokenClaims } from "../../packages/contracts/auth";
import { runFreeSeoAudit } from "../../packages/contracts/openseo";

const claims = (dealerId: string): DealerTokenClaims => ({
  sub: "user@example.com",
  dealerId,
  issuer: "lavabean-auth",
  expiresAt: 200,
});
const principalFor = (dealerId: string) =>
  createVerifiedPrincipal(claims(dealerId), { signatureValid: true, nowEpochSeconds: 100 });

const sharedStore = {
  customers: (): CustomerRecord[] => [
    { customerId: "cust-a-1", dealerId: "dealer-a", name: "Klant van A" },
    { customerId: "cust-b-1", dealerId: "dealer-b", name: "Klant van B" },
    { customerId: "cust-orphan", name: "Verkoop zonder dealer" },
  ],
  orders: (): OrderRecord[] => [
    { orderId: "order-a-1", dealerId: "dealer-a", customerId: "cust-a-1" },
    { orderId: "order-b-1", dealerId: "dealer-b", customerId: "cust-b-1" },
    { orderId: "order-orphan", customerId: "cust-orphan" },
  ],
};

const budgetPolicy = (dealerId: string): SeoBudgetPolicy =>
  createSeoBudgetPolicy({
    dealerId,
    enabled: true,
    currency: "EUR",
    periodStart: "2026-10-01T00:00:00.000Z",
    periodEnd: "2026-11-01T00:00:00.000Z",
    limitMinor: 500,
    allowedOperations: ["keyword_lookup"],
    approvalId: `approved:${dealerId}`,
    policyVersion: 1,
  });

describe("BUS-112 tenant isolation regression", () => {
  it("dealer A cannot read dealer B customers or orders from a shared store", () => {
    const actedAs = "dealer-a";
    for (const customer of sharedStore.customers()) {
      if (customer.customerId.startsWith("cust-a")) {
        expect(readCustomerForDealer(sharedStore.customers(), customer.customerId, actedAs)).toEqual(customer);
      } else {
        expect(readCustomerForDealer(sharedStore.customers(), customer.customerId, actedAs)).toBeUndefined();
      }
    }
    for (const order of sharedStore.orders()) {
      if (order.orderId.startsWith("order-a")) {
        expect(readOrderForDealer(sharedStore.orders(), order.orderId, actedAs)).toEqual(order);
      } else {
        expect(readOrderForDealer(sharedStore.orders(), order.orderId, actedAs)).toBeUndefined();
      }
    }
  });

  it("a missing or unverified tenant claim makes every read fail closed, including dealer B rows", () => {
    for (const dealerContext of ["", "   ", resolveDealerFromVerifiedToken(principalFor("dealer-a")) + "-b"]) {
      expect(readCustomerForDealer(sharedStore.customers(), "cust-b-1", dealerContext)).toBeUndefined();
      expect(readOrderForDealer(sharedStore.orders(), "order-b-1", dealerContext)).toBeUndefined();
    }
    expect(() => resolveDealerFromVerifiedToken({ verified: false, dealerId: "dealer-b" })).toThrow("Invalid dealer token");
  });

  it("SEO credentials stay per-dealer: A can never resolve B's budget, B can never resolve A's", () => {
    const policies = [budgetPolicy("dealer-a"), budgetPolicy("dealer-b")];
    const aPolicy = readSeoBudgetPolicyForDealer(policies, "dealer-a");
    const bPolicy = readSeoBudgetPolicyForDealer(policies, "dealer-b");
    expect(aPolicy?.approvalId).toBe("approved:dealer-a");
    expect(bPolicy?.approvalId).toBe("approved:dealer-b");
    expect(aPolicy).not.toEqual(bPolicy);
    expect(readSeoBudgetPolicyForDealer(policies, "dealer-c")).toBeUndefined();

    const centralDefaults = { metadata: { title: "Central" } };
    const aSettings = resolveDealerSeoSettings(
      [{ dealerId: "dealer-a", budgetPolicy: aPolicy }, { dealerId: "dealer-b", budgetPolicy: bPolicy }],
      "dealer-a",
      centralDefaults,
    );
    const bSettings = resolveDealerSeoSettings(
      [{ dealerId: "dealer-a", budgetPolicy: aPolicy }, { dealerId: "dealer-b", budgetPolicy: bPolicy }],
      "dealer-b",
      centralDefaults,
    );
    expect(aSettings.budgetPolicy?.dealerId).toBe("dealer-a");
    expect(bSettings.budgetPolicy?.dealerId).toBe("dealer-b");
    expect(resolveDealerSeoSettings([], "dealer-a", centralDefaults).budgetPolicy).toBeUndefined();
  });

  it("reservations are pooled per dealer: B's spend never blocks A and never shares A's reserve", () => {
    const aPolicy = budgetPolicy("dealer-a");
    const bPolicy = budgetPolicy("dealer-b");
    let reservations: SeoSpendReservation[] = [];
    reservations = [...reservations, reserveSeoSpend(reservations, {
      dealerId: "dealer-b",
      requestId: "req-b-1",
      estimateMinor: 500,
      policy: bPolicy,
      now: "2026-10-15T12:00:00.000Z",
      operation: "keyword_lookup",
    })];
    expect(() =>
      reserveSeoSpend(reservations, {
        dealerId: "dealer-b",
        requestId: "req-b-2",
        estimateMinor: 1,
        policy: bPolicy,
        now: "2026-10-15T12:00:00.000Z",
        operation: "keyword_lookup",
      }),
    ).toThrow("Budget limit exceeded");
    expect(() =>
      reserveSeoSpend(reservations, {
        dealerId: "dealer-a",
        requestId: "req-a-1",
        estimateMinor: 500,
        policy: aPolicy,
        now: "2026-10-15T12:00:00.000Z",
        operation: "keyword_lookup",
      }),
    ).not.toThrow();
  });

  it("a budget policy cannot be applied to another dealer even if both are approved", () => {
    for (const actingDealer of ["dealer-a", "dealer-b"]) {
      for (const policyDealer of ["dealer-a", "dealer-b"]) {
        if (actingDealer === policyDealer) continue;
        expect(() =>
          reserveSeoSpend([], {
            dealerId: actingDealer,
            requestId: "req-x",
            estimateMinor: 1,
            policy: budgetPolicy(policyDealer),
            now: "2026-10-15T12:00:00.000Z",
          }),
        ).toThrow("No approved budget for dealer");
      }
    }
  });

  it("paid SEO stays fail-closed even with an active approved budget; the free audit costs €0", async () => {
    const policy = budgetPolicy("dealer-a");
    const dispatch = vi.fn(async () => "PAID-DATA");
    for (const operation of ["keyword_lookup", "serp_lookup", "backlink_lookup"] as const) {
      await expect(
        requestPaidDataForSeo({ dealerId: "dealer-a", operation, now: policy.periodStart, dispatch }),
      ).resolves.toEqual({ status: "refused", reason: "no_approved_budget" });
    }
    expect(dispatch).not.toHaveBeenCalled();

    const audit = runFreeSeoAudit({
      hostname: "shop.example.com",
      metadata: { title: "t", description: "d" },
      sitemapUrl: "https://shop.example.com/sitemap.xml",
    });
    expect(audit.costCents).toBe(0);
    expect(audit.checks.title).toBe("pass");
  });

  it("central brand updates version forward without mutating the old version and never erase dealer data", () => {
    const v1 = createBrandTemplate({ templateId: "base", version: 1, values: { accent: "#c60", logo: "lava.svg" } });
    const overrideA = createDealerBrandOverride([], { dealerId: "dealer-a", templateId: "base", values: { accent: "#a00" } });
    const v2 = publishBrandTemplate(v1, { logo: "lava-v2.svg", typography: "sans" });
    expect(v2.version).toBe(2);
    expect(v1.version).toBe(1);
    expect(v1.values).toEqual({ accent: "#c60", logo: "lava.svg" });
    const brandAOnV1 = resolveDealerBrand(v1, [overrideA], "dealer-a");
    const brandAOnV2 = resolveDealerBrand(v2, [overrideA], "dealer-a");
    expect(brandAOnV1.templateVersion).toBe(1);
    expect(brandAOnV1.values.accent).toBe("#a00");
    expect(brandAOnV2.values.accent).toBe("#a00");
    expect(brandAOnV2.values.typography).toBe("sans");
    expect(resolveDealerBrand(v2, [overrideA], "dealer-b").values.accent).toBe("#c60");
  });
});
