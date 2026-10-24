import { describe, expect, it } from 'vitest'
import { extractPlatformSound, extractSoundRef, extractYouTubeSoundRef, SoundEligibilityViolation, youtubeSoundSource } from '../../server/analysis/sound'

describe('sound identity', () => {
  const payload = { __UNIVERSAL_DATA_FOR_REHYDRATION__: { __DEFAULT_SCOPE__: { 'webapp.video-detail': { itemInfo: { itemStruct: { music: { id: 's-1', title: 'Song', authorName: 'Artist', original: true, duration: 12, isCopyrighted: false, is_commerce_music: true, is_unlimited_music: false, tt2dsp: 'dsp', extra: 'ignored' } } } } } } }
  it('extracts the verified page blob fields', () => {
    expect(extractSoundRef(payload)).toEqual({ platform: 'tiktok', soundId: 's-1', title: 'Song', author: 'Artist', isOriginal: true, licensedLibrary: true, durationSeconds: 12, raw: { id: 's-1', title: 'Song', authorName: 'Artist', original: true, duration: 12, isCopyrighted: false, is_commerce_music: true, is_unlimited_music: false, tt2dsp: 'dsp' } })
  })
  it('rejects missing music and reports commerce eligibility as a typed violation', () => {
    expect(() => extractSoundRef({})).toThrow()
    expect(() => extractSoundRef({ __UNIVERSAL_DATA_FOR_REHYDRATION__: { __DEFAULT_SCOPE__: { 'webapp.video-detail': { itemInfo: { itemStruct: { music: { id:'s', title:'T', authorName:'A', original:false, duration:2, isCopyrighted:false, is_commerce_music:false } } } } } } })).toThrow(SoundEligibilityViolation)
  })
  it('uses a shared platform-neutral YouTube extractor contract and rejects track metadata without a sound entity', () => {
    expect(() => extractYouTubeSoundRef({ track: 'Song', artists: ['Artist'], album: 'Record' })).toThrow()
    expect(extractPlatformSound(youtubeSoundSource, { sound: { id: 'yt-s', title: 'Tune', author: 'Creator', isOriginal: false, licensedLibrary: true, durationSeconds: 3 } })).toMatchObject({ platform: 'youtube', soundId: 'yt-s', author: 'Creator' })
  })
})
