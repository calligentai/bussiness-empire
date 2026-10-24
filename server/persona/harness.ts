import type {
  AiJudgement,
  CalibrationBucket,
  ComparisonPolicy,
  MeasurementRow,
  ObservedMetric,
  PersonaComparison,
} from '../../types/persona'
import {
  PersonaDuplicateJudgementError,
  PersonaInputError,
  PersonaSampleSizeError,
  PersonaSourceMismatchError,
} from './errors'
import { labelFor } from './labels'

export {
  PersonaDuplicateJudgementError,
  PersonaInputError,
  PersonaSampleSizeError,
  PersonaSourceMismatchError,
} from './errors'

interface Pair {
  assetRefId: string
  predicted: number
  observed: number
}

const isFiniteNumber = (value: number): boolean => typeof value === 'number' && Number.isFinite(value)

const mean = (values: number[]): number => values.reduce((total, value) => total + value, 0) / values.length

const observedValue = (rows: MeasurementRow[], metric: ObservedMetric): number => {
  switch (metric) {
    case 'watchTimeSeconds':
      return mean(rows.map((row) => row.watchTimeSeconds))
    case 'scrollStopRate':
      return rows.filter((row) => row.scrollStop).length / rows.length
    case 'ctr':
      return mean(rows.map((row) => row.ctr))
    case 'conversionRate': {
      const impressions = rows.reduce((total, row) => total + row.impressions, 0)
      if (impressions <= 0) {
        throw new PersonaInputError('Conversion rate needs at least one impression')
      }
      return rows.reduce((total, row) => total + row.conversions, 0) / impressions
    }
    default:
      throw new PersonaInputError(`Unsupported observed metric: ${String(metric)}`)
  }
}

/** Ranks 1..n with ties sharing their average rank. */
const averageRanks = (values: number[]): number[] => {
  const ordered = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value)
  const ranks = new Array<number>(values.length)
  let position = 0
  while (position < ordered.length) {
    let end = position
    while (end + 1 < ordered.length && ordered[end + 1].value === ordered[position].value) {
      end += 1
    }
    const sharedRank = (position + end) / 2 + 1
    for (let cursor = position; cursor <= end; cursor += 1) {
      ranks[ordered[cursor].index] = sharedRank
    }
    position = end + 1
  }
  return ranks
}

const pearson = (left: number[], right: number[]): number => {
  const leftMean = mean(left)
  const rightMean = mean(right)
  let covariance = 0
  let leftVariance = 0
  let rightVariance = 0
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean
    const rightDelta = right[index] - rightMean
    covariance += leftDelta * rightDelta
    leftVariance += leftDelta * leftDelta
    rightVariance += rightDelta * rightDelta
  }
  if (leftVariance === 0 || rightVariance === 0) {
    throw new PersonaInputError('Scores have no variance, so no rank correlation is defined')
  }
  return covariance / Math.sqrt(leftVariance * rightVariance)
}

/** Min-max scaling to 0-100 within the sample. A flat sample maps to 50. */
const normalise = (values: number[]): number[] => {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  return values.map((value) => (range === 0 ? 50 : ((value - min) / range) * 100))
}

const bucketIndexOf = (score: number, policy: ComparisonPolicy): number => {
  const width = 100 / policy.buckets
  return Math.min(Math.floor(score / width), policy.buckets - 1)
}

const buildBuckets = (pairs: Pair[], policy: ComparisonPolicy): CalibrationBucket[] => {
  const width = 100 / policy.buckets
  return Array.from({ length: policy.buckets }, (_, index) => {
    const min = index * width
    const max = (index + 1) * width
    const inBand = pairs.filter((pair) => bucketIndexOf(pair.predicted, policy) === index)
    return {
      min,
      max,
      count: inBand.length,
      predictedMean: inBand.length === 0 ? 0 : mean(inBand.map((pair) => pair.predicted)),
      observedMean: inBand.length === 0 ? 0 : mean(inBand.map((pair) => pair.observed)),
    }
  })
}

/**
 * Compare AI judgements with measured viewer behaviour.
 *
 * Refuses rather than guesses: mixed provenance, duplicate judgements, too few matched
 * assets, and zero-variance scores all raise typed errors instead of a correlation.
 */
export const compare = (
  judgements: AiJudgement[],
  measurements: MeasurementRow[],
  policy: ComparisonPolicy,
): PersonaComparison => {
  if (!Number.isInteger(policy.minSampleSize) || policy.minSampleSize < 2) {
    throw new PersonaInputError('minSampleSize must be an integer of at least 2')
  }
  if (!Number.isInteger(policy.buckets) || policy.buckets < 1) {
    throw new PersonaInputError('buckets must be a positive integer')
  }

  const sources = new Set(measurements.map((row) => row.source))
  if (sources.size > 1) {
    throw new PersonaSourceMismatchError(
      `Measurement rows mix sources: ${[...sources].sort().join(', ')}`,
    )
  }
  if (sources.size === 0) {
    throw new PersonaSampleSizeError('No measurement rows were provided')
  }
  const dataSource = measurements[0].source

  const byAsset = new Map<string, AiJudgement>()
  for (const judgement of judgements) {
    if (!isFiniteNumber(judgement.predictedScore) || judgement.predictedScore < 0 || judgement.predictedScore > 100) {
      throw new PersonaInputError(`Predicted score for ${judgement.assetRefId} is outside 0-100`)
    }
    if (byAsset.has(judgement.assetRefId)) {
      throw new PersonaDuplicateJudgementError(`Duplicate judgement for asset ${judgement.assetRefId}`)
    }
    byAsset.set(judgement.assetRefId, judgement)
  }

  const rowsByAsset = new Map<string, MeasurementRow[]>()
  let droppedRows = 0
  for (const row of measurements) {
    const forAsset = rowsByAsset.get(row.assetRefId) ?? []
    for (const field of [row.impressions, row.watchTimeSeconds, row.ctr, row.conversions] as number[]) {
      if (!isFiniteNumber(field) || field < 0) {
        throw new PersonaInputError(`Measurement ${row.variantId} has a negative or non-finite value`)
      }
    }
    if (row.impressions === 0) {
      droppedRows += 1
      continue
    }
    if (typeof row.scrollStop !== 'boolean') {
      throw new PersonaInputError(`Measurement ${row.variantId} has a non-boolean scrollStop`)
    }
    if (row.ctr > 1) {
      throw new PersonaInputError(
        `Measurement ${row.variantId} has ctr ${row.ctr}; the export must carry a 0-1 rate, not a percentage`,
      )
    }
    if (row.conversions > row.impressions) {
      throw new PersonaInputError(
        `Measurement ${row.variantId} has ${row.conversions} conversions against ${row.impressions} impressions`,
      )
    }
    forAsset.push(row)
    rowsByAsset.set(row.assetRefId, forAsset)
  }

  const matchedAssetIds = [...rowsByAsset.keys()].filter((assetRefId) => byAsset.has(assetRefId)).sort()
  if (matchedAssetIds.length < policy.minSampleSize) {
    throw new PersonaSampleSizeError(
      `Matched asset pairs: ${matchedAssetIds.length}, policy minSampleSize is ${policy.minSampleSize}`,
    )
  }

  const observedValues = matchedAssetIds.map((assetRefId) =>
    observedValue(rowsByAsset.get(assetRefId) as MeasurementRow[], policy.metric),
  )
  const observedScores = normalise(observedValues)

  const pairs: Pair[] = matchedAssetIds.map((assetRefId, index) => ({
    assetRefId,
    predicted: (byAsset.get(assetRefId) as AiJudgement).predictedScore,
    observed: observedScores[index],
  }))

  const rankCorrelation = pearson(
    averageRanks(pairs.map((pair) => pair.predicted)),
    averageRanks(pairs.map((pair) => pair.observed)),
  )

  return {
    rankCorrelation,
    calibrationBuckets: buildBuckets(pairs, policy),
    sampleSize: pairs.length,
    droppedRows,
    excludedJudgements: byAsset.size - matchedAssetIds.length,
    dataSource,
    label: labelFor(dataSource),
  }
}
