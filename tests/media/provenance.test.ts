import { describe, expect, it } from 'vitest'
import { assertProvenance } from '../../server/media/provenance'
import { MediaProvenanceError } from '../../server/media/errors'
import type { MediaAsset, MediaRequest, Provenance } from '../../types/media'

function asset(overrides: Partial<Provenance> = {}): MediaAsset {
  return {
    ref: { id: 'asset-1', kind: 'image', locator: 'sha256:abc', mimeType: 'image/png' },
    provenance: {
      providerId: 'fake-image',
      modelId: 'fake-model-v1',
      generatedAt: '2026-10-24T00:00:00.000Z',
      costCents: 0,
      consent: null,
      sourceAssetRefs: [],
      promptHash: 'sha256:prompt',
      ...overrides
    }
  }
}

function request(overrides: Partial<MediaRequest> = {}): MediaRequest {
  return { kind: 'image', prompt: 'a mug', maxCostCents: 0, depictsPersonOrBrand: false, ...overrides }
}

function consent(basis: 'owner' | 'licensed' | 'written' | 'none') {
  return { subject: 'Lava Bean', basis, reference: 'release-1', recordedAt: '2026-10-24T00:00:00.000Z' }
}

describe('assertProvenance', () => {
  it('accepts an asset with complete provenance', () => {
    expect(() => assertProvenance(asset(), request())).not.toThrow()
  })

  it.each([
    ['providerId', { providerId: '' }],
    ['providerId blank', { providerId: '   ' }],
    ['modelId', { modelId: '' }],
    ['generatedAt', { generatedAt: '' }],
    ['promptHash', { promptHash: '' }]
  ] satisfies Array<[string, Partial<Provenance>]>)('rejects a missing %s', (_label, overrides) => {
    expect(() => assertProvenance(asset(overrides), request())).toThrow(MediaProvenanceError)
  })

  it('rejects a person or brand depiction without a consent record', () => {
    expect(() => assertProvenance(asset({ consent: null }), request({ depictsPersonOrBrand: true }))).toThrow(MediaProvenanceError)
  })

  it('rejects a person or brand depiction when consent basis is none', () => {
    expect(() => assertProvenance(asset({ consent: consent('none') }), request({ depictsPersonOrBrand: true }))).toThrow(MediaProvenanceError)
  })

  it('accepts a person or brand depiction with recorded consent', () => {
    expect(() => assertProvenance(asset({ consent: consent('written') }), request({ depictsPersonOrBrand: true }))).not.toThrow()
  })

  it('allows null consent when no person or brand is depicted', () => {
    expect(() => assertProvenance(asset({ consent: null }), request())).not.toThrow()
  })
})
