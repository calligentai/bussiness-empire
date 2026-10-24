import { describe, expect, it } from 'vitest'
import type { AiJudgement, ComparisonPolicy, MeasurementRow } from '../../types/persona'
import {
  compare,
  PersonaDuplicateJudgementError,
  PersonaSampleSizeError,
  PersonaSourceMismatchError,
} from '../../server/persona/harness'
import { REAL_LABEL, SIMULATED_LABEL } from '../../server/persona/labels'

const policy: ComparisonPolicy = { minSampleSize: 5, metric: 'watchTimeSeconds', buckets: 5 }

const judgement = (assetRefId: string, predictedScore: number): AiJudgement => ({
  assetRefId,
  predictedScore,
  dimensions: [
    { name: 'hook', score: predictedScore },
    { name: 'clarity', score: predictedScore },
  ],
  judgedAt: '2026-10-01T00:00:00.000Z',
})

const row = (
  assetRefId: string,
  watchTimeSeconds: number,
  source: MeasurementRow['source'] = 'simulated',
): MeasurementRow => ({
  assetRefId,
  variantId: `${assetRefId}-v1`,
  impressions: 1200,
  watchTimeSeconds,
  scrollStop: true,
  ctr: 0.021,
  conversions: 3,
  source,
  collectedAt: '2026-10-20T00:00:00.000Z',
})

/**
 * Fixture ordering (all simulated): predicted 95/85/70/55/40 maps to observed
 * watch time 40/10/30/20/5, so the rank pairs are (1,1) (2,4) (3,2) (4,3) (5,5).
 * Sum of squared rank differences is 6 -> rho = 1 - 6*6/(5*24) = 0.7.
 */
const orderingFixture = () => ({
  judgements: [
    judgement('a', 95),
    judgement('b', 85),
    judgement('c', 70),
    judgement('d', 55),
    judgement('e', 40),
  ],
  measurements: [row('a', 40), row('b', 10), row('c', 30), row('d', 20), row('e', 5)],
})

describe('persona harness', () => {
  it('computes the expected rank correlation for a known fixture ordering', () => {
    const { judgements, measurements } = orderingFixture()
    const result = compare(judgements, measurements, policy)

    expect(result.rankCorrelation).toBeCloseTo(0.7, 10)
    expect(result.sampleSize).toBe(5)
    expect(result.dataSource).toBe('simulated')
    expect(result.label).toBe(SIMULATED_LABEL)
  })

  it('uses average ranks for tied predictions instead of order of appearance', () => {
    const judgements = [judgement('a', 90), judgement('b', 90), judgement('c', 50), judgement('d', 10)]
    const measurements = [row('a', 40), row('b', 10), row('c', 30), row('d', 20)]

    const result = compare(judgements, measurements, { minSampleSize: 4, metric: 'watchTimeSeconds', buckets: 5 })

    // Pearson correlation on average ranks: 0.5 / sqrt(4.5 * 5) = 0.1054...
    expect(result.rankCorrelation).toBeCloseTo(0.1054, 3)
  })

  it('throws a typed sample-size error instead of returning a correlation', () => {
    const judgements = [judgement('a', 90), judgement('b', 50), judgement('c', 10)]
    const measurements = [row('a', 40), row('b', 30), row('c', 20)]

    expect(() => compare(judgements, measurements, policy)).toThrow(PersonaSampleSizeError)
    try {
      compare(judgements, measurements, policy)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).name).toBe('PersonaSampleSizeError')
      expect((error as Error).message).toContain('3')
      expect((error as Error).message).toContain('5')
    }
  })

  it('refuses to mix real and simulated rows in one comparison', () => {
    const { judgements, measurements } = orderingFixture()
    const mixed = [...measurements.slice(0, 4), row('e', 5, 'real')]

    expect(() => compare(judgements, mixed, policy)).toThrow(PersonaSourceMismatchError)
  })

  it('labels a real-data comparison as measured and keeps the source', () => {
    const { judgements, measurements } = orderingFixture()
    const real = measurements.map((measurement) => ({ ...measurement, source: 'real' as const }))

    const result = compare(judgements, real, policy)

    expect(result.dataSource).toBe('real')
    expect(result.label).toBe(REAL_LABEL)
    expect(result.label).not.toContain('SIMULATED')
  })

  it('counts only assets with both a judgement and a measurement', () => {
    const { judgements, measurements } = orderingFixture()
    const extraJudgement = judgement('orphan', 99)
    const orphanRow = row('homeless', 7)

    const result = compare([...judgements, extraJudgement], [...measurements, orphanRow], policy)

    expect(result.sampleSize).toBe(5)
    expect(result.rankCorrelation).toBeCloseTo(0.7, 10)
  })

  it('throws when two judgements claim the same asset instead of silently picking one', () => {
    const { judgements, measurements } = orderingFixture()

    expect(() => compare([...judgements, judgement('a', 10)], measurements, policy)).toThrow(
      PersonaDuplicateJudgementError,
    )
  })

  it('returns calibration buckets that cover the whole 0-100 band and every sample once', () => {
    const { judgements, measurements } = orderingFixture()
    const result = compare(judgements, measurements, policy)

    expect(result.calibrationBuckets).toHaveLength(5)
    expect(result.calibrationBuckets[0]).toMatchObject({ min: 0, max: 20 })
    expect(result.calibrationBuckets[4]).toMatchObject({ min: 80, max: 100 })

    const counted = result.calibrationBuckets.reduce((total, bucket) => total + bucket.count, 0)
    expect(counted).toBe(result.sampleSize)
    expect(result.calibrationBuckets.every((bucket) => Number.isFinite(bucket.predictedMean))).toBe(true)
  })
})
