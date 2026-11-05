import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { JevRubricError, JevScoreError, LAVABEAN_JEV_RUBRIC, scoreJev } from "../../server/jev/scoring";
import type { Fact, JevRubric } from "../../types/jev";

const facts: Fact[] = [
  {
    id: "fact-label",
    kind: "visual",
    statement: "Cream-coloured label reads Lava Bean coffee",
    evidence: { assetRefId: "asset-1", timestampSeconds: 6, shotId: "shot-1" },
    confidence: 0.9,
  },
  {
    id: "fact-roast",
    kind: "text",
    statement: "Label states medium roast",
    evidence: { assetRefId: "asset-1", timestampSeconds: 16, shotId: "shot-2" },
    confidence: 0.82,
  },
  {
    id: "fact-grinder",
    kind: "visual",
    statement: "A hand grinder is visible in the background",
    evidence: { assetRefId: "asset-1", timestampSeconds: 2 },
    confidence: 0.55,
  },
];

function rubric(overrides: Partial<JevRubric> = {}): JevRubric {
  return {
    id: "fixture-rubric",
    version: "1.0.0",
    dimensions: [
      { id: "clarity", weight: 0.6, description: "Is the product unmistakable?" },
      { id: "originality", weight: 0.4, description: "Does it avoid stock imagery?" },
    ],
    minScorableDimensions: 2,
    ...overrides,
  };
}

describe("LAVABEAN_JEV_RUBRIC", () => {
  it("weights sum to 1.0", () => {
    const total = LAVABEAN_JEV_RUBRIC.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("is documented in docs/jev/scoring-rubric.md", () => {
    const docPath = fileURLToPath(new URL("../../docs/jev/scoring-rubric.md", import.meta.url));
    const doc = readFileSync(docPath, "utf8");
    for (const dimension of LAVABEAN_JEV_RUBRIC.dimensions) {
      expect(doc).toContain(dimension.id);
      expect(doc).toContain(dimension.weight.toFixed(2));
    }
    expect(doc).toContain(String(LAVABEAN_JEV_RUBRIC.minScorableDimensions));
  });
});

describe("rubric validation", () => {
  it("throws when weights do not sum to 1.0", () => {
    const invalid = rubric({
      dimensions: [
        { id: "clarity", weight: 0.5, description: "x" },
        { id: "originality", weight: 0.4, description: "y" },
      ],
    });
    expect(() => scoreJev(facts, invalid, [])).toThrow(JevRubricError);
  });

  it("throws on duplicate, non-positive or missing dimension ids", () => {
    expect(() =>
      scoreJev(facts, rubric({ dimensions: [{ id: "clarity", weight: 1, description: "x" }], minScorableDimensions: 1 }), []),
    ).not.toThrow();
    expect(() =>
      scoreJev(
        facts,
        rubric({
          dimensions: [
            { id: "clarity", weight: 0.5, description: "x" },
            { id: "clarity", weight: 0.5, description: "y" },
          ],
        }),
        [],
      ),
    ).toThrow(JevRubricError);
    expect(() =>
      scoreJev(
        facts,
        rubric({
          dimensions: [
            { id: "clarity", weight: 1.5, description: "x" },
            { id: "originality", weight: -0.5, description: "y" },
          ],
        }),
        [],
      ),
    ).toThrow(JevRubricError);
  });

  it("throws when the minimum scorable count is impossible", () => {
    expect(() => scoreJev(facts, rubric({ minScorableDimensions: 3 }), [])).toThrow(JevRubricError);
  });
});

describe("scoreJev", () => {
  it("scores a dimension only when it cites at least one existing fact", () => {
    const score = scoreJev(facts, rubric(), [
      { dimensionId: "clarity", score: 80, factIds: ["fact-label", "fact-roast"], rationale: "Label is legible." },
      { dimensionId: "originality", score: 60, factIds: [], rationale: "No idea." },
    ]);

    const clarity = score.dimensions.find((dimension) => dimension.id === "clarity");
    const originality = score.dimensions.find((dimension) => dimension.id === "originality");

    expect(clarity).toMatchObject({ score: 80, weight: 0.6, factIds: ["fact-label", "fact-roast"] });
    expect(originality).toMatchObject({ score: null, factIds: [] });
    expect(originality?.rationale).toMatch(/insufficient_evidence/);
    expect(score.insufficientReasons).toEqual(["originality: insufficient_evidence"]);
  });

  it("returns null for a dimension whose only cited facts do not exist", () => {
    const score = scoreJev(facts, rubric(), [
      { dimensionId: "clarity", score: 90, factIds: ["fact-imagined"], rationale: "Feels clear." },
      { dimensionId: "originality", score: 70, factIds: ["fact-grinder"], rationale: "Custom B-roll." },
    ]);

    const clarity = score.dimensions.find((dimension) => dimension.id === "clarity");
    expect(clarity?.score).toBeNull();
    expect(score.insufficientReasons).toEqual(["clarity: insufficient_evidence"]);
    expect(score.overall).toBeNull();
  });

  it("returns overall null when fewer than the minimum dimensions are scorable", () => {
    const score = scoreJev(facts, rubric(), [
      { dimensionId: "clarity", score: 80, factIds: ["fact-label"], rationale: "Legible." },
    ]);

    expect(score.dimensions.filter((dimension) => dimension.score !== null)).toHaveLength(1);
    expect(score.overall).toBeNull();
    expect(score.insufficientReasons).toEqual(["originality: insufficient_evidence"]);
  });

  it("weights only the scorable dimensions and never averages a null", () => {
    const three = rubric({
      dimensions: [
        { id: "clarity", weight: 0.5, description: "x" },
        { id: "originality", weight: 0.3, description: "y" },
        { id: "emotion", weight: 0.2, description: "z" },
      ],
      minScorableDimensions: 2,
    });
    const score = scoreJev(facts, three, [
      { dimensionId: "clarity", score: 80, factIds: ["fact-label"], rationale: "Legible." },
      { dimensionId: "emotion", score: 40, factIds: ["fact-grinder"], rationale: "Warm." },
      { dimensionId: "originality", score: 100, factIds: [], rationale: "Unsupported." },
    ]);

    // (80 * 0.5 + 40 * 0.2) / (0.5 + 0.2) = 48 / 0.7
    expect(score.overall).toBeCloseTo(68.571, 3);
    expect(score.insufficientReasons).toEqual(["originality: insufficient_evidence"]);
  });

  it("rejects a score outside 0-100 and a dimension id the rubric does not define", () => {
    expect(() =>
      scoreJev(facts, rubric(), [{ dimensionId: "clarity", score: 120, factIds: ["fact-label"], rationale: "x" }]),
    ).toThrow(JevScoreError);
    expect(() =>
      scoreJev(
        facts,
        rubric(),
        [
          { dimensionId: "clarity", score: 80, factIds: ["fact-label"], rationale: "x" },
          { dimensionId: "vibes", score: 80, factIds: ["fact-label"], rationale: "y" },
        ],
      ),
    ).toThrow(JevScoreError);
  });

  it("reports every rubric dimension, scorable or not", () => {
    const score = scoreJev(facts, LAVABEAN_JEV_RUBRIC, []);
    expect(score.dimensions.map((dimension) => dimension.id)).toEqual(
      LAVABEAN_JEV_RUBRIC.dimensions.map((dimension) => dimension.id),
    );
    expect(score.overall).toBeNull();
    expect(score.insufficientReasons).toHaveLength(LAVABEAN_JEV_RUBRIC.dimensions.length);
  });
});
