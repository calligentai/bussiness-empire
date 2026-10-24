import { describe, expect, it } from 'vitest'
import { analyzeAudioFile, type AudioCommandRunner } from '../../server/analysis/audio-features'
import { resolve } from 'node:path'
describe('deterministic audio features', () => {
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
})
