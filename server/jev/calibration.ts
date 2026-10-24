import type { QuestionAnswer } from '../../types/jev'

export interface AgreementResult {
  /** 1 - absolute probability difference; questions absent from either set are omitted. */
  perQuestion: Record<string, number>
  overall: number
}

export interface CalibrationEntry {
  id: string
  metrics?: {
    /** Measured click-through rate in percent. */
    ctr?: number
    /** Supporting metadata only. Views never determine the label. */
    views?: number
  }
}

export interface LabelAuditRule {
  minimumCtr: number
  minimumCohortSize: number
}

export interface LabelAuditResult {
  violations: string[]
  cohortSize: number
  notes: string[]
}

function answerMap(answers: QuestionAnswer[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const answer of answers) {
    if (
      answer &&
      typeof answer.questionId === 'string' &&
      answer.questionId.trim() !== '' &&
      typeof answer.probability === 'number' &&
      Number.isFinite(answer.probability) &&
      answer.probability >= 0 &&
      answer.probability <= 1
    ) {
      result.set(answer.questionId, answer.probability)
    }
  }
  return result
}

/** Agreement is one minus absolute probability delta for paired answers. */
export function agreement(answersA: QuestionAnswer[], answersB: QuestionAnswer[]): AgreementResult {
  const a = answerMap(answersA)
  const b = answerMap(answersB)
  const perQuestion: Record<string, number> = {}
  for (const [questionId, probabilityA] of a) {
    const probabilityB = b.get(questionId)
    if (probabilityB === undefined) continue
    perQuestion[questionId] = Math.round((1 - Math.abs(probabilityA - probabilityB)) * 1e6) / 1e6
  }
  const values = Object.values(perQuestion)
  return {
    perQuestion,
    overall: values.length === 0 ? 0 : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1e6) / 1e6,
  }
}

/** Audit labels using measured CTR. Unknown outcomes are excluded and counted in notes. */
export function labelAudit(entries: CalibrationEntry[], rule: LabelAuditRule): LabelAuditResult {
  const violations: string[] = []
  const notes: string[] = []
  if (!Number.isFinite(rule.minimumCtr) || rule.minimumCtr < 0) {
    violations.push('minimumCtr must be a finite number >= 0.')
  }
  if (!Number.isInteger(rule.minimumCohortSize) || rule.minimumCohortSize < 1) {
    violations.push('minimumCohortSize must be an integer >= 1.')
  }

  const usable = entries.filter((entry) => typeof entry?.metrics?.ctr === 'number' && Number.isFinite(entry.metrics.ctr))
  const excluded = entries.length - usable.length
  if (excluded > 0) notes.push(`Excluded ${excluded} entries with unknown CTR metrics.`)

  const cohort = usable.filter((entry) => (entry.metrics?.ctr as number) >= rule.minimumCtr)
  const belowThreshold = usable.length - cohort.length
  if (belowThreshold > 0) notes.push(`Excluded ${belowThreshold} entries below the CTR threshold of ${rule.minimumCtr}%.`)
  if (cohort.length < rule.minimumCohortSize) {
    violations.push(`Cohort has ${cohort.length} measured entries; minimum is ${rule.minimumCohortSize}.`)
  }

  return { violations, cohortSize: cohort.length, notes }
}
