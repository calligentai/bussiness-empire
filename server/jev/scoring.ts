import type {
  Fact,
  InsufficientEvidenceReason,
  JevDimension,
  JevDimensionSpec,
  JevRubric,
  JevScore,
} from '../../types/jev'

export class JevRubricError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JevRubricError'
  }
}

/**
 * The rubric shipped with R7.3. `docs/jev/scoring-rubric.md` documents it; the two must
 * stay in sync. Weights sum to exactly 1.0 and each dimension needs real evidence.
 */
export const DEFAULT_JEV_RUBRIC: JevRubric = {
  id: 'lava-bean-jev-v1',
  minimumScorableDimensions: 3,
  dimensions: [
    {
      id: 'hook_strength',
      weight: 0.25,
      minimumFacts: 1,
      signals: [
        { kind: 'action', points: 40 },
        { kind: 'on_screen_text', points: 35 },
        { kind: 'shot', points: 25 },
      ],
    },
    {
      id: 'product_clarity',
      weight: 0.25,
      minimumFacts: 1,
      signals: [
        { kind: 'product_attribute', points: 60 },
        { kind: 'subject', points: 40 },
      ],
    },
    {
      id: 'brand_safety',
      weight: 0.15,
      minimumFacts: 1,
      signals: [
        { kind: 'on_screen_text', points: 50 },
        { kind: 'audio', points: 50 },
      ],
    },
    {
      id: 'seo_alignment',
      weight: 0.2,
      minimumFacts: 1,
      signals: [
        { kind: 'seo_title', points: 34 },
        { kind: 'seo_description', points: 33 },
        { kind: 'seo_keyword', points: 33 },
      ],
    },
    {
      id: 'call_to_action',
      weight: 0.15,
      minimumFacts: 1,
      signals: [
        { kind: 'on_screen_text', points: 60 },
        { kind: 'audio', points: 40 },
      ],
    },
  ],
}

const WEIGHT_TOLERANCE = 1e-6

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

const confidenceOf = (fact: Fact): number => {
  if (typeof fact.confidence !== 'number' || !Number.isFinite(fact.confidence)) return 0
  return clamp(fact.confidence, 0, 1)
}

/**
 * A rubric is only usable when its weights sum to 1.0, its ids are unique and every
 * signal can actually contribute a bounded number of points. Anything else throws
 * instead of silently skewing the score.
 */
export function validateRubric(rubric: JevRubric): void {
  if (!rubric || typeof rubric.id !== 'string' || rubric.id.trim() === '') {
    throw new JevRubricError('Rubric id is required')
  }
  if (!Array.isArray(rubric.dimensions) || rubric.dimensions.length === 0) {
    throw new JevRubricError('Rubric must define at least one dimension')
  }

  const ids = new Set<string>()
  for (const dimension of rubric.dimensions as JevDimensionSpec[]) {
    if (!dimension || typeof dimension.id !== 'string' || dimension.id.trim() === '') {
      throw new JevRubricError('Every dimension needs a non-empty id')
    }
    if (ids.has(dimension.id)) throw new JevRubricError(`Duplicate dimension id: ${dimension.id}`)
    ids.add(dimension.id)

    if (typeof dimension.weight !== 'number' || !Number.isFinite(dimension.weight)) {
      throw new JevRubricError(`Dimension ${dimension.id} weight must be a finite number`)
    }
    if (dimension.weight < 0) throw new JevRubricError(`Dimension ${dimension.id} weight cannot be negative`)
    if (!Number.isInteger(dimension.minimumFacts) || dimension.minimumFacts < 1) {
      throw new JevRubricError(`Dimension ${dimension.id} minimumFacts must be an integer >= 1`)
    }
    if (!Array.isArray(dimension.signals) || dimension.signals.length === 0) {
      throw new JevRubricError(`Dimension ${dimension.id} needs at least one signal`)
    }
    for (const signal of dimension.signals) {
      if (!signal || typeof signal.kind !== 'string') {
        throw new JevRubricError(`Dimension ${dimension.id} has a signal without a fact kind`)
      }
      if (typeof signal.points !== 'number' || !Number.isFinite(signal.points) || signal.points < 0 || signal.points > 100) {
        throw new JevRubricError(`Dimension ${dimension.id} signal points must be within 0-100`)
      }
    }
  }

  const totalWeight = rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0)
  if (Math.abs(totalWeight - 1) > WEIGHT_TOLERANCE) {
    throw new JevRubricError(`Rubric dimension weights must sum to 1.0, received ${totalWeight.toFixed(6)}`)
  }

  const minimum = rubric.minimumScorableDimensions
  if (!Number.isInteger(minimum) || minimum < 1) {
    throw new JevRubricError('minimumScorableDimensions must be an integer >= 1')
  }
  if (minimum > rubric.dimensions.length) {
    throw new JevRubricError('minimumScorableDimensions cannot exceed the number of rubric dimensions')
  }
}

const scoreDimension = (spec: JevDimensionSpec, facts: Fact[]): { dimension: JevDimension; reason?: InsufficientEvidenceReason } => {
  const pointsByKind = new Map(spec.signals.map((signal) => [signal.kind, signal.points]))
  const supporting = facts.filter((fact) => fact && pointsByKind.has(fact.kind))
  const used: Fact[] = []
  let raw = 0

  for (const [kind, points] of pointsByKind) {
    const matches = supporting.filter((fact) => fact.kind === kind)
    if (matches.length === 0) continue
    const best = matches.reduce((leader, candidate) =>
      confidenceOf(candidate) > confidenceOf(leader) ? candidate : leader,
    )
    used.push(best)
    raw += points * confidenceOf(best)
  }

  if (supporting.length < spec.minimumFacts) {
    return {
      dimension: {
        id: spec.id,
        weight: spec.weight,
        score: null,
        factIds: [],
        rationale: `Insufficient evidence: ${supporting.length} supporting fact(s), ${spec.minimumFacts} required.`,
      },
      reason: {
        code: 'insufficient_evidence',
        scope: 'dimension',
        dimensionId: spec.id,
        message: `Dimension ${spec.id} needs at least ${spec.minimumFacts} supporting fact(s); found ${supporting.length}.`,
      },
    }
  }

  const score = Math.round(clamp(raw, 0, 100))
  return {
    dimension: {
      id: spec.id,
      weight: spec.weight,
      score,
      factIds: used.map((fact) => fact.id),
      rationale: `Scored ${score} from ${used.length} signal kind(s) backed by facts.`,
    },
  }
}

/**
 * Score extracted facts against a rubric. A dimension with too little evidence scores
 * `null`; the overall score is the weighted mean over the scorable dimensions only, and
 * is itself `null` when fewer than `minimumScorableDimensions` could be scored. A null
 * dimension is never treated as a zero or averaged in.
 */
export function scoreJev(facts: Fact[], rubric: JevRubric): JevScore {
  validateRubric(rubric)
  const input = Array.isArray(facts) ? facts.filter((fact): fact is Fact => Boolean(fact)) : []

  const dimensions: JevDimension[] = []
  const insufficientReasons: InsufficientEvidenceReason[] = []

  for (const spec of rubric.dimensions) {
    const { dimension, reason } = scoreDimension(spec, input)
    dimensions.push(dimension)
    if (reason) insufficientReasons.push(reason)
  }

  const scorable = dimensions.filter((dimension) => dimension.score !== null)
  const scorableWeight = scorable.reduce((sum, dimension) => sum + dimension.weight, 0)
  let overall: number | null = null

  if (scorable.length < rubric.minimumScorableDimensions) {
    insufficientReasons.push({
      code: 'insufficient_evidence',
      scope: 'overall',
      message: `Overall score withheld: ${scorable.length} scorable dimension(s), minimum is ${rubric.minimumScorableDimensions}.`,
    })
  } else if (scorableWeight <= 0) {
    insufficientReasons.push({
      code: 'insufficient_evidence',
      scope: 'overall',
      message: 'Overall score withheld: the scorable dimensions carry no weight.',
    })
  } else {
    const weighted = scorable.reduce((sum, dimension) => sum + dimension.weight * (dimension.score as number), 0)
    overall = Math.round(clamp(weighted / scorableWeight, 0, 100))
  }

  return { dimensions, overall, insufficientReasons }
}
