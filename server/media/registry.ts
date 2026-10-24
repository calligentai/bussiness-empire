import { MediaBudgetError, MediaProviderNotFoundError } from './errors'
import { assertProvenance } from './provenance'
import type { MediaAsset, MediaKind, MediaProvider, MediaRequest, ProviderContext } from '../../types/media'

/** Provider choice is explicit: the caller names the provider, the registry never substitutes another. */
export interface RegistryContext extends ProviderContext {
  providerId: string
}

export interface MediaRegistry {
  resolve(kind: MediaKind, providerId: string): MediaProvider
  generate(request: MediaRequest, ctx: RegistryContext): Promise<MediaAsset>
}

export function createMediaRegistry(providers: readonly MediaProvider[]): MediaRegistry {
  const byId = new Map(providers.map((provider) => [provider.id, provider]))

  function resolve(kind: MediaKind, providerId: string): MediaProvider {
    const provider = byId.get(providerId)
    if (!provider || !provider.supports(kind)) throw new MediaProviderNotFoundError()
    return provider
  }

  async function generate(request: MediaRequest, ctx: RegistryContext): Promise<MediaAsset> {
    const provider = resolve(request.kind, ctx.providerId)
    const estimate = provider.estimateCostCents(request)
    if (estimate > request.maxCostCents || estimate > ctx.budgetCapCents) throw new MediaBudgetError()

    const asset = await provider.generate(request, ctx)
    assertProvenance(asset, request)
    return asset
  }

  return { resolve, generate }
}
