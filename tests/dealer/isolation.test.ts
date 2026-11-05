import { describe, expect, it } from "vitest";
import {
  createDealer,
  createDealerDomain,
  grantDealerRole,
  readCustomerForDealer,
  resolveDealerForHostname,
  readOrderForDealer,
  resolveDealerFromVerifiedToken,
  type CustomerRecord,
  type DealerDomain,
  type DealerMembership,
  type OrderRecord,
} from "../../packages/contracts/dealer";
import { createVerifiedPrincipal } from "../../packages/contracts/auth";

describe("dealer isolation contracts", () => {
  it("accepts only valid, unexpired signed dealer claims", () => {
    expect(
      createVerifiedPrincipal(
        { sub: "user-a", dealerId: "dealer-a", issuer: "lavabean-auth", expiresAt: 200 },
        { signatureValid: true, nowEpochSeconds: 100 },
      ),
    ).toEqual({ userId: "user-a", dealerId: "dealer-a", verified: true });
    expect(() =>
      createVerifiedPrincipal(
        { sub: "user-a", dealerId: "dealer-a", issuer: "lavabean-auth", expiresAt: 200 },
        { signatureValid: false, nowEpochSeconds: 100 },
      ),
    ).toThrow("Invalid dealer token");
    expect(() =>
      createVerifiedPrincipal(
        { sub: "user-a", dealerId: "dealer-a", issuer: "lavabean-auth", expiresAt: 100 },
        { signatureValid: true, nowEpochSeconds: 100 },
      ),
    ).toThrow("Invalid dealer token");
  });

  it("resolves dealer identity only from a server-verified token claim", () => {
    expect(resolveDealerFromVerifiedToken({ verified: true, dealerId: "dealer-a" })).toBe("dealer-a");
    expect(() => resolveDealerFromVerifiedToken({ verified: false, dealerId: "dealer-a" })).toThrow(
      "Invalid dealer token",
    );
    expect(() => resolveDealerFromVerifiedToken({ verified: true, dealerId: "" })).toThrow(
      "Invalid dealer token",
    );
  });

  it("allows a dealer to read only its own customers and orders", () => {
    const customers: CustomerRecord[] = [
      { customerId: "customer-a", dealerId: "dealer-a", name: "A" },
      { customerId: "customer-b", dealerId: "dealer-b", name: "B" },
      { customerId: "legacy", name: "Unscoped" },
    ];
    const orders: OrderRecord[] = [
      { orderId: "order-a", dealerId: "dealer-a", customerId: "customer-a" },
      { orderId: "order-b", dealerId: "dealer-b", customerId: "customer-b" },
      { orderId: "legacy-order", customerId: "legacy" },
    ];

    expect(readCustomerForDealer(customers, "customer-a", "dealer-a")).toEqual(customers[0]);
    expect(readCustomerForDealer(customers, "customer-b", "dealer-a")).toBeUndefined();
    expect(readCustomerForDealer(customers, "legacy", "dealer-a")).toBeUndefined();
    expect(readOrderForDealer(orders, "order-a", "dealer-a")).toEqual(orders[0]);
    expect(readOrderForDealer(orders, "order-b", "dealer-a")).toBeUndefined();
    expect(readOrderForDealer(orders, "legacy-order", "dealer-a")).toBeUndefined();
  });

  it("maps a normalized hostname to at most one dealer", () => {
    const existing: DealerDomain[] = [];
    const domain = createDealerDomain(existing, {
      domainId: "domain-a",
      dealerId: "dealer-a",
      hostname: "Shop.Example.COM.",
    });
    expect(domain.hostname).toBe("shop.example.com");
    expect(resolveDealerForHostname([domain], "SHOP.EXAMPLE.COM")).toBeUndefined();
    const verifiedDomain: DealerDomain = {
      ...domain,
      verificationStatus: "verified",
      verifiedAt: "2026-10-27T00:00:00.000Z",
    };
    expect(resolveDealerForHostname([verifiedDomain], "shop.example.com")).toBe("dealer-a");
    expect(() =>
      createDealerDomain([domain], {
        domainId: "domain-b",
        dealerId: "dealer-b",
        hostname: "shop.example.com",
      }),
    ).toThrow("Hostname is already assigned to a dealer");
  });

  it("prevents role grants from crossing the dealer boundary", () => {
    const memberships: DealerMembership[] = [];
    expect(
      grantDealerRole(memberships, {
        dealerId: "dealer-a",
        userId: "user-a",
        role: "dealer_staff",
        actorDealerId: "dealer-a",
        actorRole: "dealer_owner",
      }),
    ).toMatchObject({ dealerId: "dealer-a", userId: "user-a", role: "dealer_staff" });
    expect(() =>
      grantDealerRole(memberships, {
        dealerId: "dealer-b",
        userId: "user-b",
        role: "dealer_admin",
        actorDealerId: "dealer-a",
        actorRole: "dealer_owner",
      }),
    ).toThrow("Cannot grant roles outside the active dealer");
  });

  it("requires complete, valid dealer identity fields", () => {
    expect(
      createDealer({
        dealerId: "dealer-a",
        slug: "dealer-a",
        legalName: "Dealer A B.V.",
        displayName: "Dealer A",
      }),
    ).toMatchObject({ dealerId: "dealer-a", status: "active" });
    expect(() =>
      createDealer({ dealerId: "", slug: " ", legalName: "", displayName: "" }),
    ).toThrow("Dealer identity fields are required");
  });
});
