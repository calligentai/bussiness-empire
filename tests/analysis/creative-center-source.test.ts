import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { CreativeCenterSource, AdsPermissionError, AdsInputError } from '../../server/analysis/creative-center-source'
import { harvestTopAds } from '../../scripts/harvest-top-ads'

const fixture = JSON.parse(await readFile(new URL('../fixtures/creative-center/list.json', import.meta.url), 'utf8'))

describe('CreativeCenterSource', () => {
  it('maps fixture materials to exact AdRef facts', async () => {
    const source = new CreativeCenterSource({ transport: { request: async () => fixture } })
    await expect(source.list({ period: 7, page: 1, limit: 3, orderBy: 'ctr', countryCode: 'US' })).resolves.toEqual([
      { externalId: 'synthetic-ad-001', title: 'Morning pour', ctr: 12.4, likes: 930, objectiveKey: 'traffic', durationSeconds: 15, coverUrl: 'https://fixture.invalid/cover-001.jpg', countryCode: 'US', periodDays: 7 },
      { externalId: 'synthetic-ad-002', title: 'Bean ritual', ctr: 8.1, likes: 510, objectiveKey: 'conversion', durationSeconds: 21, coverUrl: 'https://fixture.invalid/cover-002.jpg', countryCode: 'US', periodDays: 7 },
      { externalId: 'synthetic-ad-003', title: 'First sip', ctr: 6.7, likes: 280, objectiveKey: 'reach', durationSeconds: 9, coverUrl: 'https://fixture.invalid/cover-003.jpg', countryCode: 'US', periodDays: 7 },
    ])
  })

  it('rejects a material without video_info rather than filling values', async () => {
    const source = new CreativeCenterSource({ transport: { request: async () => ({ data: { materials: [{ id: 'missing' }] } }) } })
    await expect(source.list({ period: 7, page: 1, limit: 1, orderBy: 'ctr', countryCode: 'US' })).rejects.toThrow(AdsInputError)
  })

  it('maps code 40101 to a typed permission error', async () => {
    const source = new CreativeCenterSource({ transport: { request: async () => ({ code: 40101, msg: 'no permission' }) } })
    await expect(source.list({ period: 7, page: 1, limit: 1, orderBy: 'ctr', countryCode: 'US' })).rejects.toThrow(AdsPermissionError)
  })

  it('harvests JSONL through an injected source and refuses missing transport', async () => {
    const source = new CreativeCenterSource({ transport: { request: async () => fixture } })
    const result = await harvestTopAds({ source, now: () => '2026-10-25T00:00:00.000Z' })
    expect(result.split('\n').filter(Boolean)).toHaveLength(3)
    for (const line of result.split('\n').filter(Boolean)) {
      const record = JSON.parse(line)
      expect(record).toHaveProperty('harvestedAt', '2026-10-25T00:00:00.000Z')
      expect(record).toHaveProperty('sourceVersion')
      expect(record).not.toHaveProperty('brand')
      expect(record).not.toHaveProperty('views')
    }
    await expect(harvestTopAds({} as never)).rejects.toThrow(AdsInputError)
  })
})
