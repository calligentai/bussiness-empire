import { describe, expect, it } from "vitest";

import { analyzeVideo, type MultimodalTransport, type RawObservation } from "../../server/analysis/video-analyzer";
import type { AssetRef } from "../../types/media";

const videoAsset: AssetRef = {
  id: "asset-lava-bean-reel",
  kind: "video",
  locator: "fixture://lava-bean-reel.mp4",
  mimeType: "video/mp4",
  width: 1080,
  height: 1920,
  durationSeconds: 24,
};

const request = {
  asset: videoAsset,
  shots: [
    { id: "shot-1", startSeconds: 0, endSeconds: 8 },
    { id: "shot-2", startSeconds: 8, endSeconds: 24 },
  ],
  prompts: ["Describe product and packaging visible in each shot."],
};

function fixtureTransport(observations: RawObservation[]): MultimodalTransport & { calls: number } {
  return {
    calls: 0,
    async describe() {
      this.calls += 1;
      return observations;
    },
  };
}

describe("analyzeVideo", () => {
  it("keeps observations with an evidence span and cites the asset", async () => {
    const transport = fixtureTransport([
      {
        modality: "visual",
        statement: "A matte black bag of Lava Bean coffee sits on a wooden counter.",
        timestampSeconds: 3,
        shotId: "shot-1",
        confidence: 0.92,
      },
      {
        modality: "audio",
        statement: "The voice-over names the roast profile.",
        timestampSeconds: 12,
        shotId: "shot-2",
        confidence: 0.71,
      },
    ]);

    const bundle = await analyzeVideo(request, { transport });

    expect(transport.calls).toBe(1);
    expect(bundle.assetRefId).toBe(videoAsset.id);
    expect(bundle.droppedWithoutEvidence).toBe(0);
    expect(bundle.facts).toHaveLength(2);
    expect(bundle.facts[0]).toMatchObject({
      kind: "visual",
      statement: "A matte black bag of Lava Bean coffee sits on a wooden counter.",
      evidence: { assetRefId: videoAsset.id, timestampSeconds: 3, shotId: "shot-1" },
      confidence: 0.92,
    });
    for (const fact of bundle.facts) {
      expect(fact.evidence.assetRefId).toBe(videoAsset.id);
      expect(fact.evidence.timestampSeconds ?? fact.evidence.shotId).toBeDefined();
    }
  });

  it("drops an observation without an evidence span and counts it", async () => {
    const transport = fixtureTransport([
      {
        modality: "visual",
        statement: "The coffee probably tastes like chocolate.",
        confidence: 0.99,
      },
      {
        modality: "visual",
        statement: "Cream-coloured label reads Lava Bean.",
        timestampSeconds: 6,
        shotId: "shot-1",
        confidence: 0.88,
      },
    ]);

    const bundle = await analyzeVideo(request, { transport });

    expect(bundle.facts).toHaveLength(1);
    expect(bundle.facts[0]?.statement).toBe("Cream-coloured label reads Lava Bean.");
    expect(bundle.droppedWithoutEvidence).toBe(1);
    expect(bundle.rejections.map((rejection) => rejection.reason)).toEqual(["missing_evidence"]);
  });

  it("rejects evidence that points outside the analysed video", async () => {
    const transport = fixtureTransport([
      {
        modality: "visual",
        statement: "A second bag appears after the cut.",
        timestampSeconds: 90,
        shotId: "shot-9",
        confidence: 0.6,
      },
      {
        modality: "visual",
        statement: "The bag sits next to a grinder.",
        timestampSeconds: 10,
        shotId: "shot-2",
        confidence: 0.8,
      },
    ]);

    const bundle = await analyzeVideo(request, { transport });

    expect(bundle.facts).toHaveLength(1);
    expect(bundle.rejections).toEqual([
      { index: 0, reason: "evidence_out_of_bounds", statement: "A second bag appears after the cut." },
    ]);
  });

  it("assigns stable fact ids in observation order", async () => {
    const transport = fixtureTransport([
      {
        id: "obs-pack",
        modality: "text",
        statement: "Label text reads 250 g whole bean.",
        timestampSeconds: 16,
        shotId: "shot-2",
        confidence: 0.9,
      },
      {
        id: "obs-grind",
        modality: "visual",
        statement: "A hand grinder is visible in the background.",
        timestampSeconds: 2,
        confidence: 0.55,
      },
    ]);

    const bundle = await analyzeVideo(request, { transport });

    expect(bundle.facts.map((fact) => fact.id)).toEqual(["fact-obs-pack", "fact-obs-grind"]);
    expect(bundle.facts[1]?.evidence).toEqual({ assetRefId: videoAsset.id, timestampSeconds: 2 });
  });
});
