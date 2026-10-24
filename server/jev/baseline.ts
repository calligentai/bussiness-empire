import type {
  BaselineEntry,
  BaselineOptions,
  DiagnoseResult,
  DimensionDistribution,
  EvidenceSpan,
  Fact,
  JevBaseline,
  JevIssue,
  JevScore,
  JevVersions,
  QuestionAnswer,
  QuestionDiagnosis,
  QuestionPrevalence,
  DimDelta,
  PercentileBaseline,
  PercentileDistribution,
  PercentileLibraryEntry,
} from '../../types/jev'
import { JEV_QUESTIONS, JEV_QUESTION_SET_VERSION, getJevQuestion } from './questions'

/**
 * A baseline is only comparable to scores produced by the same extractor prompt,
 * rubric and question set. Mixing them silently resets the priors, so it throws
 * instead, in the same style as `JevRubricError`.
 */
export class JevBaselineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JevBaselineError'
  }
}

/** Raised when a library cannot support a comparable percentile calculation. */
export class BaselineVersionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BaselineVersionError'
  }
}

const LIBRARY_VERSION_KEYS = ['extractorVersion', 'rubricVersion', 'questionSetVersion'] as const

/** Build per-dimension distributions from the supplied labelled library. */
export function buildBaseline(entries: PercentileLibraryEntry[]): PercentileBaseline
export function buildBaseline(entries: BaselineEntry[], options?: BaselineOptions): JevBaseline
export function buildBaseline(entries: Array<PercentileLibraryEntry | BaselineEntry>, options?: BaselineOptions): PercentileBaseline | JevBaseline {
  if (entries.length > 0 && 'assetRefId' in entries[0]) {
    const library = entries as PercentileLibraryEntry[]
    if (library.length === 0) throw new BaselineVersionError('A baseline needs at least one library entry')
    const reference = library[0]
    for (const entry of library) {
      for (const key of LIBRARY_VERSION_KEYS) {
        if (entry[key] !== reference[key]) throw new BaselineVersionError(`Mixed ${key} in labelled library`)
      }
    }
    const ids = new Set(library.flatMap((entry) => entry.score.dimensions.map((dimension) => dimension.id)))
    const result: PercentileBaseline = {}
    for (const id of ids) {
      const values = library.flatMap((entry) => entry.score.dimensions
        .filter((dimension) => dimension.id === id && typeof dimension.score === 'number' && Number.isFinite(dimension.score))
        .map((dimension) => dimension.score as number))
      if (!values.length) continue
      const sorted = [...values].sort((a, b) => a - b)
      result[id] = { n: sorted.length, p25: quantile(sorted, 0.25), median: quantile(sorted, 0.5), p75: quantile(sorted, 0.75), mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length }
    }
    return result
  }
  return buildLegacyBaseline(entries as BaselineEntry[], options)
}

/** Default question prevalence threshold; each frozen question stores the value too. */
export const VIRAL_PREVALENCE_THRESHOLD = 0.7
/** ... and the asset is at or below this probability. */
export const ASSET_PROBABILITY_THRESHOLD = 0.4

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))
const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

const VERSION_KEYS = ['extractorVersion', 'rubricVersion', 'questionSetVersion'] as const

function readVersions(entry: BaselineEntry): JevVersions {
  if (!entry || typeof entry !== 'object') {
    throw new JevBaselineError('Every baseline entry must be an object')
  }
  for (const key of VERSION_KEYS) {
    const value = entry[key]
    if (typeof value !== 'string' || value.trim() === '') {
      throw new JevBaselineError(`Entry ${entry.id || '(no id)'} is missing a non-empty ${key}`)
    }
  }
  return {
    extractorVersion: entry.extractorVersion,
    rubricVersion: entry.rubricVersion,
    questionSetVersion: entry.questionSetVersion,
  }
}

/** Linear-interpolation quantile over an already sorted sample. */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0]
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

function distributionOf(values: number[]): DimensionDistribution {
  const sorted = [...values].sort((a, b) => a - b)
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length
  return {
    n: sorted.length,
    min: sorted[0],
    p25: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
    mean,
  }
}

function scoreValuesFor(entry: BaselineEntry, dimensionId: string): number[] {
  const dimensions = Array.isArray(entry.score?.dimensions) ? entry.score.dimensions : []
  const values: number[] = []
  for (const dimension of dimensions) {
    if (!dimension || dimension.id !== dimensionId) continue
    if (typeof dimension.score !== 'number' || !Number.isFinite(dimension.score)) continue
    values.push(clamp(dimension.score, 0, 100))
  }
  return values
}

/**
 * Build a cohort baseline from labelled, version-compatible library entries.
 *
 * - Defaults to the `viral` cohort; `control` and `all` are explicit.
 * - Refuses mixed extractor/rubric/question-set versions.
 * - Refuses a question set that is not the frozen one.
 * - With `minimumCtr`, refuses entries below the threshold or without a CTR.
 * - Null dimension scores are excluded from that dimension's distribution; they
 *   are never treated as zero.
 */
function buildLegacyBaseline(entries: BaselineEntry[], options: BaselineOptions = {}): JevBaseline {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new JevBaselineError('A baseline needs at least one labelled entry')
  }

  const versions = readVersions(entries[0])
  for (const entry of entries) {
    const entryVersions = readVersions(entry)
    for (const key of VERSION_KEYS) {
      if (entryVersions[key] !== versions[key]) {
        throw new JevBaselineError(
          `Mixed ${key}: entry ${entry.id} has ${entryVersions[key]}, expected ${versions[key]}.`,
        )
      }
    }
  }

  if (versions.questionSetVersion !== JEV_QUESTION_SET_VERSION) {
    throw new JevBaselineError(
      `Question set ${versions.questionSetVersion} is not the frozen set ${JEV_QUESTION_SET_VERSION}.`,
    )
  }

  const minimumCtr = options.minimumCtr
  if (minimumCtr !== undefined && (!Number.isFinite(minimumCtr) || minimumCtr < 0)) {
    throw new JevBaselineError('minimumCtr must be a finite number >= 0')
  }

  const cohort = options.cohort ?? 'viral'
  if (cohort !== 'viral' && cohort !== 'control' && cohort !== 'all') {
    throw new JevBaselineError(`Unknown cohort: ${String(cohort)}`)
  }

  const selected = cohort === 'all' ? entries : entries.filter((entry) => entry.outcome?.cohort === cohort)
  if (selected.length === 0) {
    throw new JevBaselineError(`No ${cohort} entries in the baseline`)
  }

  if (minimumCtr !== undefined) {
    for (const entry of selected) {
      const ctr = entry.outcome?.ctr
      if (typeof ctr !== 'number' || !Number.isFinite(ctr)) {
        throw new JevBaselineError(`Entry ${entry.id} has no CTR, so the >= ${minimumCtr}% label gate cannot pass.`)
      }
      if (ctr < minimumCtr) {
        throw new JevBaselineError(`Entry ${entry.id} has CTR ${ctr}%, below the ${minimumCtr}% label gate.`)
      }
    }
  }

  const dimensionIds = new Set<string>()
  for (const entry of selected) {
    for (const dimension of entry.score?.dimensions ?? []) {
      if (dimension && typeof dimension.id === 'string') dimensionIds.add(dimension.id)
    }
  }

  const dimensions: Record<string, DimensionDistribution> = {}
  for (const dimensionId of dimensionIds) {
    const values = selected.flatMap((entry) => scoreValuesFor(entry, dimensionId))
    if (values.length > 0) dimensions[dimensionId] = distributionOf(values)
  }

  const questionPrevalence: Record<string, QuestionPrevalence> = {}
  for (const question of JEV_QUESTIONS) {
    const probabilities: number[] = []
    for (const entry of selected) {
      for (const answer of entry.answers ?? []) {
        if (!answer || answer.questionId !== question.id) continue
        if (typeof answer.probability !== 'number' || !Number.isFinite(answer.probability)) continue
        probabilities.push(clamp(answer.probability, 0, 1))
      }
    }
    if (probabilities.length > 0) {
      questionPrevalence[question.id] = {
        n: probabilities.length,
        prevalence: probabilities.reduce((sum, value) => sum + value, 0) / probabilities.length,
      }
    }
  }

  return {
    versions,
    cohort,
    entryCount: selected.length,
    dimensions,
    questionPrevalence,
  }
}

/**
 * Estimate where a value sits in a distribution using the stored quartiles as
 * anchors and linear interpolation between them. This is a summary estimate, not
 * an exact empirical percentile: the raw sample is deliberately not kept.
 */
export function percentileOf(value: number, distribution: DimensionDistribution): number | null
export function percentileOf(score: JevScore, baseline: PercentileBaseline): Record<string, number | null>
export function percentileOf(valueOrScore: number | JevScore, distributionOrBaseline: DimensionDistribution | PercentileBaseline): number | null | Record<string, number | null> {
  if (typeof valueOrScore === 'object' && valueOrScore !== null) {
    const result: Record<string, number | null> = {}
    for (const dimension of valueOrScore.dimensions) {
      if (dimension.score === null) { result[dimension.id] = null; continue }
      const baseline = (distributionOrBaseline as PercentileBaseline)[dimension.id]
      if (!baseline) { result[dimension.id] = null; continue }
      if (baseline.n < 5) throw new BaselineVersionError(`Dimension ${dimension.id} has n=${baseline.n}; at least 5 observations are required for percentiles`)
      result[dimension.id] = empiricalPercentile(dimension.score, baseline)
    }
    return result
  }
  return empiricalPercentile(valueOrScore, distributionOrBaseline as DimensionDistribution)
}

/** Rank absolute dimension gaps from the 50th percentile, skipping unscorable dimensions. */
export function diagnoseDelta(score: JevScore, baseline: PercentileBaseline): DimDelta[] {
  const percentiles = percentileOf(score, baseline) as Record<string, number | null>
  return Object.entries(percentiles)
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .map(([dimension, percentile]) => ({ dimension, percentile, gap: Math.abs(percentile - 50) }))
    .sort((a, b) => b.gap - a.gap || a.dimension.localeCompare(b.dimension))
}

function empiricalPercentile(value: number, distribution: DimensionDistribution | PercentileDistribution): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null

  if (!('min' in distribution)) {
    if (distribution.n < 5) throw new BaselineVersionError(`At least 5 observations are required for percentiles; got ${distribution.n}`)
    // Quartiles alone cannot recover the sample CDF. This approximation uses the
    // interpolated quartile anchors and reports their empirical rank estimates.
    const { p25, median, p75 } = distribution
    if (value <= p25) return value === p25 ? 25 : 0
    if (value <= median) return Math.round(25 + 25 * (value - p25) / (median - p25 || 1))
    if (value <= p75) return Math.round(50 + 25 * (value - median) / (p75 - median || 1))
    return 100
  }

  const { min, p25, median, p75, max } = distribution
  if (max === min) return 50

  const anchors: Array<[number, number]> = [
    [min, 0],
    [p25, 25],
    [median, 50],
    [p75, 75],
    [max, 100],
  ]

  if (value <= min) return 0
  if (value >= max) return 100

  for (let index = 1; index < anchors.length; index += 1) {
    const [highValue, highPercentile] = anchors[index]
    const [lowValue, lowPercentile] = anchors[index - 1]
    if (value > highValue) continue
    if (highValue === lowValue) return highPercentile
    const ratio = (value - lowValue) / (highValue - lowValue)
    return Math.round(lowPercentile + ratio * (highPercentile - lowPercentile))
  }

  return 100
}

function usableSpan(span: EvidenceSpan | undefined): span is EvidenceSpan {
  if (!span || typeof span !== 'object') return false
  if (typeof span.assetRefId !== 'string' || span.assetRefId.trim() === '') return false
  const hasTimestamp = typeof span.timestampSeconds === 'number' && Number.isFinite(span.timestampSeconds) && span.timestampSeconds >= 0
  const hasShot = typeof span.shotId === 'string' && span.shotId.trim() !== ''
  return hasTimestamp || hasShot
}

/**
 * Turn a score plus a cohort baseline into ranked, evidence-backed issues.
 *
 * An issue is a frozen question where the viral cohort satisfies it at least
 * `VIRAL_PREVALENCE_THRESHOLD` of the time and this asset at most
 * `ASSET_PROBABILITY_THRESHOLD`. Issues are ordered by `gap × prevalence`, then
 * by question id so a fixed fixture always produces the same order.
 *
 * A question is never guessed into an issue: without a scorable bound dimension,
 * a recorded answer, a resolvable evidence span, or cohort prevalence it is
 * reported as `insufficient_evidence` and left out of the ranking.
 */
export function diagnose(
  score: JevScore,
  baseline: JevBaseline,
  answers: QuestionAnswer[],
  facts?: Fact[],
): DiagnoseResult {
  if (baseline.versions.questionSetVersion !== JEV_QUESTION_SET_VERSION) {
    throw new JevBaselineError(
      `Baseline question set ${baseline.versions.questionSetVersion} is not the frozen set ${JEV_QUESTION_SET_VERSION}.`,
    )
  }

  const dimensions = Array.isArray(score?.dimensions) ? score.dimensions : []
  const answerById = new Map<string, QuestionAnswer>()
  for (const answer of Array.isArray(answers) ? answers : []) {
    if (answer && typeof answer.questionId === 'string' && !answerById.has(answer.questionId)) {
      answerById.set(answer.questionId, answer)
    }
  }

  const factById = new Map<string, Fact>()
  for (const fact of Array.isArray(facts) ? facts : []) {
    if (fact && typeof fact.id === 'string') factById.set(fact.id, fact)
  }

  const issues: JevIssue[] = []
  const questions: QuestionDiagnosis[] = []

  for (const question of JEV_QUESTIONS) {
    const base = {
      questionId: question.id,
      dimensionId: question.dimensionId,
      prompt: question.prompt,
    }

    const dimension = dimensions.find((candidate) => candidate && candidate.id === question.dimensionId)
    if (!dimension || typeof dimension.score !== 'number' || !Number.isFinite(dimension.score)) {
      questions.push({
        ...base,
        status: 'insufficient_evidence',
        cohortPrevalence: null,
        assetProbability: null,
        gap: null,
        priority: null,
        evidence: null,
        factIds: [],
        message: `Dimension ${question.dimensionId} is not scorable, so this question is not diagnosed.`,
      })
      continue
    }

    const answer = answerById.get(question.id)
    if (!answer) {
      questions.push({
        ...base,
        status: 'insufficient_evidence',
        cohortPrevalence: baseline.questionPrevalence[question.id]?.prevalence ?? null,
        assetProbability: null,
        gap: null,
        priority: null,
        evidence: null,
        factIds: [],
        message: 'No answer was recorded for this question.',
      })
      continue
    }

    const probability =
      typeof answer.probability === 'number' && Number.isFinite(answer.probability)
        ? clamp(answer.probability, 0, 1)
        : null
    if (probability === null) {
      questions.push({
        ...base,
        status: 'insufficient_evidence',
        cohortPrevalence: baseline.questionPrevalence[question.id]?.prevalence ?? null,
        assetProbability: null,
        gap: null,
        priority: null,
        evidence: null,
        factIds: [],
        message: 'The answer carries no usable probability.',
      })
      continue
    }

    const factIds = Array.isArray(answer.factIds)
      ? [...new Set(answer.factIds.filter((id): id is string => typeof id === 'string' && id.trim() !== ''))]
      : []

    if (factById.size > 0) {
      const dangling = factIds.filter((id) => !factById.has(id))
      if (dangling.length > 0) {
        questions.push({
          ...base,
          status: 'insufficient_evidence',
          cohortPrevalence: baseline.questionPrevalence[question.id]?.prevalence ?? null,
          assetProbability: probability,
          gap: null,
          priority: null,
          evidence: null,
          factIds,
          message: `Answer cites unknown fact id(s): ${dangling.join(', ')}.`,
        })
        continue
      }
    }

    let evidence: EvidenceSpan | null = usableSpan(answer.evidence) ? answer.evidence : null
    if (!evidence) {
      for (const factId of factIds) {
        const fact = factById.get(factId)
        if (fact && usableSpan(fact.evidence)) {
          evidence = fact.evidence
          break
        }
      }
    }
    if (!evidence) {
      questions.push({
        ...base,
        status: 'insufficient_evidence',
        cohortPrevalence: baseline.questionPrevalence[question.id]?.prevalence ?? null,
        assetProbability: probability,
        gap: null,
        priority: null,
        evidence: null,
        factIds,
        message: 'The answer resolves to no evidence span, so it is not treated as a negative.',
      })
      continue
    }

    const prevalence = baseline.questionPrevalence[question.id]
    if (!prevalence || prevalence.n <= 0 || !Number.isFinite(prevalence.prevalence)) {
      questions.push({
        ...base,
        status: 'insufficient_evidence',
        cohortPrevalence: null,
        assetProbability: probability,
        gap: null,
        priority: null,
        evidence,
        factIds,
        message: 'The cohort has no answered samples for this question.',
      })
      continue
    }

    const cohortPrevalence = clamp(prevalence.prevalence, 0, 1)
    const gap = roundTo(cohortPrevalence - probability, 6)
    const isIssue = cohortPrevalence >= question.prevalenceThreshold && probability <= ASSET_PROBABILITY_THRESHOLD

    if (isIssue) {
      const priority = roundTo(gap * cohortPrevalence, 6)
      issues.push({
        ...base,
        cohortPrevalence,
        assetProbability: probability,
        gap,
        priority,
        evidence,
        factIds,
      })
      questions.push({
        ...base,
        status: 'issue',
        cohortPrevalence,
        assetProbability: probability,
        gap,
        priority,
        evidence,
        factIds,
        message: `The viral cohort does this ${Math.round(cohortPrevalence * 100)}% of the time; this asset ${Math.round(probability * 100)}%.`,
      })
      continue
    }

    questions.push({
      ...base,
      status: 'ok',
      cohortPrevalence,
      assetProbability: probability,
      gap,
      priority: null,
      evidence,
      factIds,
      message:
        probability > ASSET_PROBABILITY_THRESHOLD
          ? 'The asset is at or above the reporting threshold; no issue raised.'
          : 'The cohort prevalence is below the reporting threshold; no issue raised.',
    })
  }

  issues.sort((a, b) => b.priority - a.priority || a.questionId.localeCompare(b.questionId))

  const percentiles: Record<string, number | null> = {}
  for (const dimension of dimensions) {
    if (!dimension || typeof dimension.id !== 'string') continue
    const distribution = baseline.dimensions[dimension.id]
    if (!distribution || typeof dimension.score !== 'number' || !Number.isFinite(dimension.score)) {
      percentiles[dimension.id] = null
      continue
    }
    percentiles[dimension.id] = percentileOf(dimension.score, distribution)
  }

  return { issues, questions, percentiles }
}

export { getJevQuestion }
