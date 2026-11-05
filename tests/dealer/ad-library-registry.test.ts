import { describe, expect, it } from "vitest";
import { createVerifiedPrincipal, type VerifiedPrincipal } from "../../packages/contracts/auth";
import { DealerAdLibrarySourceRegistry, type PublicAdLibrarySourceInput } from "../../packages/contracts/dealer/ad-library";

const epoch = Math.floor(Date.now() / 1000);

function principal(dealerId: string): VerifiedPrincipal {
  return createVerifiedPrincipal(
    { sub: `user-${dealerId}`, dealerId, issuer: "lavabean-auth", expiresAt: epoch + 600 },
    { signatureValid: true, nowEpochSeconds: epoch },
  );
}

const source = (sourceId = "src-a"): PublicAdLibrarySourceInput => ({
  sourceId,
  url: "https://example.com/library/ad/1",
  competitorLabel: "Competitor",
  campaignLabel: "Spring",
  provenance: "manual",
  capturedAt: "2026-10-31T10:00:00.000Z",
});

describe("dealer scoped public ad library source registry", () => {
  it("validates manually supplied HTTPS public library URLs", () => {
    const registry = new DealerAdLibrarySourceRegistry();
    expect(() => registry.create(principal("dealer-a"), {
      ...source(),
      url: "javascript:alert(1)",
    })).toThrow("Invalid public ad library source");
  });

  it("fails closed for an unverified dealer principal on every operation", () => {
    const registry = new DealerAdLibrarySourceRegistry();
    const unverified = { verified: false, dealerId: "dealer-a" } as unknown as VerifiedPrincipal;

    expect(() => registry.create(unverified, source())).toThrow("Invalid dealer token");
    expect(() => registry.list(unverified)).toThrow("Invalid dealer token");
    expect(() => registry.read(unverified, "src-a")).toThrow("Invalid dealer token");
  });

  it("scopes create, list, and read to verified principals in a shared store", () => {
    const registry = new DealerAdLibrarySourceRegistry();
    const dealerA = principal("dealer-a");
    const dealerB = principal("dealer-b");

    registry.create(dealerA, source("src-a"));
    registry.create(dealerB, { ...source("src-b"), campaignLabel: "Winter" });

    expect(registry.list(dealerA)).toHaveLength(1);
    expect(registry.list(dealerA)[0]?.dealerId).toBe("dealer-a");
    expect(registry.read(dealerA, "src-b")).toBeUndefined();
    expect(registry.read(dealerB, "src-a")).toBeUndefined();
    expect(registry.read(dealerA, "src-a")).toMatchObject({ dealerId: "dealer-a", provenance: "manual" });
  });
});
