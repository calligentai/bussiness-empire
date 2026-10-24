import { describe, expect, it } from 'vitest'
import type { BaselineEntry, JevScore, QuestionAnswer } from '../../types/jev'
import { JevBaselineError, buildBaseline, percentileOf } from '../../server/jev/baseline'
import { JEV_QUESTION_SET_VERSION } from '../../server/jev/questions'

const HOOK = 'hook_product_or_problem'
const PROOF = 'proof_product_used'

const score = (values: Record<string, number | null>): JevScore => ({
  dimensions: Object.entries(values).map(([id, value]) => ({
    id,
    weight: 0.2,
    score: value,
    factIds: value === null ? [] : ['fact-1'],
    rationale: 'fixture',
  })),
  overall: null,
  insufficientReasons: [],
})

const answer = (questionId: string, probability: number | null): QuestionAnswer => ({
  questionId,
  probability,
})

const entry = (
  id: string,
  ctr: number | undefined,
  values: Record<string, number | null>,
  answers: QuestionAnswer[] = [],
  overrides: Partial<BaselineEntry> = {},
): BaselineEntry => ({
  id,
  extractorVersion: 'extractor-1',
  rubricVersion: 'rubric-1',
  questionSetVersion: JEV_QUESTION_SET_VERSION,
  score: score(values),
  answers,
  outcome: ctr === undefined ? { cohort: 'viral' } : { cohort: 'viral', ctr },
  ...overrides,
})

describe('buildBaseline', () => {
  it('summarises a dimension without inventing scores for null dimensions', () => {
    const baseline = buildBaseline([
      entry('a', 5, { hook_strength: 10, product_clarity: null }),
      entry('b', 5, { hook_strength: 20, product_clarity: 50 }),
      entry('c', 5, { hook_strength: 30, product_clarity: null }),
      entry('d', 5, { hook_strength: 40, product_clarity: 70 }),
    ])

    expect(baseline.entryCount).toBe(4)
    expect(baseline.dimensions.hook_strength).toEqual({
      n: 4,
      min: 10,
      p25: 17.5,
      median: 25,
      p75: 32.5,
      max: 40,
      mean: 25,
    })
    // Only the two scorable product_clarity observations are used.
    expect(baseline.dimensions.product_clarity).toMatchObject({ n: 2, min: 50, max: 70, mean: 60 })
  })

  it('computes question prevalence from answered questions only', () => {
    const baseline = buildBaseline([
      entry('a', 5, { hook_strength: 30 }, [answer(HOOK, 0.8), answer(PROOF, null)]),
      entry('b', 5, { hook_strength: 40 }, [answer(HOOK, 0.6)]),
    ])

    expect(baseline.questionPrevalence[HOOK]).toEqual({ n: 2, prevalence: 0.7 })
    expect(baseline.questionPrevalence[PROOF]).toBeUndefined()
  })

  it.each([
    ['extractorVersion', { extractorVersion: 'extractor-2' }],
    ['rubricVersion', { rubricVersion: 'rubric-2' }],
    ['questionSetVersion', { questionSetVersion: 'question-set-2' }],
  ])('refuses a mixed %s cohort', (_field, overrides) => {
    expect(() =>
      buildBaseline([
        entry('a', 5, { hook_strength: 30 }),
        entry('b', 5, { hook_strength: 40 }, [], overrides),
      ]),
    ).toThrow(JevBaselineError)
  })

  it('refuses a question set that is not the frozen one', () => {
    expect(() =>
      buildBaseline([entry('a', 5, { hook_strength: 30 }, [], { questionSetVersion: '0.9.0' })]),
    ).toThrow(/question set/i)
  })

  it('builds from the viral cohort by default and can include controls explicitly', () => {
    const entries = [
      entry('viral', 5, { hook_strength: 60 }),
      entry('control', 1, { hook_strength: 20 }, [], {
        outcome: { cohort: 'control', ctr: 1 },
      }),
    ]

    expect(buildBaseline(entries).entryCount).toBe(1)
    expect(buildBaseline(entries).dimensions.hook_strength.median).toBe(60)
    expect(buildBaseline(entries, { cohort: 'all' }).entryCount).toBe(2)
    expect(buildBaseline(entries, { cohort: 'control' }).entryCount).toBe(1)
  })

  it('refuses a cohort with no entries', () => {
    expect(() => buildBaseline([entry('a', 5, { hook_strength: 30 }, [], { outcome: { cohort: 'control' } })])).toThrow(
      /no viral entries/i,
    )
  })

  it('gates the cohort on CTR instead of silently accepting weak labels', () => {
    expect(() => buildBaseline([entry('weak', 2.9, { hook_strength: 30 })], { minimumCtr: 3 })).toThrow(
      /ctr/i,
    )
    expect(() => buildBaseline([entry('unknown', undefined, { hook_strength: 30 })], { minimumCtr: 3 })).toThrow(
      /ctr/i,
    )
    expect(() => buildBaseline([entry('ok', 3.2, { hook_strength: 30 })], { minimumCtr: 3 })).not.toThrow()
  })

  it('is deterministic', () => {
    const entries = [
      entry('a', 5, { hook_strength: 30 }, [answer(HOOK, 0.9)]),
      entry('b', 5, { hook_strength: 10 }, [answer(HOOK, 0.5)]),
    ]
    expect(buildBaseline(entries)).toEqual(buildBaseline(entries))
  })
})

describe('percentileOf', () => {
  const distribution = { n: 4, min: 10, p25: 17.5, median: 25, p75: 32.5, max: 40, mean: 25 }

  it('anchors the quartiles and the extremes', () => {
    expect(percentileOf(10, distribution)).toBe(0)
    expect(percentileOf(17.5, distribution)).toBe(25)
    expect(percentileOf(25, distribution)).toBe(50)
    expect(percentileOf(32.5, distribution)).toBe(75)
    expect(percentileOf(40, distribution)).toBe(100)
  })

  it('interpolates between anchors and clamps outside the range', () => {
    expect(percentileOf(21.25, distribution)).toBe(38)
    expect(percentileOf(-100, distribution)).toBe(0)
    expect(percentileOf(100, distribution)).toBe(100)
  })

  it('returns the midpoint when the cohort has no spread', () => {
    expect(percentileOf(50, { ...distribution, min: 50, p25: 50, median: 50, p75: 50, max: 50 })).toBe(50)
  })
})
