import { describe, expect, it, vi } from 'vitest'
import type { AssetRef } from '../../types/media'
import { analyzeVideo, AnalysisInputError, AnalysisTransportError } from '../../server/analysis/video-analyzer'
import type { MultimodalTransport, RawObservation } from '../../server/analysis/video-analyzer'

const videoAsset: AssetRef = {
  id: 'asset-video-1',
  kind: 'video',
  locator: 'sha256:aaaa',
  mimeType: 'video/mp4',
  width: 1080,
  height: 1920,
  durationSeconds: 15,
}

const observation = (overrides: Partial<RawObservation> = {}): RawObservation => ({
  kind: 'action',
  statement: 'A barista pours milk into a cup',
  confidence: 0.8,
  timestampSeconds: 3.5,
  shotId: 'shot-2',
  assetRefId: videoAsset.id,
  ...overrides,
})

const transportWith = (observations: RawObservation[]): MultimodalTransport & { analyse: ReturnType<typeof vi.fn> } => ({
  analyse: vi.fn().mockResolvedValue({ observations }),
})

const ctxFor = (transport: MultimodalTransport) => ({ transport, now: () => '2026-10-24T00:00:00.000Z' })

describe('analyzeVideo', () => {
  it('turns observations with evidence into cited facts on the analysed asset', async () => {
    const transport = transportWith([observation()])
    const result = await analyzeVideo({ asset: videoAsset }, ctxFor(transport))

    expect(transport.analyse).toHaveBeenCalledWith({ asset: videoAsset, instructions: undefined })
    expect(result.assetRefId).toBe(videoAsset.id)
    expect(result.droppedWithoutEvidence).toBe(0)
    expect(result.facts).toHaveLength(1)
    expect(result.facts[0]).toMatchObject({
      id: 'fact-1',
      kind: 'action',
      statement: 'A barista pours milk into a cup',
      confidence: 0.8,
      evidence: { assetRefId: videoAsset.id, timestampSeconds: 3.5, shotId: 'shot-2' },
    })
  })

  it('drops an observation that has no evidence span and counts it', async () => {
    const transport = transportWith([
      observation(),
      observation({ timestampSeconds: undefined, shotId: undefined }),
      observation({ assetRefId: undefined }),
    ])
    const result = await analyzeVideo({ asset: videoAsset }, ctxFor(transport))

    expect(result.facts).toHaveLength(1)
    expect(result.facts.map((fact) => fact.id)).toEqual(['fact-1'])
    expect(result.droppedWithoutEvidence).toBe(2)
  })

  it('drops evidence that cites a different asset than the one analysed', async () => {
    const transport = transportWith([observation({ assetRefId: 'some-other-asset' })])
    const result = await analyzeVideo({ asset: videoAsset }, ctxFor(transport))

    expect(result.facts).toEqual([])
    expect(result.droppedWithoutEvidence).toBe(1)
  })

  it('keeps a frame-level span with only a shot id and accepts timestamp zero', async () => {
    const transport = transportWith([
      observation({ timestampSeconds: undefined, shotId: 'shot-7' }),
      observation({ timestampSeconds: 0, shotId: undefined }),
    ])
    const result = await analyzeVideo({ asset: videoAsset }, ctxFor(transport))

    expect(result.facts).toHaveLength(2)
    expect(result.facts[0].evidence).toEqual({ assetRefId: videoAsset.id, shotId: 'shot-7' })
    expect(result.facts[1].evidence).toEqual({ assetRefId: videoAsset.id, timestampSeconds: 0 })
  })

  it('requires and preserves a timestamped audio span for audio-derived facts', async () => {
    const result = await analyzeVideo({ asset: videoAsset }, ctxFor(transportWith([
      observation({ kind: 'audio', audioSpan: { startSeconds: 0, endSeconds: 2 } }),
      observation({ kind: 'audio', audioSpan: undefined }),
    ])))
    expect(result.facts[0].evidence.audioSpan).toEqual({ startSeconds: 0, endSeconds: 2 })
    expect(result.facts).toHaveLength(1)
    expect(result.droppedWithoutEvidence).toBe(1)
  })

  it('clamps confidence and defaults it when the observation does not provide one', async () => {
    const transport = transportWith([
      observation({ confidence: 4 }),
      observation({ confidence: -2 }),
      observation({ confidence: undefined }),
    ])
    const result = await analyzeVideo({ asset: videoAsset }, ctxFor(transport))

    expect(result.facts.map((fact) => fact.confidence)).toEqual([1, 0, 0.5])
  })

  it('refuses a non-video asset before calling the transport', async () => {
    const transport = transportWith([observation()])
    const image: AssetRef = { ...videoAsset, id: 'asset-image-1', kind: 'image', durationSeconds: undefined }

    await expect(analyzeVideo({ asset: image }, ctxFor(transport))).rejects.toBeInstanceOf(AnalysisInputError)
    expect(transport.analyse).not.toHaveBeenCalled()
  })

  it('wraps a transport failure without leaking the underlying detail', async () => {
    const secret = 'never-log-this-token'
    const transport: MultimodalTransport = { analyse: vi.fn().mockRejectedValue(new Error(secret)) }

    const failure = analyzeVideo({ asset: videoAsset }, ctxFor(transport))
    await expect(failure).rejects.toBeInstanceOf(AnalysisTransportError)
    await expect(failure).rejects.toThrow(/^(?!.*never-log-this-token).*video analysis transport failed/i)
  })

  it('returns an empty bundle when the transport observed nothing', async () => {
    const result = await analyzeVideo({ asset: videoAsset }, ctxFor(transportWith([])))

    expect(result).toMatchObject({ assetRefId: videoAsset.id, facts: [], droppedWithoutEvidence: 0 })
  })
})
