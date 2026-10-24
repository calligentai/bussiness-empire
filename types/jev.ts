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
  | 'soundRef'
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
  /** Timestamped interval that supports an audio-derived fact. */
  audioSpan?: { startSeconds: number; endSeconds: number }
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

export interface AdEligibilityViolation {
  code: 'commerce_music_ineligible'
  soundId: string
  message: string
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

/* ------------------------------------------------------------------------- *
 * Cohort baseline and question-level diagnosis
 *
 * A single JEV score is absolute. The relative layer is a labelled library that
 * supplies per-dimension distributions and per-question prevalences, so a new
 * creative can be placed against a cohort and told what to fix. Nothing here
 * trains a model or collapses the result into one "virality score".
 * ------------------------------------------------------------------------- */

/** The versions that make two JEV results comparable at all. */
export interface JevVersions {
  extractorVersion: string
  rubricVersion: string
  questionSetVersion: string
}

/** One labelled creative in the reference library. */
export interface BaselineEntry {
  id: string
  extractorVersion: string
  rubricVersion: string
  questionSetVersion: string
  /** The score produced when this entry was analysed. */
  score: JevScore
  /** Per-question probabilities for this creative, used for cohort prevalence. */
  answers?: QuestionAnswer[]
  /**
   * Outcome metadata. Used for cohort labelling and stratification only. It is
   * never an input to `scoreJev` and must not reach the analysed state. Keep CTR,
   * views and likes out of the facts and the extractor prompt.
   */
  outcome?: {
    cohort?: 'viral' | 'control' | 'unknown'
    /** Click-through rate in percent, as reported by the source. */
    ctr?: number
  }
}

export interface DimensionDistribution {
  n: number
  min: number
  p25: number
  median: number
  p75: number
  max: number
  mean: number
}

export interface QuestionPrevalence {
  /** Entries that answered the question. */
  n: number
  /** Mean probability across those entries, 0..1. */
  prevalence: number
}

export interface JevBaseline {
  versions: JevVersions
  cohort: 'viral' | 'control' | 'all'
  entryCount: number
  dimensions: Record<string, DimensionDistribution>
  questionPrevalence: Record<string, QuestionPrevalence>
}

export interface BaselineOptions {
  /** Which labelled cohort to build from. Defaults to `viral`. */
  cohort?: 'viral' | 'control' | 'all'
  /**
   * Minimum CTR (percent) required to accept an entry. A missing CTR fails the
   * gate instead of silently weakening the cohort.
   */
  minimumCtr?: number
}

/** One frozen, atomic question about a specific part of the creative. */
export interface JevQuestion {
  id: string
  /** The rubric dimension this question's answer supports. */
  dimensionId: string
  prompt: string
  window: 'hook' | 'proof' | 'craft' | 'cta'
}

/**
 * A per-asset answer to one question. `probability` is a 0..1 judgement, not a
 * boolean. The answer only counts when it resolves to a real evidence span.
 */
export interface QuestionAnswer {
  questionId: string
  probability: number | null
  factIds?: string[]
  evidence?: EvidenceSpan
}

export type DiagnoseStatus = 'issue' | 'ok' | 'insufficient_evidence'

export interface QuestionDiagnosis {
  questionId: string
  dimensionId: string
  prompt: string
  status: DiagnoseStatus
  cohortPrevalence: number | null
  assetProbability: number | null
  gap: number | null
  priority: number | null
  evidence: EvidenceSpan | null
  factIds: string[]
  message: string
}

export interface JevIssue {
  questionId: string
  dimensionId: string
  prompt: string
  cohortPrevalence: number
  assetProbability: number
  gap: number
  priority: number
  evidence: EvidenceSpan
  factIds: string[]
}

export interface DiagnoseResult {
  issues: JevIssue[]
  /** Every question in the frozen set's order, including non-issues. */
  questions: QuestionDiagnosis[]
  /** Quartile-anchored percentile estimate per scorable dimension. */
  percentiles: Record<string, number | null>
}

export interface AnalyzedVideo {
  asset: AssetRef
  facts: FactsBundle
  analysedAt: string
}
