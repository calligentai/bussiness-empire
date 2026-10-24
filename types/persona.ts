/**
 * Buyer-persona trial contract (R7.4).
 *
 * An AI persona produces `AiJudgement` per creative asset. Real viewers produce
 * `MeasurementRow` per asset variant. The harness compares the two and the report
 * labels every conclusion with the provenance of the data behind it.
 *
 * Nothing here asserts that an AI judgement predicts viewer behaviour. That claim is
 * exactly what the trial measures, and it is unproven until real rows exist.
 */

/** One judged quality of an asset, 0-100. */
export interface AiJudgementDimension {
  name: string;
  score: number;
}

/** A persona's prediction for one creative asset. */
export interface AiJudgement {
  /** Matches `AssetRef.id` from types/media.ts. */
  assetRefId: string;
  /** Overall predicted quality, 0-100. */
  predictedScore: number;
  dimensions: AiJudgementDimension[];
  /** Identifies which persona/model produced the judgement. */
  judgeId?: string;
  judgedAt?: string;
}

/** Where a measurement row came from. Never aggregate the two. */
export type MeasurementSource = "real" | "simulated";

/** Observed viewer behaviour for one asset variant. */
export interface MeasurementRow {
  assetRefId: string;
  variantId: string;
  impressions: number;
  watchTimeSeconds: number;
  scrollStop: boolean;
  /** Click-through rate as a fraction (0-1), not a percentage. */
  ctr: number;
  conversions: number;
  source: MeasurementSource;
  collectedAt: string;
}

/** Which observed metric the trial ranks assets by. */
export type ObservedMetric = "watchTimeSeconds" | "scrollStopRate" | "ctr" | "conversionRate";

export interface ComparisonPolicy {
  /** Minimum number of matched asset pairs before a correlation is reported. */
  minSampleSize: number;
  metric: ObservedMetric;
  /** Number of equal-width predicted-score bands spanning 0-100. */
  buckets: number;
}

/** Predicted-score band compared against the observed score of the same assets. */
export interface CalibrationBucket {
  min: number;
  max: number;
  count: number;
  /** Mean `predictedScore` of the assets in the band, 0-100. */
  predictedMean: number;
  /** Mean observed score of the same assets, 0-100, normalised within this sample. */
  observedMean: number;
}

export interface PersonaComparison {
  /** Spearman rank correlation between predicted and observed scores, -1..1. */
  rankCorrelation: number;
  calibrationBuckets: CalibrationBucket[];
  /** Matched asset pairs behind the number. Not impressions, not rows. */
  sampleSize: number;
  /** Measurement rows rejected because `impressions` was 0, per the measurement contract. */
  droppedRows: number;
  /** Judgements with no usable measurement row, so excluded from this comparison. */
  excludedJudgements: number;
  dataSource: MeasurementSource;
  /** Mandatory provenance label, rendered on every report section. */
  label: string;
}
