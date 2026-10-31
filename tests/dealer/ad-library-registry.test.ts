import { describe, expect, it } from "vitest";
import { createPublicAdLibrarySource, DealerAdLibrarySourceRegistry } from "../../packages/contracts/dealer/ad-library";

describe("dealer scoped public ad library source registry", () => {
  it("validates manually supplied HTTPS public library URLs", () => {
    expect(() => createPublicAdLibrarySource({
      sourceId: "src-a", dealerId: "dealer-a", url: "javascript:alert(1)",
      competitorLabel: "Competitor", campaignLabel: "Spring", provenance: "manual",
      capturedAt: "2026-10-31T10:00:00.000Z",
    })).toThrow("Invalid public ad library source");
  });

  it("fails closed when tenant identity is missing", () => {
    const registry = new DealerAdLibrarySourceRegistry();
    expect(() => registry.create("", {
      sourceId: "src-a", url: "https://example.com/library/ad/1", competitorLabel: "Competitor",
      campaignLabel: "Spring", provenance: "manual", capturedAt: "2026-10-31T10:00:00.000Z",
    })).toThrow("Dealer context is required");
    expect(() => registry.list(" ")).toThrow("Dealer context is required");
    expect(() => registry.read("", "src-a")).toThrow("Dealer context is required");
  });

  it("scopes create, list, and read to the active dealer in a shared store", () => {
    const registry = new DealerAdLibrarySourceRegistry();
    const source = {
      sourceId: "src-a", url: "https://example.com/library/ad/1", competitorLabel: "Competitor",
      campaignLabel: "Spring", provenance: "manual", capturedAt: "2026-10-31T10:00:00.000Z",
    };
    registry.create("dealer-a", source);
    registry.create("dealer-b", { ...source, sourceId: "src-b", campaignLabel: "Winter" });
    expect(registry.list("dealer-a")).toHaveLength(1);
    expect(registry.list("dealer-a")[0]?.dealerId).toBe("dealer-a");
    expect(registry.read("dealer-a", "src-b")).toBeUndefined();
    expect(registry.read("dealer-b", "src-a")).toBeUndefined();
    expect(registry.read("dealer-a", "src-a")).toMatchObject({ dealerId: "dealer-a", provenance: "manual" });
  });
});
