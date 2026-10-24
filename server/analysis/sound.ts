import type { AdEligibilityViolation } from '../../types/jev'
import { AnalysisInputError } from './errors'

export interface SoundRef {
  platform: 'tiktok' | 'youtube'
  soundId: string
  title: string
  author: string
  isOriginal: boolean
  licensedLibrary: boolean
  durationSeconds: number
  raw: Record<string, unknown>
}

export interface SoundSource<Input = unknown> {
  readonly platform: SoundRef['platform']
  extract(input: Input): SoundRef
}

/** Run an injected platform source and reject adapters that return another platform. */
export function extractPlatformSound<Input>(source: SoundSource<Input>, input: Input): SoundRef {
  const result = source.extract(input)
  if (result.platform !== source.platform) throw new AnalysisInputError('Sound source returned a different platform than declared')
  return result
}

export class SoundEligibilityViolation extends Error {
  readonly violation: AdEligibilityViolation
  constructor(soundId: string) {
    super(`Sound ${soundId} is not marked as commerce music`)
    this.name = 'SoundEligibilityViolation'
    this.violation = { code: 'commerce_music_ineligible', soundId, message: 'Sound is not marked as commerce music' }
  }
}

/** Extract the verified music object from an already captured TikTok page blob. */
export function extractSoundRef(pageBlob: unknown): SoundRef {
  const root = pageBlob as any
  const music = root?.__UNIVERSAL_DATA_FOR_REHYDRATION__?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct?.music
  if (!music || typeof music !== 'object') throw new AnalysisInputError('TikTok page blob is missing itemStruct.music')
  const required = ['id', 'title', 'authorName']
  if (required.some((key) => typeof music[key] !== 'string' || !music[key])) throw new AnalysisInputError('Sound identity fields are incomplete')
  if (typeof music.original !== 'boolean' || typeof music.isCopyrighted !== 'boolean' || typeof music.is_commerce_music !== 'boolean' || typeof music.duration !== 'number' || !Number.isFinite(music.duration)) {
    throw new AnalysisInputError('Sound metadata fields are incomplete')
  }
  const { id, title, authorName, original, duration, isCopyrighted, is_commerce_music, is_unlimited_music, tt2dsp } = music
  const raw = { id, title, authorName, original, duration, isCopyrighted, is_commerce_music, ...(is_unlimited_music !== undefined ? { is_unlimited_music } : {}), ...(tt2dsp !== undefined ? { tt2dsp } : {}) }
  const result: SoundRef = { platform: 'tiktok', soundId: id, title, author: authorName, isOriginal: original, licensedLibrary: is_commerce_music, durationSeconds: duration, raw }
  if (!result.licensedLibrary) throw new SoundEligibilityViolation(result.soundId)
  return result
}

/** YouTube's track/artists metadata is not a sound entity; an injected source must provide a captured sound-page entity. */
export function extractYouTubeSoundRef(captured: unknown): SoundRef {
  const sound = (captured as { sound?: Record<string, unknown> } | null)?.sound
  if (!sound || typeof sound !== 'object' || typeof sound.id !== 'string' || !sound.id || typeof sound.title !== 'string' || typeof sound.author !== 'string' || typeof sound.isOriginal !== 'boolean' || typeof sound.licensedLibrary !== 'boolean' || typeof sound.durationSeconds !== 'number' || !Number.isFinite(sound.durationSeconds)) {
    throw new AnalysisInputError('Captured YouTube sound entity is missing required identity fields')
  }
  return { platform: 'youtube', soundId: sound.id, title: sound.title, author: sound.author, isOriginal: sound.isOriginal, licensedLibrary: sound.licensedLibrary, durationSeconds: sound.durationSeconds, raw: { ...sound } }
}

export const tiktokSoundSource: SoundSource = { platform: 'tiktok', extract: extractSoundRef }
export const youtubeSoundSource: SoundSource = { platform: 'youtube', extract: extractYouTubeSoundRef }
