import { describe, expect, it } from 'vitest'
import type { Fact, JevRubric } from '../../types/jev'
import { DEFAULT_JEV_RUBRIC, JevRubricError, scoreJev, validateRubric } from '../../server/jev/scoring'

const fact = (overrides: Partial<Fact> & Pick<Fact, 'id' | 'kind' | 'statement'>): Fact => ({
  confidence: 1,
  evidence: { assetRefId: 'asset-video-1', timestampSeconds: 1 },
  ...overrides,
})

const rubric: JevRubric = {
  id: 'test-rubric',
  minimumScorableDimensions: 2,
  dimensions: [
    {
      id: 'hook',
      weight: 0.5,
      minimumFacts: 1,
      signals: [
        { kind: 'action', points: 60 },
        { kind: 'on_screen_text', points: 40 },
      ],
    },
    {
      id: 'product',
      weight: 0.3,
      minimumFacts: 1,
      signals: [{ kind: 'product_attribute', points: 100 }],
    },
    {
      id: 'seo',
      weight: 0.2,
      minimumFacts: 2,
      signals: [
        { kind: 'seo_title', points: 50 },
        { kind: 'seo_keyword', points: 50 },
      ],
    },
  ],
}

const fullFacts: Fact[] = [
  fact({ id: 'fact-1', kind: 'action', statement: 'A hand pours milk' }),
  fact({ id: 'fact-2', kind: 'on_screen_text', statement: 'Lava Bean', confidence: 0.5 }),
  fact({ id: 'fact-3', kind: 'product_attribute', statement: 'Oat milk' }),
  fact({ id: 'fact-4', kind: 'seo_title', statement: 'Lava Bean', confidence: 0.5 }),
  fact({ id: 'fact-5', kind: 'seo_keyword', statement: 'oat milk', confidence: 0.5 }),
]

const dimension = (score: ReturnType<typeof scoreJev>, id: string) =>
  score.dimensions.find((entry) => entry.id === id)!

describe('validateRubric', () => {
  it('accepts the shipped default rubric whose weights sum to 1.0', () => {
    expect(() => validateRubric(DEFAULT_JEV_RUBRIC)).not.toThrow()
    const total = DEFAULT_JEV_RUBRIC.dimensions.reduce((sum, entry) => sum + entry.weight, 0)
    expect(total).toBeCloseTo(1, 10)
  })

  it('rejects a rubric whose weights do not sum to 1.0', () => {
    const invalid: JevRubric = { ...rubric, dimensions: rubric.dimensions.map((entry) => ({ ...entry, weight: entry.weight - 0.1 })) }
    expect(() => validateRubric(invalid)).toThrow(JevRubricError)
    expect(() => scoreJev(fullFacts, invalid)).toThrow(/sum/i)
  })

  it('rejects duplicate dimension ids, negative weights and impossible minimums', () => {
    expect(() => validateRubric({ ...rubric, dimensions: [rubric.dimensions[0], { ...rubric.dimensions[1], id: 'hook', weight: 0.5 }] })).toThrow(/duplicate/i)
    expect(() => validateRubric({ ...rubric, dimensions: [{ ...rubric.dimensions[0], weight: -0.5 }, { ...rubric.dimensions[1], weight: 0.9 }, { ...rubric.dimensions[2], weight: 0.6 }] })).toThrow(/negative/i)
    expect(() => validateRubric({ ...rubric, minimumScorableDimensions: 4 })).toThrow(/minimum/i)
    expect(() => validateRubric({ ...rubric, minimumScorableDimensions: 0 })).toThrow(/minimum/i)
  })

  it('rejects a signal whose points fall outside 0-100', () => {
    const invalid: JevRubric = {
      ...rubric,
      dimensions: rubric.dimensions.map((entry) => ({ ...entry, signals: entry.signals.map((signal) => ({ ...signal, points: 140 })) })),
    }
    expect(() => validateRubric(invalid)).toThrow(/points/i)
  })
})

describe('scoreJev', () => {
  it('scores every dimension that has supporting facts and cites the fact ids', () => {
    const score = scoreJev(fullFacts, rubric)

    expect(score.dimensions.map((entry) => entry.id)).toEqual(['hook', 'product', 'seo'])
    expect(dimension(score, 'hook')).toMatchObject({ score: 80, factIds: ['fact-1', 'fact-2'] })
    expect(dimension(score, 'product')).toMatchObject({ score: 100, factIds: ['fact-3'] })
    expect(dimension(score, 'seo')).toMatchObject({ score: 50, factIds: ['fact-4', 'fact-5'] })
    expect(score.insufficientReasons).toEqual([])
    expect(score.overall).toBe(80)
  })

  it('reports null and an insufficient_evidence reason for a dimension without facts', () => {
    const hookOnly = fullFacts.slice(0, 2)
    const score = scoreJev(hookOnly, rubric)

    expect(dimension(score, 'hook').score).toBe(80)
    for (const id of ['product', 'seo']) {
      expect(dimension(score, id).score).toBeNull()
      expect(dimension(score, id).factIds).toEqual([])
      expect(score.insufficientReasons).toContainEqual(
        expect.objectContaining({ code: 'insufficient_evidence', scope: 'dimension', dimensionId: id }),
      )
    }
  })

  it('returns a null overall below the rubric minimum scorable dimensions', () => {
    const hookOnly = fullFacts.slice(0, 2)
    const score = scoreJev(hookOnly, rubric)

    expect(score.overall).toBeNull()
    expect(score.insufficientReasons.filter((entry) => entry.scope === 'overall')).toHaveLength(1)
    expect(score.insufficientReasons.find((entry) => entry.scope === 'overall')!.message).toMatch(/minimum/i)
  })

  it('never averages a null dimension into the overall score', () => {
    const loosened: JevRubric = { ...rubric, minimumScorableDimensions: 1 }
    const score = scoreJev(fullFacts.slice(0, 2), loosened)

    expect(dimension(score, 'product').score).toBeNull()
    expect(score.overall).toBe(80)
  })

  it('weights scorable dimensions by their own weight, renormalised over the scorable set', () => {
    const loosened: JevRubric = { ...rubric, minimumScorableDimensions: 1 }
    const onlyProduct = scoreJev([fact({ id: 'fact-3', kind: 'product_attribute', statement: 'Oat milk', confidence: 0.5 })], loosened)

    expect(dimension(onlyProduct, 'product').score).toBe(50)
    expect(onlyProduct.overall).toBe(50)
  })

  it('clamps a dimension score to 100 and rounds to an integer', () => {
    const hot: JevRubric = {
      ...rubric,
      dimensions: [{ id: 'hook', weight: 1, minimumFacts: 1, signals: [{ kind: 'action', points: 100 }, { kind: 'on_screen_text', points: 100 }] }],
      minimumScorableDimensions: 1,
    }
    const score = scoreJev(fullFacts.slice(0, 2), hot)

    expect(dimension(score, 'hook').score).toBe(100)
    expect(score.overall).toBe(100)
  })

  it('requires the dimension minimum number of facts before it scores', () => {
    const score = scoreJev([fullFacts[3]], rubric)

    expect(dimension(score, 'seo').score).toBeNull()
    expect(score.insufficientReasons).toContainEqual(
      expect.objectContaining({ scope: 'dimension', dimensionId: 'seo', code: 'insufficient_evidence' }),
    )
  })

  it('ignores facts of kinds the dimension does not accept and keeps input immutable', () => {
    const snapshot = JSON.stringify(fullFacts)
    const score = scoreJev([fact({ id: 'noise', kind: 'setting', statement: 'A cafe' })], rubric)

    expect(score.dimensions.every((entry) => entry.score === null)).toBe(true)
    expect(score.overall).toBeNull()
    expect(JSON.stringify(fullFacts)).toBe(snapshot)
  })

  it('explains each scored and unscored dimension with a rationale', () => {
    const score = scoreJev(fullFacts.slice(0, 2), rubric)

    for (const entry of score.dimensions) {
      expect(entry.rationale.length).toBeGreaterThan(0)
      if (entry.score === null) expect(entry.rationale).toMatch(/evidence/i)
    }
  })

  it('stays in sync with the documented rubric ids and weights', async () => {
    const { readFile } = await import('node:fs/promises')
    const doc = await readFile(new URL('../../docs/jev/scoring-rubric.md', import.meta.url), 'utf8')

    expect(doc).toMatch(/weights sum to 1\.0/i)
    for (const spec of DEFAULT_JEV_RUBRIC.dimensions) {
      expect(doc).toContain(`\`${spec.id}\``)
      expect(doc).toContain(spec.weight.toFixed(2))
    }
  })
})
