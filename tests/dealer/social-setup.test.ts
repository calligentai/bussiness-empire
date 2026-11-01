import { describe, expect, it } from "vitest";
import { createVerifiedPrincipal, type VerifiedPrincipal } from "../../packages/contracts/auth";
import {
  createSocialDraft,
  readSocialDraftForDealer,
  readSocialSetupForDealer,
  type DealerSocialDraft,
  type DealerSocialSetup,
} from "../../packages/contracts/dealer";

const dealerA = createVerifiedPrincipal(
  { sub: "user-a", dealerId: "dealer-a", issuer: "lavabean-auth", expiresAt: 200 },
  { signatureValid: true, nowEpochSeconds: 100 },
);
const dealerB = createVerifiedPrincipal(
  { sub: "user-b", dealerId: "dealer-b", issuer: "lavabean-auth", expiresAt: 200 },
  { signatureValid: true, nowEpochSeconds: 100 },
);
const spoofedDealerB = {
  userId: "attacker",
  dealerId: "dealer-b",
  verified: false,
} as unknown as VerifiedPrincipal;

const setups: DealerSocialSetup[] = [
  { dealerId: "dealer-a", platform: "instagram", connectionStatus: "disconnected" },
  { dealerId: "dealer-b", platform: "facebook", connectionStatus: "disconnected" },
];

const drafts: DealerSocialDraft[] = [
  { draftId: "draft-a", dealerId: "dealer-a", platform: "instagram", text: "A local draft", updatedAt: "2026-10-31T10:00:00.000Z" },
  { draftId: "draft-b", dealerId: "dealer-b", platform: "facebook", text: "B local draft", updatedAt: "2026-10-31T11:00:00.000Z" },
];

describe("dealer-scoped social setup fixtures", () => {
  it("derives setup and draft ownership from the verified principal", () => {
    expect(readSocialSetupForDealer(setups, dealerA)).toEqual([setups[0]]);
    expect(readSocialSetupForDealer(setups, dealerB)).toEqual([setups[1]]);
    expect(readSocialDraftForDealer(drafts, "draft-a", dealerA)).toEqual(drafts[0]);
    expect(readSocialDraftForDealer(drafts, "draft-b", dealerA)).toBeUndefined();
  });

  it("fails closed for an unverified principal and rejects ambiguous ownership", () => {
    expect(() => readSocialSetupForDealer(setups, spoofedDealerB)).toThrow("Invalid dealer token");
    expect(() => readSocialDraftForDealer(drafts, "draft-b", spoofedDealerB)).toThrow("Invalid dealer token");
    expect(() => readSocialDraftForDealer([...drafts, drafts[0]], "draft-a", dealerA)).toThrow(
      "Social draft is ambiguous",
    );
  });

  it("binds a new local draft to the verified principal", () => {
    const input = {
      draftId: "draft-new",
      platform: "instagram" as const,
      text: "A local draft",
      updatedAt: "2026-10-31T12:00:00.000Z",
    };
    expect(createSocialDraft(input, dealerA)).toEqual({ ...input, dealerId: "dealer-a" });
    expect(() => createSocialDraft({ ...input, text: "  " }, dealerA)).toThrow(
      "Social draft identity and text are required",
    );
    expect(() => createSocialDraft(input, spoofedDealerB)).toThrow("Invalid dealer token");
  });
});
