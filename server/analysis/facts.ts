import type { Fact, RejectedSeoCandidate, SeoCandidate, SeoBundle, SeoProposal } from "../../types/jev";

export interface SeoDeriveOptions {
  /** Facts below this confidence do not feed SEO copy. Defaults to 0.8. */
  minConfidence?: number;
}

const DEFAULT_MIN_CONFIDENCE = 0.8;
const MAX_KEYWORD_WORDS = 2;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "reads",
  "read",
  "states",
  "state",
  "the",
  "to",
  "visible",
  "with",
]);

function normaliseWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}-]+/u)
    .filter((word) => word.length > 0);
}

function contentWords(text: string): string[] {
  return normaliseWords(text).filter((word) => !STOPWORDS.has(word));
}

function hasEvidence(fact: Fact): boolean {
  return typeof fact.evidence?.assetRefId === "string" && fact.evidence.assetRefId.length > 0 &&
    (fact.evidence.timestampSeconds !== undefined || fact.evidence.shotId !== undefined);
}

/**
 * Derives SEO-facing candidates from extracted facts.
 *
 * Without explicit proposals the candidates are built deterministically from the
 * highest-confidence cited facts. With proposals, every candidate must cite existing
 * fact ids and use only words that appear in those facts; anything else is rejected and
 * reported. No product claim can enter the output without a supporting fact.
 */
export function deriveSeoFacts(
  facts: readonly Fact[],
  proposals?: readonly SeoProposal[],
  options: SeoDeriveOptions = {},
): SeoBundle {
  const citedFacts = facts.filter(hasEvidence);
  const byId = new Map(citedFacts.map((fact) => [fact.id, fact]));

  if (proposals) {
    return proposals.reduce<SeoBundle>(
      (bundle, proposal) => {
        const rejection = rejectProposal(proposal, byId);
        if (rejection) {
          bundle.rejected.push(rejection);
        } else {
          bundle.candidates.push({ kind: proposal.kind, text: proposal.text, factIds: [...proposal.factIds] });
        }
        return bundle;
      },
      { candidates: [], rejected: [] },
    );
  }

  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const qualifying = citedFacts
    .filter((fact) => fact.confidence >= minConfidence)
    .sort((left, right) => right.confidence - left.confidence || left.id.localeCompare(right.id));

  const candidates: SeoCandidate[] = [];
  if (qualifying.length > 0) {
    const lead = qualifying[0]!;
    candidates.push({ kind: "title", text: capitalise(lead.statement), factIds: [lead.id] });

    const descriptionFacts = qualifying.slice(0, 3);
    candidates.push({
      kind: "description",
      text: `${descriptionFacts.map((fact) => sentence(fact.statement)).join(" ")}`,
      factIds: descriptionFacts.map((fact) => fact.id),
    });

    const seenKeywords = new Set<string>();
    for (const fact of qualifying) {
      const keyword = contentWords(fact.statement).slice(-MAX_KEYWORD_WORDS).join(" ");
      if (keyword.length === 0 || seenKeywords.has(keyword)) continue;
      seenKeywords.add(keyword);
      candidates.push({ kind: "keyword", text: keyword, factIds: [fact.id] });
    }
  }

  return { candidates, rejected: [] };
}

function rejectProposal(proposal: SeoProposal, byId: ReadonlyMap<string, Fact>): RejectedSeoCandidate | null {
  const factIds = Array.isArray(proposal.factIds) ? proposal.factIds : [];
  const missingFactIds = factIds.filter((factId) => !byId.has(factId));
  const text = typeof proposal.text === "string" ? proposal.text.trim() : "";

  if (factIds.length === 0 || missingFactIds.length > 0 || text.length === 0) {
    return { kind: proposal.kind, text, missingFactIds };
  }

  const supported = new Set(
    factIds.flatMap((factId) => normaliseWords(byId.get(factId)!.statement)),
  );
  const unsupported = normaliseWords(text).some((word) => !supported.has(word));
  if (unsupported) {
    return { kind: proposal.kind, text, missingFactIds };
  }

  return null;
}

function capitalise(text: string): string {
  return text.length === 0 ? text : `${text[0]!.toUpperCase()}${text.slice(1)}`;
}

function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}
