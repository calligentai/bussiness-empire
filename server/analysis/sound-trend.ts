export interface SoundSnapshot {
  platform: 'tiktok' | 'youtube'
  soundId: string
  usageCount: number
  harvestedAt: string
  source: string
}
export interface UsageDelta { delta: number | null; windowDays: number | null }
export type SoundTrend = 'rising' | 'flat' | 'stale' | 'unknown'
/** Immutable append operation used for each platform-local harvest. */
export function appendSnapshot(store: SoundSnapshot[], snapshot: SoundSnapshot): SoundSnapshot[] {
  return [...store, { ...snapshot }]
}
const ordered = (snapshots: SoundSnapshot[]): SoundSnapshot[] => [...snapshots].filter((row) => Number.isFinite(row.usageCount) && Number.isFinite(Date.parse(row.harvestedAt))).sort((a,b) => Date.parse(a.harvestedAt)-Date.parse(b.harvestedAt))
export function usageDelta(snapshots: SoundSnapshot[]): UsageDelta {
  const rows = ordered(snapshots)
  if (rows.length > 0 && (rows.some((row) => row.platform !== rows[0].platform || row.soundId !== rows[0].soundId))) return { delta: null, windowDays: null }
  if (rows.length < 2) return { delta: null, windowDays: null }
  const first = rows[0], last = rows[rows.length - 1]
  const windowDays = (Date.parse(last.harvestedAt)-Date.parse(first.harvestedAt))/86_400_000
  if (windowDays < 5) return { delta: null, windowDays }
  return { delta: last.usageCount-first.usageCount, windowDays }
}
/** Ordinal description only. Unofficial scrape counts do not predict a rate. */
export function classifyTrend(snapshots: SoundSnapshot[]): SoundTrend {
  const rows = ordered(snapshots)
  const result = usageDelta(rows)
  if (result.delta === null || result.windowDays === null) return 'unknown'
  if (result.delta > 0) return 'rising'
  if (result.delta === 0) return 'flat'
  return 'stale'
}
