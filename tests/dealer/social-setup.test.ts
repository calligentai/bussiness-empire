import { describe, expect, it } from "vitest";
import type { VerifiedPrincipal } from "../../packages/contracts/auth";
import {
  createSocialDraft,
  readSocialDraftForDealer,
  readSocialSetupForDealer,
  type DealerSocialDraft,
  type DealerSocialSetup,
} from "../../packages/contracts/dealer";

const principalA: VerifiedPrincipal = { userId: "user-a", dealerId: "dealer-a", verified: true };
const principalB: VerifiedPrincipal = { userId: "user-b", dealerId: "dealer-b", verified: true };
const unverified = { ...principalA, verified: false } as unknown as VerifiedPrincipal;
const emptyDealer = { ...principalA, dealerId: " " };

const setups: DealerSocialSetup[] = [
  { dealerId: "dealer-a", platform: "instagram", connectionStatus: "disconnected" },
  { dealerId: "dealer-b", platform: "facebook", connectionStatus: "disconnected" },
];

const drafts: DealerSocialDraft[] = [
  { draftId: "draft-a", dealerId: "dealer-a", platform: "instagram", text: "A local draft", updatedAt: "2026-10-31T10:00:00.000Z" },
  { draftId: "draft-b", dealerId: "dealer-b", platform: "facebook", text: "B local draft", updatedAt: "2026-10-31T11:00:00.000Z" },
];

function draftInput(draft: DealerSocialDraft): Omit<DealerSocialDraft, "dealerId"> {
  const { dealerId: _dealerId, ...input } = draft;
  return input;
}

describe("dealer-scoped social setup fixtures", () => {
  it("derives setup, reads, and new drafts from the verified principal", () => {
    expect(readSocialSetupForDealer(setups, principalA)).toEqual([setups[0]]);
    expect(readSocialSetupForDealer(setups, principalB)).toEqual([setups[1]]);
    expect(readSocialDraftForDealer(drafts, "draft-a", principalA)).toEqual(drafts[0]);
    expect(readSocialDraftForDealer(drafts, "draft-b", principalA)).toBeUndefined();

    expect(createSocialDraft({ ...draftInput(drafts[0]), dealerId: "dealer-b" } as never, principalA)).toEqual(drafts[0]);
  });

  it("fails closed for missing or unverified dealer context and rejects ambiguous ownership", () => {
    expect(readSocialSetupForDealer(setups, emptyDealer)).toEqual([]);
    expect(readSocialDraftForDealer(drafts, "draft-a", emptyDealer)).toBeUndefined();
    expect(readSocialSetupForDealer(setups, unverified)).toEqual([]);
    expect(readSocialDraftForDealer(drafts, "draft-a", unverified)).toBeUndefined();
    expect(() => createSocialDraft({ ...drafts[0], dealerId: "dealer-a" } as never, unverified)).toThrow("Verified dealer principal is required");
    expect(() => readSocialDraftForDealer([...drafts, drafts[0]], "draft-a", principalA)).toThrow("Social draft is ambiguous");
  });

  it("validates local drafts without provider or scheduling behavior", () => {
    const input = draftInput(drafts[0]);
    expect(createSocialDraft(input, principalA)).toEqual(drafts[0]);
    expect(() => createSocialDraft({ ...input, text: "  " }, principalA)).toThrow("Social draft identity and text are required");
    expect(() => createSocialDraft({ ...input, updatedAt: "invalid" }, principalA)).toThrow("Social draft timestamp is invalid");
    expect(() => createSocialDraft({ ...input, platform: "invalid" as never }, principalA)).toThrow("Social platform is invalid");
  });
});
