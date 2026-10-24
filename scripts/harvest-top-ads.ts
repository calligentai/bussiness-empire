import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { AdQuery, AdsSource } from '../server/analysis/ads-source'
import { AdsInputError } from '../server/analysis/errors'

export const TOP_ADS_SOURCE_VERSION = 'tiktok-creative-center-top-ads-v1'
export const TOP_ADS_OUTPUT = 'data/library/tiktok-top-ads.jsonl'

export interface HarvestOptions {
  source: AdsSource
  query?: AdQuery
  now?: () => string
}

/** Returns JSONL to keep harvesting independently testable and network-free. */
export async function harvestTopAds(options: HarvestOptions): Promise<string> {
  if (!options?.source || typeof options.source.list !== 'function') {
    throw new AdsInputError('harvestTopAds requires an injected AdsSource transport')
  }
  const query = options.query ?? { period: 7, page: 1, limit: 100, orderBy: 'ctr', countryCode: 'US' }
  const ads = await options.source.list(query)
  const harvestedAt = (options.now ?? (() => new Date().toISOString()))()
  return ads.map((ad) => JSON.stringify({ ...ad, harvestedAt, sourceVersion: TOP_ADS_SOURCE_VERSION })).join('\n') + (ads.length ? '\n' : '')
}

/** Persist explicitly supplied source results; this module never creates a transport. */
export async function writeTopAds(options: HarvestOptions & { outputPath?: string }): Promise<void> {
  const outputPath = options.outputPath ?? TOP_ADS_OUTPUT
  const jsonl = await harvestTopAds(options)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, jsonl, 'utf8')
}
