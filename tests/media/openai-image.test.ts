import { describe, expect, it, vi } from 'vitest'
import { createOpenAIImageProvider } from '../../server/media/providers/openai-image'
import { MediaBudgetError, MediaDisabledError, MediaProvenanceError } from '../../server/media/errors'
import type { MediaRequest } from '../../types/media'

const request: MediaRequest = { kind: 'image', prompt: 'a cup', maxCostCents: 100, depictsPersonOrBrand: false }

describe('OpenAI image provider', () => {
  it('is unavailable without a key and does not leak it', async () => {
    const provider = createOpenAIImageProvider(() => undefined)
    expect(provider.available()).toBe(false)
    await expect(provider.generate(request, { budgetCapCents: 100, transport: { call: vi.fn() }, now: () => '2026-01-01T00:00:00.000Z' })).rejects.toBeInstanceOf(MediaDisabledError)
  })

  it('uses the verified fixed-shape ceiling and rejects unsupported prompts or sizes', () => {
    const provider = createOpenAIImageProvider(() => 'test-secret')
    expect(provider.estimateCostCents(request)).toBe(1)
    expect(() => provider.estimateCostCents({ ...request, prompt: 'x'.repeat(4097) })).toThrow(/estimation limit/)
    expect(() => provider.estimateCostCents({ ...request, aspectRatio: '16:9' })).toThrow(/fixed 1024x1024/)
  })

  it('hashes the prompt and returns complete provenance using injected transport', async () => {
    const transport = { call: vi.fn().mockResolvedValue({ data: [{ url: 'asset://one' }], usage: { input_tokens: 24, output_tokens: 196 } }) }
    const provider = createOpenAIImageProvider(() => 'test-secret')
    const asset = await provider.generate(request, { budgetCapCents: 100, transport, now: () => '2026-01-01T00:00:00.000Z' })
    expect(asset.provenance).toMatchObject({ providerId: 'openai', modelId: 'gpt-image-2-2026-04-21', generatedAt: '2026-01-01T00:00:00.000Z', costCents: 1, consent: null })
    expect(asset.provenance.promptHash).toMatch(/^[a-f0-9]{64}$/)
    expect(transport.call).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://api.openai.com/v1/images/generations', method: 'POST', body: { model: 'gpt-image-2-2026-04-21', prompt: 'a cup', size: '1024x1024', quality: 'low', n: 1 } }))
  })

  it('does not leak the key when the injected request fails', async () => {
    const secret = 'never-log-this-key'
    const provider = createOpenAIImageProvider(() => secret)
    const transport = { call: vi.fn().mockRejectedValue(new Error(secret)) }
    await expect(provider.generate(request, { budgetCapCents: 100, transport, now: () => 'now' })).rejects.toThrow(new RegExp(`^(?!.*${secret}).*OpenAI image request failed`))
  })

  it('rejects paid generation before making a transport call when budget is disabled', async () => {
    const transport = { call: vi.fn() }
    const provider = createOpenAIImageProvider(() => 'key')
    await expect(provider.generate(request, { budgetCapCents: 0, transport, now: () => 'now' })).rejects.toBeInstanceOf(MediaBudgetError)
    expect(transport.call).not.toHaveBeenCalled()
  })

  it('rejects when the verified estimate exceeds the request ceiling before transport', async () => {
    const transport = { call: vi.fn() }
    const provider = createOpenAIImageProvider(() => 'key')
    await expect(provider.generate({ ...request, maxCostCents: 0 }, { budgetCapCents: 100, transport, now: () => 'now' })).rejects.toBeInstanceOf(MediaBudgetError)
    expect(transport.call).not.toHaveBeenCalled()
  })

  it('does not create person or brand depictions without a consent path', async () => {
    const transport = { call: vi.fn() }
    const provider = createOpenAIImageProvider(() => 'key')
    await expect(provider.generate({ ...request, depictsPersonOrBrand: true }, { budgetCapCents: 100, transport, now: () => 'now' })).rejects.toBeInstanceOf(MediaProvenanceError)
    expect(transport.call).not.toHaveBeenCalled()
  })
})
