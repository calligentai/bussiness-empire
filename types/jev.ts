/**
 * R7.3 — evidence-backed facts and JEV scoring types.
 *
 * A fact is only ever produced from an observed evidence span on an analysed asset.
 * A score is only ever produced from facts that exist. Nothing here is generative:
 * derived SEO copy quotes fact statements, and a dimension with no supporting fact
 * scores `null` instead of a guess.
 */
import type { AssetRef } from './media'

export type FactKind =
  | 'subject'
  | 'action'
  | 'setting'
  | 'on_screen_text'
  | 'product_attribute'
  | 'audio'
  | 'shot'
  | 'seo_title'
  | 'seo_description'
  | 'seo_keyword'

/** Where in the analysed asset an observation was made. */
export interface EvidenceSpan {
  /** The analysed asset the observation came from. Never a different asset. */
  assetRefId: string
  /** Offset into the video, in seconds. Zero is a valid span. */
  timestampSeconds?: number
  /** Shot or frame identifier when the analyzer works shot by shot. */
  shotId?: string
}

export interface Fact {
  id: string
  kind: FactKind
  statement: string
  evidence: EvidenceSpan
  /** 0..1. A low-confidence fact still counts as evidence; it never becomes a guess. */
  confidence: number
  /** Present on derived facts (for example SEO copy): the fact ids it quotes. */
  derivedFrom?: string[]
}

export interface FactsBundle {
  assetRefId: string
  facts: Fact[]
  /** Observations thrown away because they carried no usable evidence span. */
  droppedWithoutEvidence: number
}

export type SeoFactKind = 'seo_title' | 'seo_description' | 'seo_keyword'

/** SEO copy proposed by an operator or another system, before it is validated. */
export interface SeoProposal {
  kind: SeoFactKind
  value: string
  factIds: string[]
}

export type SeoRejectionReason = 'unknown_fact_id' | 'no_supporting_facts' | 'empty_value' | 'invalid_kind'

export interface RejectedSeoProposal {
  proposal: SeoProposal
  reason: SeoRejectionReason
  detail: string
}

export interface SeoFacts {
  assetRefId: string
  /** Derived `seo_*` facts, each citing the fact ids it quoted. */
  facts: Fact[]
  /** Proposals refused because they were unsupported or referenced missing facts. */
  rejected: RejectedSeoProposal[]
}

/** One kind of evidence a rubric dimension rewards, and what it is worth. */
export interface JevSignal {
  kind: FactKind
  /** Maximum contribution of this signal to the dimension score, 0..100. */
  points: number
}

export interface JevDimensionSpec {
  id: string
  /** Share of the overall score. All dimension weights must sum to exactly 1.0. */
  weight: number
  signals: JevSignal[]
  /** Distinct supporting facts needed before the dimension is scorable at all. */
  minimumFacts: number
}

export interface JevRubric {
  id: string
  dimensions: JevDimensionSpec[]
  /** Below this many scorable dimensions the overall score is null, not an average. */
  minimumScorableDimensions: number
}

export interface JevDimension {
  id: string
  weight: number
  /** 0..100, or null when the evidence is insufficient. */
  score: number | null
  /** Facts that produced the score. Always empty when `score` is null. */
  factIds: string[]
  rationale: string
}

export interface InsufficientEvidenceReason {
  code: 'insufficient_evidence'
  scope: 'dimension' | 'overall'
  dimensionId?: string
  message: string
}

export interface JevScore {
  dimensions: JevDimension[]
  /** Weighted mean over the scorable dimensions only, or null. */
  overall: number | null
  insufficientReasons: InsufficientEvidenceReason[]
}

export interface AnalyzedVideo {
  asset: AssetRef
  facts: FactsBundle
  analysedAt: string
}
