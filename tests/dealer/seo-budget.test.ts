import { describe, expect, it, vi } from "vitest";
import {
  createSeoBudgetPolicy,
  readSeoBudgetPolicyForDealer,
  reserveSeoSpend,
  requestPaidDataForSeo,
  resolveDealerSeoSettings,
  type SeoBudgetPolicy,
} from "../../packages/contracts/dealer";

describe("dealer SEO budget fail-closed contract", () => {
  const approvedPolicy = (overrides: Partial<SeoBudgetPolicy> = {}): SeoBudgetPolicy => createSeoBudgetPolicy({
    dealerId: "dealer-a",
    enabled: true,
    currency: "EUR",
    periodStart: "2026-10-01T00:00:00.000Z",
    periodEnd: "2026-11-01T00:00:00.000Z",
    limitMinor: 500,
    allowedOperations: ["keyword_lookup"],
    approvalId: "approval-a",
    policyVersion: 1,
    ...overrides,
  });

  it("keeps free OpenSEO features available and refuses paid operations before dispatch by default", async () => {
    const dispatch = vi.fn(async () => "provider-result");
    const result = await requestPaidDataForSeo({ dealerId: "dealer-a", operation: "keyword_lookup", now: "2026-10-30T00:00:00.000Z", dispatch });
    expect(result).toEqual({ status: "refused", reason: "no_approved_budget" });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("isolates policies and reservations by dealer", () => {
    const policy = approvedPolicy();
    expect(readSeoBudgetPolicyForDealer([policy], "dealer-a")).toEqual(policy);
    expect(readSeoBudgetPolicyForDealer([policy], "dealer-b")).toBeUndefined();
    const reservation = reserveSeoSpend([], { dealerId: "dealer-a", requestId: "request-a", estimateMinor: 300, policy, now: "2026-10-30T00:00:00.000Z" });
    expect(() => reserveSeoSpend([reservation], { dealerId: "dealer-b", requestId: "request-b", estimateMinor: 300, policy, now: "2026-10-30T00:00:00.000Z" })).toThrow("No approved budget for dealer");
  });

  it("validates budget scope and enforces period, operation, and hard cap on reservation", () => {
    expect(() => approvedPolicy({ limitMinor: 1.5 })).toThrow("Invalid SEO budget policy");
    expect(() => approvedPolicy({ approvalId: " " })).toThrow("Invalid SEO budget policy");
    const policy = approvedPolicy();
    expect(() => reserveSeoSpend([], { dealerId: "dealer-a", requestId: "r1", estimateMinor: 100, policy, operation: "serp_lookup", now: "2026-10-30T00:00:00.000Z" })).toThrow("Operation is not approved");
    expect(() => reserveSeoSpend([], { dealerId: "dealer-a", requestId: "r1", estimateMinor: 100, policy, now: "2026-11-01T00:00:00.000Z" })).toThrow("Budget is not active");
    const first = reserveSeoSpend([], { dealerId: "dealer-a", requestId: "r1", estimateMinor: 300, policy, now: "2026-10-30T00:00:00.000Z" });
    expect(() => reserveSeoSpend([first], { dealerId: "dealer-a", requestId: "r2", estimateMinor: 201, policy, now: "2026-10-30T00:00:00.000Z" })).toThrow("Budget limit exceeded");
    expect(reserveSeoSpend([first], { dealerId: "dealer-a", requestId: "r1", estimateMinor: 300, policy, now: "2026-10-30T00:00:00.000Z" })).toEqual(first);
  });

  it("preserves dealer budget settings across central template updates", () => {
    const settings = [{ dealerId: "dealer-a", budgetPolicy: approvedPolicy() }];
    expect(resolveDealerSeoSettings(settings, "dealer-a", { metadata: { title: "Central" } })).toEqual({
      metadata: { title: "Central" }, budgetPolicy: approvedPolicy(),
    });
    expect(resolveDealerSeoSettings(settings, "dealer-b", { metadata: { title: "Central" } })).toEqual({ metadata: { title: "Central" } });
  });
});
