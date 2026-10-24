import { describe, expect, it } from 'vitest'
import type { QuestionAnswer } from '../../types/jev'
import { agreement, labelAudit } from '../../server/jev/calibration'

const answers = (...values: Array<[string, number | null]>): QuestionAnswer[] =>
  values.map(([questionId, probability]) => ({ questionId, probability }))

describe('agreement', () => {
  it('returns perfect agreement for identical fixture answers', () => {
    const fixture = answers(['hook_product_or_problem', 0.8], ['proof_product_used', 0.3])
    expect(agreement(fixture, fixture)).toEqual({
      perQuestion: { hook_product_or_problem: 1, proof_product_used: 1 },
      overall: 1,
    })
  })

  it('flags exactly the questions whose absolute probability delta exceeds the limit', () => {
    const result = agreement(
      answers(['hook_product_or_problem', 0.1], ['proof_product_used', 0.2], ['cta_benefit', 0.7]),
      answers(['hook_product_or_problem', 0.4], ['proof_product_used', 0.6], ['cta_benefit', 0.75]),
    )
    expect(Object.entries(result.perQuestion).filter(([, value]) => value < 0.8).map(([id]) => id)).toEqual([
      'hook_product_or_problem',
      'proof_product_used',
    ])
    expect(result.perQuestion.cta_benefit).toBe(0.95)
  })
})

describe('labelAudit', () => {
  const rule = { minimumCtr: 3, minimumCohortSize: 2 }

  it('excludes unknown metrics and reports the exclusion count', () => {
    const result = labelAudit(
      [
        { id: 'a', metrics: { ctr: 4 } },
        { id: 'unknown', metrics: {} },
        { id: 'b', metrics: { ctr: 3 } },
      ],
      rule,
    )
    expect(result.cohortSize).toBe(2)
    expect(result.notes).toContain('Excluded 1 entries with unknown CTR metrics.')
  })

  it('does not label from view count alone and fails an undersized measured cohort', () => {
    const result = labelAudit([{ id: 'views-only', metrics: { views: 100_000 } }], rule)
    expect(result.cohortSize).toBe(0)
    expect(result.violations).toContain('Cohort has 0 measured entries; minimum is 2.')
  })
})
