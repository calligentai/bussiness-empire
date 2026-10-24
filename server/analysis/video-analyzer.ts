import type { DroppedObservation, Fact, FactsBundle, FactKind } from "../../types/jev";
import type { AssetRef } from "../../types/media";

/** One shot in the analysed timeline. Seconds, half-open [start, end). */
export interface Shot {
  id: string;
  startSeconds: number;
  endSeconds: number;
}

export interface VideoAnalysisRequest {
  asset: AssetRef;
  shots: Shot[];
  prompts: string[];
}

/** One thing a multimodal model claims to see or hear. Evidence is optional here on purpose. */
export interface RawObservation {
  /** Stable provider or fixture id; becomes `fact-<id>` when present. */
  id?: string;
  modality: FactKind;
  statement: string;
  timestampSeconds?: number;
  shotId?: string;
  /** 0..1 */
  confidence: number;
}

/**
 * Opaque multimodal port. The real provider and the test fixtures both implement it,
 * so nothing in this module (or its tests) reaches the network.
 */
export interface MultimodalTransport {
  describe(input: { asset: AssetRef; shots: Shot[]; prompts: string[] }): Promise<RawObservation[]>;
}

export interface AnalyzeContext {
  transport: MultimodalTransport;
}

/**
 * Turns raw multimodal observations into cited facts.
 *
 * An observation becomes a fact only when it carries a usable evidence span: a
 * timestamp inside the asset, or a shot id from the analysed timeline. Everything
 * else is dropped and reported - statements are never repaired or guessed.
 */
export async function analyzeVideo(request: VideoAnalysisRequest, ctx: AnalyzeContext): Promise<FactsBundle> {
  const { asset, shots, prompts } = request;
  const observations = await ctx.transport.describe({ asset, shots, prompts });

  const facts: Fact[] = [];
  const rejections: DroppedObservation[] = [];

  observations.forEach((observation, index) => {
    const statement = typeof observation.statement === "string" ? observation.statement.trim() : "";
    if (statement.length === 0) {
      rejections.push({ index, reason: "invalid_statement", statement: "" });
      return;
    }

    const evidence = evidenceSpan(observation, asset, shots);
    if (!evidence) {
      rejections.push({ index, reason: "evidence_out_of_bounds", statement });
      return;
    }
    if (evidence === "missing") {
      rejections.push({ index, reason: "missing_evidence", statement });
      return;
    }

    facts.push({
      id: observation.id ? `fact-${observation.id}` : `fact-${index}`,
      kind: observation.modality,
      statement,
      evidence,
      confidence: clamp01(observation.confidence ?? 0),
    });
  });

  return {
    assetRefId: asset.id,
    facts,
    droppedWithoutEvidence: rejections.filter((rejection) => rejection.reason === "missing_evidence").length,
    rejections,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function evidenceSpan(
  observation: RawObservation,
  asset: AssetRef,
  shots: readonly Shot[],
): { assetRefId: string; timestampSeconds?: number; shotId?: string } | "missing" | null {
  const { timestampSeconds, shotId } = observation;
  if (timestampSeconds === undefined && shotId === undefined) return "missing";

  if (timestampSeconds !== undefined) {
    if (!Number.isFinite(timestampSeconds) || timestampSeconds < 0) return null;
    if (asset.durationSeconds !== undefined && timestampSeconds > asset.durationSeconds) return null;
  }

  if (shotId !== undefined) {
    const shot = shots.find((candidate) => candidate.id === shotId);
    if (!shot) return null;
    if (timestampSeconds !== undefined && (timestampSeconds < shot.startSeconds || timestampSeconds >= shot.endSeconds)) {
      return null;
    }
  }

  const evidence: { assetRefId: string; timestampSeconds?: number; shotId?: string } = { assetRefId: asset.id };
  if (timestampSeconds !== undefined) evidence.timestampSeconds = timestampSeconds;
  if (shotId !== undefined) evidence.shotId = shotId;
  return evidence;
}
