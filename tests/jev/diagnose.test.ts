import { describe, expect, it } from 'vitest'
import type { BaselineEntry, Fact, JevScore, QuestionAnswer } from '../../types/jev'
import { buildBaseline, diagnose } from '../../server/jev/baseline'
import { JEV_QUESTION_SET_VERSION, getJevQuestion } from '../../server/jev/questions'

const HOOK = 'hook_product_or_problem'
const PROOF = 'proof_product_used'
const CTA = 'cta_benefit'

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

const answer = (
  questionId: string,
  probability: number | null,
  factIds?: string[],
  timestampSeconds?: number,
): QuestionAnswer => ({
  questionId,
  probability,
  ...(factIds ? { factIds } : {}),
  ...(timestampSeconds === undefined ? {} : { evidence: { assetRefId: 'asset-1', timestampSeconds } }),
})

const entry = (
  id: string,
  values: Record<string, number | null>,
  answers: QuestionAnswer[],
  ctr = 6,
): BaselineEntry => ({
  id,
  extractorVersion: 'extractor-1',
  rubricVersion: 'rubric-1',
  questionSetVersion: JEV_QUESTION_SET_VERSION,
  score: score(values),
  answers,
  outcome: { cohort: 'viral', ctr },
})

const cohort = (): BaselineEntry[] => [
  entry('viral-1', { hook_strength: 60, product_clarity: 60, call_to_action: 60 }, [
    answer(HOOK, 1, ['fact-1'], 1),
    answer(PROOF, 0.9, ['fact-1'], 2),
    answer(CTA, 0.8, ['fact-1'], 3),
  ]),
  entry('viral-2', { hook_strength: 70, product_clarity: 70, call_to_action: 70 }, [
    answer(HOOK, 1, ['fact-1'], 1),
    answer(PROOF, 0.9, ['fact-1'], 2),
    answer(CTA, 0.8, ['fact-1'], 3),
  ]),
  entry('viral-3', { hook_strength: 80, product_clarity: 80, call_to_action: 80 }, [
    answer(HOOK, 1, ['fact-1'], 1),
    answer(PROOF, 0.9, ['fact-1'], 2),
    answer(CTA, 0.8, ['fact-1'], 3),
  ]),
]

const facts: Fact[] = [
  {
    id: 'fact-1',
    kind: 'action',
    statement: 'The product is used on camera.',
    evidence: { assetRefId: 'asset-1', timestampSeconds: 1 },
    confidence: 1,
  },
]

const findQuestion = (result: ReturnType<typeof diagnose>, id: string) =>
  result.questions.find((question) => question.questionId === id)

describe('diagnose', () => {
  it('ranks evidence-backed gaps by gap × cohort prevalence', () => {
    const baseline = buildBaseline(cohort())
    const result = diagnose(
      score({ hook_strength: 30, product_clarity: 30, call_to_action: 30 }),
      baseline,
      [answer(HOOK, 0.1, ['fact-1'], 0.5), answer(PROOF, 0.2, ['fact-1'], 2), answer(CTA, 0.7, ['fact-1'], 9)],
      facts,
    )

    expect(result.issues.map((issue) => issue.questionId)).toEqual([HOOK, PROOF])
    expect(result.issues[0]).toMatchObject({
      dimensionId: 'hook_strength',
      cohortPrevalence: 1,
      assetProbability: 0.1,
      gap: 0.9,
      priority: 0.9,
      evidence: { assetRefId: 'asset-1', timestampSeconds: 0.5 },
    })
    expect(result.issues[1].priority).toBeCloseTo(0.7 * 0.9, 10)
    // A creative that already beats the threshold is not turned into an issue.
    expect(findQuestion(result, CTA)?.status).toBe('ok')
  })

  it('is deterministic for a fixed cohort and answer set', () => {
    const baseline = buildBaseline(cohort())
    const answers = [answer(HOOK, 0.1, ['fact-1'], 0.5), answer(PROOF, 0.2, ['fact-1'], 2)]
    expect(diagnose(score({ hook_strength: 30, product_clarity: 30 }), baseline, answers, facts)).toEqual(
      diagnose(score({ hook_strength: 30, product_clarity: 30 }), baseline, answers, facts),
    )
  })

  it('skips questions whose dimension has no score, without shifting the other issues', () => {
    const baseline = buildBaseline(cohort())
    const answers = [answer(HOOK, 0.1, ['fact-1'], 0.5), answer(PROOF, 0.2, ['fact-1'], 2)]

    const withProof = diagnose(score({ hook_strength: 30, product_clarity: 30 }), baseline, answers, facts)
    const withoutProof = diagnose(score({ hook_strength: 30, product_clarity: null }), baseline, answers, facts)

    const hookIssue = findQuestion(withoutProof, HOOK)
    expect(hookIssue?.status).toBe('issue')
    expect(hookIssue?.priority).toBe(withProof.questions.find((question) => question.questionId === HOOK)?.priority)
    expect(findQuestion(withoutProof, PROOF)).toMatchObject({
      status: 'insufficient_evidence',
      priority: null,
      evidence: null,
    })
    expect(withoutProof.issues.map((issue) => issue.questionId)).toEqual([HOOK])
  })

  it('reports insufficient evidence instead of a false negative when nothing backs the answer', () => {
    const baseline = buildBaseline(cohort())
    const result = diagnose(score({ hook_strength: 30, product_clarity: 30 }), baseline, [
      answer(HOOK, 0.05),
      answer(PROOF, 0.05, ['fact-1']),
    ])

    expect(findQuestion(result, HOOK)).toMatchObject({ status: 'insufficient_evidence', priority: null })
    // A cited fact id is not a span: without fact data there is no evidence to show.
    expect(findQuestion(result, PROOF)).toMatchObject({ status: 'insufficient_evidence', priority: null })
    expect(result.issues).toEqual([])
  })

  it('rejects answers that cite fact ids missing from the analysed facts', () => {
    const baseline = buildBaseline(cohort())
    const result = diagnose(
      score({ hook_strength: 30 }),
      baseline,
      [answer(HOOK, 0.05, ['fact-does-not-exist'], 0.5)],
      facts,
    )

    expect(findQuestion(result, HOOK)).toMatchObject({
      status: 'insufficient_evidence',
      priority: null,
      message: expect.stringMatching(/unknown fact id/i),
    })
  })

  it('does not raise an issue below the viral prevalence threshold', () => {
    const baseline = buildBaseline([
      entry('a', { hook_strength: 50 }, [answer(HOOK, 0.5, ['fact-1'], 1)]),
      entry('b', { hook_strength: 50 }, [answer(HOOK, 0.5, ['fact-1'], 1)]),
    ])
    const result = diagnose(score({ hook_strength: 30 }), baseline, [answer(HOOK, 0, ['fact-1'], 0.5)], facts)

    expect(findQuestion(result, HOOK)).toMatchObject({ status: 'ok', cohortPrevalence: 0.5, priority: null })
    expect(result.issues).toEqual([])
  })

  it('reports a percentile per scorable dimension from the cohort', () => {
    const baseline = buildBaseline(cohort())
    const result = diagnose(
      score({ hook_strength: 70, product_clarity: 60 }),
      baseline,
      [answer(HOOK, 0.9, ['fact-1'], 0.5), answer(PROOF, 0.9, ['fact-1'], 2)],
      facts,
    )

    expect(result.percentiles.hook_strength).toBe(50)
    expect(result.percentiles.product_clarity).toBe(0)
  })

  it('refuses a baseline produced by a different question set', () => {
    const baseline = buildBaseline(cohort())
    expect(() =>
      diagnose(score({ hook_strength: 30 }), { ...baseline, versions: { ...baseline.versions, questionSetVersion: '0.0.1' } }, []),
    ).toThrow(/question set/i)
  })

  it('ships the frozen question set with every question bound to a real dimension', () => {
    expect(JEV_QUESTION_SET_VERSION).toBe('1.0.0')
    expect(getJevQuestion(HOOK)?.dimensionId).toBe('hook_strength')
    expect(getJevQuestion(PROOF)?.dimensionId).toBe('product_clarity')
    expect(getJevQuestion(CTA)?.dimensionId).toBe('call_to_action')
  })
})
