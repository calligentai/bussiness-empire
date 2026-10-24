/**
 * JEV contract shared by the video analyzer, the SEO fact derivation and the scorer.
 *
 * Every fact must trace back to a concrete evidence span in an analysed asset. A
 * statement without a span is not a fact and never reaches scoring.
 */

/** Where in the asset a fact was observed. Both locators are optional, but at least one is required. */
export interface FactEvidence {
  assetRefId: string;
  /** Seconds from the start of the analysed asset. */
  timestampSeconds?: number;
  /** Shot identifier from the analysed shot timeline. */
  shotId?: string;
}

/** Modality the observation came from. */
export type FactKind = "visual" | "audio" | "text";

export interface Fact {
  id: string;
  kind: FactKind;
  statement: string;
  evidence: FactEvidence;
  /** Model confidence, 0..1, as reported by the transport. */
  confidence: number;
}

/** Why an observation was not turned into a fact. */
export type DroppedObservationReason = "missing_evidence" | "evidence_out_of_bounds" | "invalid_statement";

export interface DroppedObservation {
  /** Index of the observation in the transport response. */
  index: number;
  reason: DroppedObservationReason;
  statement: string;
}

/** Result of one multimodal analysis run. */
export interface FactsBundle {
  assetRefId: string;
  facts: Fact[];
  /** Observations without a usable evidence span. Counted, never guessed. */
  droppedWithoutEvidence: number;
  rejections: DroppedObservation[];
}

export type SeoCandidateKind = "title" | "description" | "keyword";

/** A candidate proposed by a model; it survives only when its fact ids exist. */
export interface SeoProposal {
  kind: SeoCandidateKind;
  text: string;
  factIds: string[];
}

export interface SeoCandidate {
  kind: SeoCandidateKind;
  text: string;
  /** Ids of the extracted facts this text is built from. Never empty. */
  factIds: string[];
}

export interface RejectedSeoCandidate {
  kind: SeoCandidateKind;
  text: string;
  /** Cited ids that do not exist in the facts bundle; empty when the text itself is unsupported. */
  missingFactIds: string[];
}

export interface SeoBundle {
  candidates: SeoCandidate[];
  rejected: RejectedSeoCandidate[];
}

/** One weighted dimension of a JEV rubric. Weights must sum to 1.0 across the rubric. */
export interface JevDimensionSpec {
  id: string;
  weight: number;
  description: string;
}

export interface JevRubric {
  id: string;
  version: string;
  dimensions: JevDimensionSpec[];
  /** Overall is null until this many dimensions are scorable. */
  minScorableDimensions: number;
}

/** A model judgement for one dimension. Score is 0-100. */
export interface JevDimensionEvaluation {
  dimensionId: string;
  score: number;
  factIds: string[];
  rationale: string;
}

export interface JevDimension {
  id: string;
  weight: number;
  /** 0-100, or null when no existing fact supports the dimension. */
  score: number | null;
  factIds: string[];
  rationale: string;
}

export interface JevScore {
  rubricId: string;
  rubricVersion: string;
  dimensions: JevDimension[];
  /** Weighted average over scorable dimensions only; null below the rubric minimum. */
  overall: number | null;
  /** One entry per non-scorable dimension: `<dimensionId>: insufficient_evidence`. */
  insufficientReasons: string[];
}
