import { describe, expect, it } from "vitest";

import { deriveSeoFacts } from "../../server/analysis/facts";
import type { Fact } from "../../types/jev";

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

describe("deriveSeoFacts", () => {
  it("builds title, description and keyword candidates from extracted facts only", () => {
    const bundle = deriveSeoFacts(facts);

    expect(bundle.candidates.map((candidate) => candidate.kind)).toEqual([
      "title",
      "description",
      "keyword",
      "keyword",
    ]);

    const knownIds = new Set(facts.map((fact) => fact.id));
    for (const candidate of bundle.candidates) {
      expect(candidate.factIds.length).toBeGreaterThan(0);
      for (const factId of candidate.factIds) {
        expect(knownIds.has(factId)).toBe(true);
      }
      const cited = facts
        .filter((fact) => candidate.factIds.includes(fact.id))
        .map((fact) => fact.statement.toLowerCase())
        .join(" | ");
      for (const word of candidate.text.toLowerCase().split(/[^\p{L}\p{N}-]+/u)) {
        if (word.length === 0) continue;
        expect(cited).toContain(word);
      }
    }
    expect(bundle.rejected).toEqual([]);
  });

  it("rejects a candidate that cites a fact id which does not exist", () => {
    const bundle = deriveSeoFacts(facts, [
      { kind: "title", text: "Lava Bean coffee beans from Rwanda", factIds: ["fact-label", "fact-missing"] },
      { kind: "keyword", text: "medium roast", factIds: ["fact-roast"] },
    ]);

    expect(bundle.candidates).toEqual([{ kind: "keyword", text: "medium roast", factIds: ["fact-roast"] }]);
    expect(bundle.rejected).toEqual([
      {
        kind: "title",
        text: "Lava Bean coffee beans from Rwanda",
        missingFactIds: ["fact-missing"],
      },
    ]);
  });

  it("rejects a candidate that cites no facts at all", () => {
    const bundle = deriveSeoFacts(facts, [{ kind: "description", text: "The best coffee in the world", factIds: [] }]);

    expect(bundle.candidates).toEqual([]);
    expect(bundle.rejected[0]?.missingFactIds).toHaveLength(0);
    expect(bundle.rejected[0]?.kind).toBe("description");
  });

  it("never invents a claim that no fact supports", () => {
    const bundle = deriveSeoFacts(facts, [
      { kind: "keyword", text: "single origin", factIds: ["fact-label"] },
      { kind: "keyword", text: "Lava Bean", factIds: ["fact-label"] },
    ]);

    expect(bundle.candidates.map((candidate) => candidate.text)).toEqual(["Lava Bean"]);
    expect(bundle.rejected.map((rejection) => rejection.text)).toEqual(["single origin"]);
  });
});
