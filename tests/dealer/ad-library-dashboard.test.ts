import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createVerifiedPrincipal } from "../../packages/contracts/auth";
import { DealerAdLibrarySourceRegistry } from "../../packages/contracts/dealer/ad-library";
import AdLibraryDashboard from "../../components/AdLibraryDashboard.vue";

const now = Math.floor(Date.now() / 1000);
const principal = (dealerId: string) => createVerifiedPrincipal(
  { sub: `user-${dealerId}`, dealerId, issuer: "lavabean-auth", expiresAt: now + 600 },
  { signatureValid: true, nowEpochSeconds: now },
);

afterEach(() => document.body.innerHTML = "");

describe("public ad library dashboard", () => {
  it("renders the empty disconnected state", () => {
    const registry = new DealerAdLibrarySourceRegistry();
    const wrapper = mount(AdLibraryDashboard, { props: { registry, principal: principal("dealer-a") } });
    expect(wrapper.text()).toContain("No sources added yet");
    expect(wrapper.text()).toContain("Manually supplied public sources only");
    expect(wrapper.text()).toContain("LOCAL DEMO · DEALER-A");
  });

  it("adds and lists a valid HTTPS source with provenance and captured metadata", async () => {
    const registry = new DealerAdLibrarySourceRegistry();
    const wrapper = mount(AdLibraryDashboard, { props: { registry, principal: principal("dealer-a") } });
    await wrapper.get('[data-testid="source-url"]').setValue("https://example.com/library/ad/1");
    await wrapper.get('[data-testid="competitor-label"]').setValue("Competitor A");
    await wrapper.get('[data-testid="campaign-label"]').setValue("Spring launch");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.text()).toContain("https://example.com/library/ad/1");
    expect(wrapper.text()).toContain("Competitor A");
    expect(wrapper.text()).toContain("Spring launch");
    expect(wrapper.text()).toContain("Manual");
    expect(wrapper.text()).toContain("Captured");
  });

  it("rejects non-HTTPS URLs and isolates sources by authenticated dealer", async () => {
    const registry = new DealerAdLibrarySourceRegistry();
    const dealerA = mount(AdLibraryDashboard, { props: { registry, principal: principal("dealer-a") } });
    await dealerA.get('[data-testid="source-url"]').setValue("http://example.com/ad");
    await dealerA.get('[data-testid="competitor-label"]').setValue("Competitor A");
    await dealerA.get('[data-testid="campaign-label"]').setValue("Spring");
    await dealerA.get("form").trigger("submit");
    expect(dealerA.text()).toContain("Enter a valid HTTPS URL");
    expect(registry.list(principal("dealer-a"))).toHaveLength(0);

    await dealerA.get('[data-testid="source-url"]').setValue("https://example.com/ad");
    await dealerA.get("form").trigger("submit");
    const dealerB = mount(AdLibraryDashboard, { props: { registry, principal: principal("dealer-b") } });
    expect(dealerB.text()).toContain("No sources added yet");
    expect(dealerB.text()).not.toContain("Competitor A");
    expect(registry.list(principal("dealer-b"))).toHaveLength(0);
  });

  it("shows added records only to the principal dealer", async () => {
    const registry = new DealerAdLibrarySourceRegistry();
    const dealerA = principal("dealer-a");
    const dealerB = principal("dealer-b");
    registry.create(dealerA, {
      sourceId: "a-source", url: "https://example.com/a", competitorLabel: "Dealer A brand",
      campaignLabel: "A campaign", provenance: "manual", capturedAt: new Date().toISOString(),
    });
    const wrapperA = mount(AdLibraryDashboard, { props: { registry, principal: dealerA } });
    const wrapperB = mount(AdLibraryDashboard, { props: { registry, principal: dealerB } });
    expect(wrapperA.text()).toContain("Dealer A brand");
    expect(wrapperB.text()).not.toContain("Dealer A brand");
    expect(wrapperB.text()).toContain("No sources added yet");
  });
});
