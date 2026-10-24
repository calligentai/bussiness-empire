import type { AssetRef } from '../../types/media'
import type { EvidenceSpan, Fact, FactKind, FactsBundle } from '../../types/jev'
import { AnalysisInputError, AnalysisTransportError } from './errors'

export { AnalysisInputError, AnalysisTransportError } from './errors'

/**
 * One thing the multimodal model claims to have seen or heard in the video.
 * `assetRefId` is optional on purpose: an observation that does not name the asset
 * (or names a different one) has no usable evidence span and is dropped.
 */
export interface RawObservation {
  kind: FactKind
  statement: string
  confidence?: number
  timestampSeconds?: number
  audioSpan?: { startSeconds: number; endSeconds: number }
  shotId?: string
  assetRefId?: string
}

export interface MultimodalAnalysis {
  observations: RawObservation[]
}

/** Opaque multimodal port. Tests and the real adapter inject their own implementation. */
export interface MultimodalTransport {
  analyse(input: { asset: AssetRef; instructions?: string }): Promise<MultimodalAnalysis>
}

export interface VideoAnalysisRequest {
  asset: AssetRef
  /** Optional steer for the analyzer. Never a place for credentials. */
  instructions?: string
}

export interface VideoAnalysisContext {
  transport: MultimodalTransport
  now: () => string
}

export interface VideoAnalysisResult extends FactsBundle {
  analysedAt: string
  /** Observations that had evidence but no usable statement. Counted, never invented. */
  droppedInvalid: number
}

const DEFAULT_CONFIDENCE = 0.5

const confidenceOf = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_CONFIDENCE
  return Math.min(1, Math.max(0, value))
}

/**
 * A usable span is the analysed asset plus a location inside it (a timestamp or a shot).
 * An asset id alone, a negative or NaN timestamp, a blank shot id or a different asset
 * all yield null: the observation is dropped rather than promoted to a fact.
 */
const spanFor = (observation: RawObservation, assetId: string): EvidenceSpan | null => {
  if (!observation || typeof observation.assetRefId !== 'string') return null
  if (observation.assetRefId !== assetId) return null

  const hasTimestamp =
    typeof observation.timestampSeconds === 'number' &&
    Number.isFinite(observation.timestampSeconds) &&
    observation.timestampSeconds >= 0
  const shotId = typeof observation.shotId === 'string' ? observation.shotId.trim() : ''
  const hasShot = shotId.length > 0
  if (!hasTimestamp && !hasShot) return null

  const evidence: EvidenceSpan = { assetRefId: assetId }
    if (observation.kind === 'audio' && observation.audioSpan) {
    const { startSeconds, endSeconds } = observation.audioSpan
    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || startSeconds < 0 || endSeconds <= startSeconds) return null
    evidence.audioSpan = { startSeconds, endSeconds }
  }
  if (hasTimestamp) evidence.timestampSeconds = observation.timestampSeconds
  if (hasShot) evidence.shotId = shotId
  return evidence
}

/**
 * Analyse one video asset into facts. Every emitted fact cites a span on that asset;
 * everything else is dropped and counted. No network call happens here directly —
 * the injected transport owns that.
 */
export async function analyzeVideo(
  request: VideoAnalysisRequest,
  ctx: VideoAnalysisContext,
): Promise<VideoAnalysisResult> {
  if (!request || !request.asset || request.asset.kind !== 'video') {
    throw new AnalysisInputError('analyzeVideo only analyses assets of kind "video"')
  }
  if (!ctx || !ctx.transport || typeof ctx.transport.analyse !== 'function') {
    throw new AnalysisInputError('analyzeVideo requires an injected multimodal transport')
  }

  let analysis: MultimodalAnalysis
  try {
    analysis = await ctx.transport.analyse({ asset: request.asset, instructions: request.instructions })
  } catch {
    // Deliberately swallow the provider detail: it may echo credentials or signed URLs.
    throw new AnalysisTransportError()
  }

  const observations = analysis && Array.isArray(analysis.observations) ? analysis.observations : []
  const facts: Fact[] = []
  let droppedWithoutEvidence = 0
  let droppedInvalid = 0

  for (const observation of observations) {
    if (!observation) {
      droppedInvalid += 1
      continue
    }
    const evidence = spanFor(observation, request.asset.id)
    const statement = typeof observation.statement === 'string' ? observation.statement.trim() : ''
    if (!evidence || (observation.kind === 'audio' && !evidence.audioSpan)) {
      droppedWithoutEvidence += 1
      continue
    }
    if (!statement) {
      droppedInvalid += 1
      continue
    }
    facts.push({
      id: `fact-${facts.length + 1}`,
      kind: observation.kind,
      statement,
      evidence,
      confidence: confidenceOf(observation.confidence),
    })
  }

  return {
    assetRefId: request.asset.id,
    facts,
    droppedWithoutEvidence,
    droppedInvalid,
    analysedAt: typeof ctx.now === 'function' ? ctx.now() : new Date().toISOString(),
  }
}
