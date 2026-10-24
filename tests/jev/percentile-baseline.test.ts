import { describe, expect, it } from 'vitest'
import type { JevScore } from '../../types/jev'
import { JEV_QUESTION_SET_VERSION } from '../../server/jev/questions'
import { BaselineVersionError, buildBaseline, diagnoseDelta, percentileOf } from '../../server/jev/baseline'

const makeScore = (a: number | null, b: number | null): JevScore => ({
  dimensions: [
    { id: 'hook', weight: 0.5, score: a, factIds: [], rationale: '' },
    { id: 'proof', weight: 0.5, score: b, factIds: [], rationale: '' },
  ], overall: null, insufficientReasons: [],
})
const library = [10, 20, 30, 40, 50].map((value, index) => ({
  assetRefId: `asset-${index}`, score: makeScore(value, value * 2), extractorVersion: 'e1', rubricVersion: 'r1',
  questionSetVersion: JEV_QUESTION_SET_VERSION, label: index < 3 ? 'viral' as const : 'control' as const, evidenceRefs: [`ref-${index}`],
}))

describe('labelled percentile baseline', () => {
  it('computes exact quartiles and empirical percentile values', () => {
    const baseline = buildBaseline(library)
    expect(baseline.hook).toEqual({ n: 5, p25: 20, median: 30, p75: 40, mean: 30 })
    expect(percentileOf(makeScore(30, 80), baseline)).toEqual({ hook: 50, proof: 75 })
  })
  it.each(['extractorVersion', 'rubricVersion', 'questionSetVersion'] as const)('rejects mixed %s', (key) => {
    expect(() => buildBaseline([...library, { ...library[0], [key]: 'other' }])).toThrow(BaselineVersionError)
  })
  it('computes medians with fewer than five, but rejects percentile requests', () => {
    const baseline = buildBaseline(library.slice(0, 4))
    expect(baseline.hook.median).toBe(25)
    expect(() => percentileOf(makeScore(30, 60), baseline)).toThrow(BaselineVersionError)
  })
  it('skips null dimensions without renormalizing remaining gaps', () => {
    const baseline = buildBaseline(library)
    expect(diagnoseDelta(makeScore(null, 20), baseline)).toEqual([{ dimension: 'proof', percentile: 0, gap: 50 }])
  })
})
