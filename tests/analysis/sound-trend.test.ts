import { describe, expect, it } from 'vitest'
import { classifyTrend, usageDelta, type SoundSnapshot } from '../../server/analysis/sound-trend'
const snap = (usageCount: number, harvestedAt: string, platform: 'tiktok'|'youtube' = 'tiktok'): SoundSnapshot => ({ platform, soundId: 's', usageCount, harvestedAt, source: 'fixture' })
describe('sound trend snapshots', () => {
 it('withholds delta for one snapshot and a two day window', () => {
  expect(usageDelta([snap(10, '2026-01-01')])).toEqual({ delta: null, windowDays: null })
  expect(usageDelta([snap(10, '2026-01-01'), snap(12, '2026-01-03')])).toEqual({ delta: null, windowDays: 2 })
  expect(classifyTrend([snap(10, '2026-01-01')])).toBe('unknown')
 })
 it('computes a 7 day delta and rising ordinal trend', () => {
  const rows = [snap(100, '2026-01-01'), snap(150, '2026-01-08')]
  expect(usageDelta(rows)).toEqual({ delta: 50, windowDays: 7 })
  expect(classifyTrend(rows)).toBe('rising')
 })
 it('never compares snapshots across platforms', () => {
  expect(usageDelta([snap(5, '2026-01-01'), snap(9, '2026-01-08', 'youtube')])).toEqual({ delta: null, windowDays: null })
  expect(classifyTrend([snap(5, '2026-01-01'), snap(9, '2026-01-08', 'youtube')])).toBe('unknown')
 })
})
