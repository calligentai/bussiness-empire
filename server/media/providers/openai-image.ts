import type { MediaAsset, MediaProvider, MediaRequest, ProviderContext, MediaTransport } from '../../../types/media'
import { MediaBudgetError, MediaDisabledError, MediaProvenanceError } from '../errors'

const endpoint = 'https://api.openai.com/v1/images/generations'
const modelId = 'gpt-image-2-2026-04-21'
const size = '1024x1024'
const quality = 'low'
const maxPromptBytes = 4096

// Source: https://developers.openai.com/api/docs/guides/image-generation (embedded
// OpenAI GPT Image token calculator). GPT Image 2, 1024x1024, low: 196 output
// tokens. Its calculator uses 16 tokens per 1M pixels at low quality and computes
// ceil(16² * (2M + 1024²) / 4M) = 196. Only this fixed pair is supported here.
const outputTokenCeiling: Record<string, number> = { [`${size}:${quality}`]: 196 }

// Source: https://developers.openai.com/api/docs/pricing — GPT Image 2 standard
// image output is $15/1M tokens; text input is $2.50/1M tokens. The byte ceiling
// bounds prompt tokens because a UTF-8 byte sequence cannot tokenize into more
// than one token per byte. No image inputs, streaming partials, or extra outputs.
const outputUsdPerMillion = 15
const textInputUsdPerMillion = 2.5
const outputCount = 1
const utf8 = new TextEncoder()

async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', utf8.encode(value))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function estimateCost(request: MediaRequest): number {
  if (request.kind !== 'image') throw new MediaDisabledError('OpenAI image provider only supports image requests')
  if (!request.prompt || utf8.encode(request.prompt).byteLength > maxPromptBytes) {
    throw new MediaBudgetError(`Prompt exceeds the ${maxPromptBytes}-byte estimation limit`)
  }
  if (request.sourceAssetRefs?.length) throw new MediaDisabledError('OpenAI image edits are not enabled by this provider')
  if (request.aspectRatio) throw new MediaDisabledError('Only the fixed 1024x1024 image size is enabled')

  const tokensPerImage = outputTokenCeiling[`${size}:${quality}`]
  if (!tokensPerImage) throw new MediaDisabledError('No verified image cost estimate is configured for this size and quality')
  const promptBytes = utf8.encode(request.prompt).byteLength
  const costUsd = (promptBytes * textInputUsdPerMillion + outputCount * tokensPerImage * outputUsdPerMillion) / 1_000_000
  return Math.ceil(costUsd * 100)
}

export function createOpenAIImageProvider(readKey: () => string | undefined = () => (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.OPENAI_API_KEY): MediaProvider & { available(): boolean } {
  return {
    id: 'openai',
    available: () => Boolean(readKey()),
    supports: kind => kind === 'image',
    estimateCostCents: estimateCost,
    async generate(request: MediaRequest, ctx: ProviderContext): Promise<MediaAsset> {
      const key = readKey()
      if (!key) throw new MediaDisabledError('OpenAI image provider is unavailable because credentials are not configured')
      if (request.depictsPersonOrBrand) throw new MediaProvenanceError('OpenAI image requests depicting a person or brand require a consent-aware provider')
      const costCents = estimateCost(request)
      if (ctx.budgetCapCents <= 0 || request.maxCostCents <= 0 || costCents > ctx.budgetCapCents || costCents > request.maxCostCents) {
        throw new MediaBudgetError()
      }

      let result: { data?: Array<{ url?: string; b64_json?: string }>; usage?: { input_tokens?: number; output_tokens?: number } }
      try {
        const authenticatedTransport = ctx.transport as MediaTransport & {
          call(input: { url: string; method: 'POST'; body?: unknown; headers?: Record<string, string> }): Promise<unknown>
        }
        result = await authenticatedTransport.call({
          url: endpoint,
          method: 'POST',
          headers: { Authorization: `Bearer ${key}` },
          body: { model: modelId, prompt: request.prompt, size, quality, n: outputCount },
        }) as typeof result
      } catch {
        throw new Error('OpenAI image request failed')
      }

      const output = result?.data?.[0]
      if (!output || !result.usage || !Number.isSafeInteger(result.usage.input_tokens) || !Number.isSafeInteger(result.usage.output_tokens)) {
        throw new Error('OpenAI image provider returned incomplete asset or usage data')
      }
      const actualCostCents = Math.ceil((result.usage.input_tokens! * textInputUsdPerMillion + result.usage.output_tokens! * outputUsdPerMillion) / 10_000)
      if (actualCostCents > costCents || actualCostCents > ctx.budgetCapCents || actualCostCents > request.maxCostCents) {
        throw new MediaBudgetError('OpenAI image usage exceeded its approved cost ceiling')
      }
      const locator = output.url ?? `data:image/png;base64,${output.b64_json ?? ''}`
      const [assetId, promptHash] = await Promise.all([sha256(locator), sha256(request.prompt)])
      return {
        ref: { id: assetId, kind: 'image', locator, mimeType: 'image/png' },
        provenance: {
          providerId: 'openai', modelId, generatedAt: ctx.now(), costCents: actualCostCents,
          consent: null, sourceAssetRefs: [], promptHash,
        },
      }
    },
  }
}
