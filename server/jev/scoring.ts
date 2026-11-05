import type {
  Fact,
  JevDimension,
  JevDimensionEvaluation,
  JevRubric,
  JevScore,
} from "../../types/jev";

/** Invalid rubric definition - weights, ids or minimum scorable count. */
export class JevRubricError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JevRubricError";
  }
}

/** Invalid model judgement - score range, unknown dimension or duplicate evaluation. */
export class JevScoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JevScoreError";
  }
}

const WEIGHT_TOLERANCE = 1e-6;
const MIN_SCORE = 0;
const MAX_SCORE = 100;

/**
 * The Lava Bean rubric. Dimension ids, weights and the scorable minimum are mirrored in
 * `docs/jev/scoring-rubric.md`; the test suite fails when the two drift apart.
 */
export const LAVABEAN_JEV_RUBRIC: JevRubric = {
  id: "lavabean-jev",
  version: "1.0.0",
  dimensions: [
    {
      id: "brand_authenticity",
      weight: 0.25,
      description: "Does the creative show something the facts actually evidence?",
    },
    {
      id: "product_clarity",
      weight: 0.2,
      description: "Can a viewer name the product and its defining property from the facts?",
    },
    {
      id: "originality",
      weight: 0.2,
      description: "Is the treatment distinct from stock or prototype imagery?",
    },
    {
      id: "brand_fit",
      weight: 0.2,
      description: "Does the creative match the Lava Bean brand rules?",
    },
    {
      id: "emotional_pull",
      weight: 0.15,
      description: "Does the creative earn attention without inventing claims?",
    },
  ],
  minScorableDimensions: 3,
};

/**
 * Scores a creative with a weighted rubric, strictly on extracted facts.
 *
 * A dimension is scorable only when it cites at least one fact that exists in the bundle.
 * Unsupported dimensions are reported with `insufficient_evidence` and are never averaged
 * into the overall score. The overall score stays null until the rubric's minimum number
 * of dimensions is scorable.
 */
export function scoreJev(
  facts: readonly Fact[],
  rubric: JevRubric,
  evaluations: readonly JevDimensionEvaluation[] = [],
): JevScore {
  validateRubric(rubric);

  const factsById = new Map(facts.map((fact) => [fact.id, fact]));
  const byDimension = new Map<string, JevDimensionEvaluation>();

  for (const evaluation of evaluations) {
    if (!rubric.dimensions.some((dimension) => dimension.id === evaluation.dimensionId)) {
      throw new JevScoreError(`Unknown dimension "${evaluation.dimensionId}" for rubric "${rubric.id}".`);
    }
    if (byDimension.has(evaluation.dimensionId)) {
      throw new JevScoreError(`Duplicate evaluation for dimension "${evaluation.dimensionId}".`);
    }
    if (!Number.isFinite(evaluation.score) || evaluation.score < MIN_SCORE || evaluation.score > MAX_SCORE) {
      throw new JevScoreError(
        `Score for dimension "${evaluation.dimensionId}" must be a number between ${MIN_SCORE} and ${MAX_SCORE}.`,
      );
    }
    byDimension.set(evaluation.dimensionId, evaluation);
  }

  const dimensions: JevDimension[] = [];
  const insufficientReasons: string[] = [];

  for (const spec of rubric.dimensions) {
    const evaluation = byDimension.get(spec.id);
    const citedFactIds = evaluation?.factIds ?? [];
    const supportedFactIds = citedFactIds.filter((factId) => factsById.has(factId));

    if (!evaluation || supportedFactIds.length === 0) {
      const detail = evaluation
        ? "insufficient_evidence: no cited fact exists in the bundle"
        : "insufficient_evidence: no judgement was supplied";
      dimensions.push({
        id: spec.id,
        weight: spec.weight,
        score: null,
        factIds: [],
        rationale: detail,
      });
      insufficientReasons.push(`${spec.id}: insufficient_evidence`);
      continue;
    }

    dimensions.push({
      id: spec.id,
      weight: spec.weight,
      score: evaluation.score,
      factIds: supportedFactIds,
      rationale: evaluation.rationale,
    });
  }

  const scorable = dimensions.filter((dimension) => dimension.score !== null);
  const scorableWeight = scorable.reduce((sum, dimension) => sum + dimension.weight, 0);
  const weighted = scorable.reduce((sum, dimension) => sum + dimension.score! * dimension.weight, 0);

  const overall =
    scorable.length >= rubric.minScorableDimensions && scorableWeight > 0
      ? weighted / scorableWeight
      : null;

  return {
    rubricId: rubric.id,
    rubricVersion: rubric.version,
    dimensions,
    overall,
    insufficientReasons,
  };
}

function validateRubric(rubric: JevRubric): void {
  if (!rubric || !Array.isArray(rubric.dimensions) || rubric.dimensions.length === 0) {
    throw new JevRubricError(`Rubric "${rubric?.id ?? "unknown"}" must define at least one dimension.`);
  }

  const seen = new Set<string>();
  let totalWeight = 0;

  for (const dimension of rubric.dimensions) {
    if (typeof dimension.id !== "string" || dimension.id.trim().length === 0) {
      throw new JevRubricError("Every rubric dimension needs a non-empty id.");
    }
    if (seen.has(dimension.id)) {
      throw new JevRubricError(`Duplicate dimension id "${dimension.id}".`);
    }
    seen.add(dimension.id);

    if (!Number.isFinite(dimension.weight) || dimension.weight <= 0 || dimension.weight > 1) {
      throw new JevRubricError(`Weight for "${dimension.id}" must be > 0 and <= 1.`);
    }
    totalWeight += dimension.weight;
  }

  if (Math.abs(totalWeight - 1) > WEIGHT_TOLERANCE) {
    throw new JevRubricError(`Rubric weights must sum to 1.0; received ${totalWeight}.`);
  }

  if (
    !Number.isInteger(rubric.minScorableDimensions) ||
    rubric.minScorableDimensions < 1 ||
    rubric.minScorableDimensions > rubric.dimensions.length
  ) {
    throw new JevRubricError(
      `minScorableDimensions must be an integer between 1 and ${rubric.dimensions.length}.`,
    );
  }
}
