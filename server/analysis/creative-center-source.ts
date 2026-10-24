import type { AdQuery, AdRef, AdsSource } from './ads-source'
import { AdsInputError, AdsPermissionError, AdsTransportError } from './errors'

export { AdsInputError, AdsPermissionError, AdsTransportError } from './errors'

/** The browser host owns cookies/session state and performs the request in its page context. */
export interface BrowserSessionTransport {
  request(path: string): Promise<unknown>
}

export interface CreativeCenterSourceContext {
  transport: BrowserSessionTransport
}

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new AdsInputError(`Creative Center material has invalid ${field}`)
  return value
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new AdsInputError(`Creative Center material has invalid ${field}`)
  return value
}

function parseMaterial(input: unknown, query: AdQuery): AdRef {
  const material = record(input)
  const video = record(material?.video_info)
  if (!material || !video) throw new AdsInputError('Creative Center material is missing video_info')
  const ctr = requiredNumber(material.ctr, 'ctr')
  const likes = requiredNumber(material.like, 'like')
  const durationSeconds = requiredNumber(video.duration, 'video_info.duration')
  if (ctr < 0 || likes < 0 || durationSeconds < 0) throw new AdsInputError('Creative Center material has a negative metric')
  return {
    externalId: requiredString(video.vid, 'video_info.vid'),
    title: requiredString(material.ad_title, 'ad_title'),
    ctr,
    likes,
    objectiveKey: requiredString(material.objective_key, 'objective_key'),
    durationSeconds,
    coverUrl: requiredString(video.cover, 'video_info.cover'),
    countryCode: query.countryCode,
    periodDays: query.period,
  }
}

export class CreativeCenterSource implements AdsSource {
  constructor(private readonly context: CreativeCenterSourceContext) {
    if (!context?.transport || typeof context.transport.request !== 'function') {
      throw new AdsInputError('CreativeCenterSource requires an injected browser-session transport')
    }
  }

  async list(query: AdQuery): Promise<AdRef[]> {
    if (!query || !Number.isInteger(query.period) || query.period <= 0 || !Number.isInteger(query.page) || query.page < 1 ||
      !Number.isInteger(query.limit) || query.limit < 1 || !query.orderBy || !query.countryCode) {
      throw new AdsInputError('CreativeCenterSource requires a valid query')
    }
    const params = new URLSearchParams({ period: String(query.period), page: String(query.page), limit: String(query.limit), order_by: query.orderBy, country_code: query.countryCode })
    let payload: unknown
    try {
      payload = await this.context.transport.request(`/creative_radar_api/v1/top_ads/v2/list?${params.toString()}`)
    } catch {
      throw new AdsTransportError()
    }
    const root = record(payload)
    if (root?.code === 40101) throw new AdsPermissionError()
    if (root?.code !== undefined && root.code !== 0) throw new AdsTransportError()
    const data = record(root?.data)
    if (!data || !Array.isArray(data.materials)) throw new AdsInputError('Creative Center response is missing data.materials')
    return data.materials.map((material) => parseMaterial(material, query))
  }
}
