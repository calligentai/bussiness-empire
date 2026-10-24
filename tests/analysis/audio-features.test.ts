import { describe, expect, it } from 'vitest'
import { analyzeAudioFile, speechTimingFeatures, type AudioCommandRunner } from '../../server/analysis/audio-features'
import { resolve } from 'node:path'
describe('deterministic audio features', () => {
 it('derives speech rate and pause ratio only from valid word timings', () => {
  expect(speechTimingFeatures([
    { startSeconds: 0, endSeconds: 0.5, word: 'one' },
    { startSeconds: 1, endSeconds: 1.5, word: 'two' },
  ], 2)).toEqual({ speechRateWordsPerSecond: 2, pauseRatio: 0.5 })
  expect(speechTimingFeatures([], 2)).toEqual({ speechRateWordsPerSecond: null, pauseRatio: null })
  expect(speechTimingFeatures([{ startSeconds: 1, endSeconds: 0.5, word: 'bad' }], 2)).toEqual({ speechRateWordsPerSecond: null, pauseRatio: null })
 })
 it('returns documented unknown sentinels for silent local audio', async () => {
  const runner: AudioCommandRunner = async (command, args) => {
    expect(command).toBe('ffmpeg')
    expect(args).toContain(resolve('tests/fixtures/audio/silence-2s.wav'))
    expect(args).toContain('ebur128=framelog=verbose')
    return { stdout: '', stderr: 'Integrated loudness:\nI:        -inf LUFS\n' }
  }
  const result = await analyzeAudioFile(resolve('tests/fixtures/audio/silence-2s.wav'), runner)
  expect(result.integratedLoudnessLufs).toBeNull()
  expect(result.voiceMusicBalance.firstThreeSeconds).toEqual({ voice: null, music: null })
  expect(result.voiceMusicBalance.overall).toEqual({ voice: null, music: null })
  expect(result.speechRateWordsPerSecond).toBeNull()
  expect(result.pauseRatio).toBeNull()
  expect(result.phoneSpeakerAudibilityProxy).toBeNull()
  expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/)
 })
  it('calls local ffmpeg with the deterministic filter', async () => {
    const runner: AudioCommandRunner = async (_command, args) => ({ stdout: '', stderr: 'I: -23.4 LUFS' })
    const result = await analyzeAudioFile(resolve('tests/fixtures/audio/silence-2s.wav'), runner)
    expect(result.integratedLoudnessLufs).toBe(-23.4)
  })
  it('uses ffmpeg duration and supplied word timings for speech features', async () => {
    const runner: AudioCommandRunner = async () => ({ stdout: '', stderr: 'Duration: 00:00:02.00\nI: -23.4 LUFS' })
    const result = await analyzeAudioFile(resolve('tests/fixtures/audio/silence-2s.wav'), runner, [
      { startSeconds: 0, endSeconds: 0.5, word: 'one' },
      { startSeconds: 1, endSeconds: 1.5, word: 'two' },
    ])
    expect(result.speechRateWordsPerSecond).toBe(2)
    expect(result.pauseRatio).toBe(0.5)
  })
})
