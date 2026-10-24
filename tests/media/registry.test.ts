import { describe, expect, it, vi } from 'vitest'
import { createMediaRegistry } from '../../server/media/registry'
import { MediaBudgetError, MediaProviderNotFoundError, MediaProvenanceError } from '../../server/media/errors'
import type { MediaAsset, MediaKind, MediaProvider, MediaRequest, ProviderContext } from '../../types/media'

const NOW = '2026-10-24T00:00:00.000Z'

function asset(overrides: Partial<MediaAsset['provenance']> = {}): MediaAsset {
  return {
    ref: { id: 'asset-1', kind: 'image', locator: 'sha256:abc', mimeType: 'image/png' },
    provenance: {
      providerId: 'fake-image',
      modelId: 'fake-model-v1',
      generatedAt: NOW,
      costCents: 0,
      consent: null,
      sourceAssetRefs: [],
      promptHash: 'sha256:prompt',
      ...overrides
    }
  }
}

function provider(id: string, overrides: Partial<MediaProvider> = {}): MediaProvider & { generate: ReturnType<typeof vi.fn> } {
  return {
    id,
    supports: (kind: MediaKind) => kind === 'image',
    estimateCostCents: () => 0,
    generate: vi.fn().mockResolvedValue(asset({ providerId: id })),
    ...overrides
  } as MediaProvider & { generate: ReturnType<typeof vi.fn> }
}

function request(overrides: Partial<MediaRequest> = {}): MediaRequest {
  return { kind: 'image', prompt: 'a mug', maxCostCents: 0, depictsPersonOrBrand: false, ...overrides }
}

function context(overrides: Partial<ProviderContext> = {}): ProviderContext {
  return { budgetCapCents: 1000, transport: { call: vi.fn() }, now: () => NOW, ...overrides }
}

describe('createMediaRegistry', () => {
  it('resolves the explicitly requested provider', () => {
    const registry = createMediaRegistry([provider('fake-image')])
    expect(registry.resolve('image', 'fake-image').id).toBe('fake-image')
  })

  it('throws MediaProviderNotFoundError for an unknown providerId', () => {
    const registry = createMediaRegistry([provider('fake-image')])
    expect(() => registry.resolve('image', 'missing')).toThrow(MediaProviderNotFoundError)
  })

  it('throws MediaProviderNotFoundError for an unsupported kind and never calls generate', async () => {
    const fake = provider('fake-image')
    const registry = createMediaRegistry([fake])
    await expect(registry.generate(request({ kind: 'video' }), { ...context(), providerId: 'fake-image' })).rejects.toThrow(MediaProviderNotFoundError)
    expect(fake.generate).not.toHaveBeenCalled()
  })

  it('does not fall back to another provider that supports the kind', async () => {
    const unavailable = provider('no-video', { supports: () => false })
    const fallback = provider('has-video')
    const registry = createMediaRegistry([unavailable, fallback])
    await expect(registry.generate(request({ kind: 'image' }), { ...context(), providerId: 'no-video' })).rejects.toThrow(MediaProviderNotFoundError)
    expect(unavailable.generate).not.toHaveBeenCalled()
    expect(fallback.generate).not.toHaveBeenCalled()
  })

  it('rejects an over-budget estimate before generate runs', async () => {
    const fake = provider('fake-image', { estimateCostCents: () => 25 })
    const registry = createMediaRegistry([fake])
    await expect(registry.generate(request({ maxCostCents: 10 }), { ...context(), providerId: 'fake-image' })).rejects.toThrow(MediaBudgetError)
    expect(fake.generate).not.toHaveBeenCalled()
  })

  it('rejects an estimate above the company cap before generate runs', async () => {
    const fake = provider('fake-image', { estimateCostCents: () => 25 })
    const registry = createMediaRegistry([fake])
    await expect(registry.generate(request({ maxCostCents: 100 }), { ...context({ budgetCapCents: 10 }), providerId: 'fake-image' })).rejects.toThrow(MediaBudgetError)
    expect(fake.generate).not.toHaveBeenCalled()
  })

  it('allows an estimate exactly at the request ceiling', async () => {
    const fake = provider('fake-image', { estimateCostCents: () => 10 })
    const registry = createMediaRegistry([fake])
    await expect(registry.generate(request({ maxCostCents: 10 }), { ...context(), providerId: 'fake-image' })).resolves.toMatchObject({ provenance: { providerId: 'fake-image' } })
  })

  it('does not let an asset with incomplete provenance escape', async () => {
    const fake = provider('fake-image', { generate: vi.fn().mockResolvedValue(asset({ promptHash: '' })) })
    const registry = createMediaRegistry([fake])
    await expect(registry.generate(request(), { ...context(), providerId: 'fake-image' })).rejects.toThrow(MediaProvenanceError)
  })

  it('does not let a person or brand asset without consent escape', async () => {
    const fake = provider('fake-image', { generate: vi.fn().mockResolvedValue(asset({ consent: null })) })
    const registry = createMediaRegistry([fake])
    await expect(registry.generate(request({ depictsPersonOrBrand: true }), { ...context(), providerId: 'fake-image' })).rejects.toThrow(MediaProvenanceError)
  })

  it('returns the provider asset and passes the injected transport through', async () => {
    const fake = provider('fake-image')
    const registry = createMediaRegistry([fake])
    const ctx = { ...context(), providerId: 'fake-image' }
    await expect(registry.generate(request(), ctx)).resolves.toMatchObject({ ref: { id: 'asset-1' } })
    expect(fake.generate).toHaveBeenCalledWith(request(), ctx)
  })
})
