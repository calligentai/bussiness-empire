import { describe, expect, it } from "vitest";
import {
  createSocialDraft,
  readSocialDraftForDealer,
  readSocialSetupForDealer,
  type DealerSocialDraft,
  type DealerSocialSetup,
} from "../../packages/contracts/dealer";

const setups: DealerSocialSetup[] = [
  { dealerId: "dealer-a", platform: "instagram", connectionStatus: "disconnected" },
  { dealerId: "dealer-b", platform: "facebook", connectionStatus: "disconnected" },
];

const drafts: DealerSocialDraft[] = [
  { draftId: "draft-a", dealerId: "dealer-a", platform: "instagram", text: "A local draft", updatedAt: "2026-10-31T10:00:00.000Z" },
  { draftId: "draft-b", dealerId: "dealer-b", platform: "facebook", text: "B local draft", updatedAt: "2026-10-31T11:00:00.000Z" },
];

describe("dealer-scoped social setup fixtures", () => {
  it("returns disconnected setup and local drafts only for the active dealer", () => {
    expect(readSocialSetupForDealer(setups, "dealer-a")).toEqual([setups[0]]);
    expect(readSocialDraftForDealer(drafts, "draft-a", "dealer-a")).toEqual(drafts[0]);
    expect(readSocialDraftForDealer(drafts, "draft-b", "dealer-a")).toBeUndefined();
  });

  it("fails closed without dealer context and rejects ambiguous draft ownership", () => {
    expect(readSocialSetupForDealer(setups, " ")).toEqual([]);
    expect(readSocialDraftForDealer(drafts, "draft-a", " ")).toBeUndefined();
    expect(() => readSocialDraftForDealer([...drafts, drafts[0]], "draft-a", "dealer-a")).toThrow("Social draft is ambiguous");
  });

  it("validates local drafts without any provider or scheduling behavior", () => {
    expect(createSocialDraft(drafts[0])).toEqual(drafts[0]);
    expect(() => createSocialDraft({ ...drafts[0], text: "  " })).toThrow("Social draft identity and text are required");
  });
});
