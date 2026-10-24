import { describe, expect, it } from 'vitest'
import { assertComparableCohort, SoundStratificationError, stratifiedBaseline } from '../../server/jev/stratify'
const entry = (id: string, trend: 'rising'|'stale', key?: string, platform: 'tiktok'|'youtube'='tiktok', format='short') => ({ id, platform, format, sound: [{platform,soundId:id,usageCount:10,harvestedAt:'2026-01-01',source:'fixture'}, {platform,soundId:id,usageCount: trend==='rising'?20:5,harvestedAt:'2026-01-08',source:'fixture'}], stratificationKey: key, value: Number(id) })
describe('sound cohort stratification', () => {
 it('rejects mixed rising and stale cohorts unless explicitly keyed', () => {
  expect(() => assertComparableCohort([entry('1','rising'),entry('2','stale')])).toThrow(SoundStratificationError)
  expect(() => assertComparableCohort([entry('1','rising','by-trend'),entry('2','stale','by-trend')])).not.toThrow()
  expect(() => assertComparableCohort([entry('1','rising',undefined,'tiktok'),entry('2','rising',undefined,'youtube')])).toThrow(SoundStratificationError)
  expect(() => assertComparableCohort([entry('1','rising',undefined,'tiktok'),entry('2','rising',undefined,'tiktok','story')])).toThrow(SoundStratificationError)
 })
 it('builds one baseline per trend', () => {
  expect(stratifiedBaseline([entry('1','rising'),entry('2','stale')])).toEqual({ 'tiktok:short:rising': {n:1,mean:1}, 'tiktok:short:stale':{n:1,mean:2} })
 })
})
