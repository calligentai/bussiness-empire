import { describe, expect, it } from "vitest";
import {
  createSeoDashboard,
  readSeoDashboardForDealer,
  runFreeSeoAudit,
  type SeoDashboard,
} from "../../packages/contracts/openseo";

describe("shared OpenSEO dashboard contracts", () => {
  const dashboard = (): SeoDashboard => createSeoDashboard({
    dealerId: "dealer-a",
    domainId: "domain-a",
    hostname: "shop.example.com",
    metadata: { title: "Coffee", description: "Fresh coffee" },
    sitemapUrl: "https://shop.example.com/sitemap.xml",
    searchConsole: { authorized: false },
  });

  it("provides free metadata, sitemap, and audit results without paid provider calls", () => {
    const result = runFreeSeoAudit({
      hostname: "shop.example.com",
      metadata: { title: "Coffee", description: "Fresh coffee" },
      sitemapUrl: "https://shop.example.com/sitemap.xml",
    });
    expect(result.costCents).toBe(0);
    expect(result.checks).toEqual({ title: "pass", description: "pass", sitemap: "pass" });
    expect(dashboard()).toMatchObject({ metadata: { title: "Coffee" }, sitemapUrl: "https://shop.example.com/sitemap.xml" });
  });

  it("does not expose Search Console data until that dealer authorizes it", () => {
    expect(() => createSeoDashboard({
      dealerId: "dealer-a", domainId: "domain-a", hostname: "shop.example.com",
      metadata: {}, sitemapUrl: "https://shop.example.com/sitemap.xml",
      searchConsole: { authorized: false, clicks: 42 },
    })).toThrow("Search Console data requires dealer authorization");
    expect(createSeoDashboard({
      dealerId: "dealer-a", domainId: "domain-a", hostname: "shop.example.com",
      metadata: {}, sitemapUrl: "https://shop.example.com/sitemap.xml",
      searchConsole: { authorized: true, clicks: 42 },
    }).searchConsole).toEqual({ authorized: true, clicks: 42 });
  });

  it("only reads a dashboard within its dealer namespace", () => {
    expect(readSeoDashboardForDealer([dashboard()], "dealer-a", "domain-a")).toEqual(dashboard());
    expect(readSeoDashboardForDealer([dashboard()], "dealer-b", "domain-a")).toBeUndefined();
    expect(readSeoDashboardForDealer([dashboard()], "dealer-a", "domain-b")).toBeUndefined();
  });

  it("rejects malformed or cross-host sitemap URLs and missing identity", () => {
    expect(() => createSeoDashboard({
      dealerId: "", domainId: "domain-a", hostname: "shop.example.com", metadata: {},
      sitemapUrl: "https://other.example/sitemap.xml", searchConsole: { authorized: false },
    })).toThrow("OpenSEO dashboard identity is required");
    expect(() => createSeoDashboard({
      dealerId: "dealer-a", domainId: "domain-a", hostname: "shop.example.com", metadata: {},
      sitemapUrl: "https://other.example/sitemap.xml", searchConsole: { authorized: false },
    })).toThrow("Sitemap URL must use the dealer hostname");
    expect(() => runFreeSeoAudit({ hostname: "", metadata: {}, sitemapUrl: "not a url" })).toThrow("Valid hostname is required");
  });
});
