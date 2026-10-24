import { classifyTrend, type SoundSnapshot, type SoundTrend } from '../analysis/sound-trend'

export class SoundStratificationError extends Error {
  constructor(message: string) { super(message); this.name = 'SoundStratificationError' }
}
export interface SoundCohortEntry { id: string; platform: 'tiktok' | 'youtube'; format: string; sound: SoundSnapshot[]; value: number; stratificationKey?: string }
export interface Baseline { n: number; mean: number }
export function assertComparableCohort(entries: SoundCohortEntry[]): void {
  const platforms = new Set(entries.map((entry) => entry.platform))
  if (platforms.size > 1) throw new SoundStratificationError('Cohort mixes platforms; cross-platform sound priors are not comparable')
  const formats = new Set(entries.map((entry) => entry.format))
  if (formats.size > 1 && !entries.every((entry) => Boolean(entry.stratificationKey))) throw new SoundStratificationError('Cohort mixes formats without an explicit stratification key')
  if (entries.some((entry) => entry.sound.some((snapshot) => snapshot.platform !== entry.platform))) throw new SoundStratificationError('Sound snapshots must match their cohort platform')
  const trends = new Set(entries.map((entry) => classifyTrend(entry.sound)))
  // A viral ad on a rising sound gets distribution the script did not earn, so structural priors must be read within comparable trend strata.
  if (trends.has('rising') && trends.has('stale') && !entries.every((entry) => Boolean(entry.stratificationKey))) throw new SoundStratificationError('Viral cohort mixes rising and stale sound trends without an explicit stratification key')
}
export function stratifiedBaseline(entries: SoundCohortEntry[]): Record<SoundTrend, Baseline> {
  const groups = new Map<string, number[]>()
  for (const entry of entries) {
    const trend = classifyTrend(entry.sound)
    const key = `${entry.platform}:${entry.format}:${trend}`
    const values = groups.get(key) ?? []
    values.push(entry.value)
    groups.set(key, values)
  }
  const result: Record<string, Baseline> = {}
  for (const [stratum, values] of groups) result[stratum] = { n: values.length, mean: values.reduce((sum, value) => sum + value, 0) / values.length }
  return result
}
