import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { AnalysisInputError, AnalysisTransportError } from './errors'

const run = promisify(execFile)
export type AudioCommandRunner = (command: string, args: string[]) => Promise<{ stdout: string; stderr: string }>
export interface AudioFeatures {
  integratedLoudnessLufs: number | null
  voiceMusicBalance: { firstThreeSeconds: { voice: number | null; music: number | null }; overall: { voice: number | null; music: number | null } }
  speechRateWordsPerSecond: number | null
  pauseRatio: number | null
  phoneSpeakerAudibilityProxy: number | null
}
export interface WordTiming { word: string; startSeconds: number; endSeconds: number }
export interface SpeechTimingFeatures { speechRateWordsPerSecond: number | null; pauseRatio: number | null }

/** Deterministic timing metrics from supplied word annotations; no speech recognition is inferred. */
export function speechTimingFeatures(words: WordTiming[], durationSeconds: number): SpeechTimingFeatures {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Array.isArray(words) || words.length === 0) {
    return { speechRateWordsPerSecond: null, pauseRatio: null }
  }
  if (words.some((timing) => !timing || typeof timing.word !== 'string' || !timing.word.trim() || !Number.isFinite(timing.startSeconds) || !Number.isFinite(timing.endSeconds) || timing.startSeconds < 0 || timing.endSeconds <= timing.startSeconds || timing.endSeconds > durationSeconds)) {
    return { speechRateWordsPerSecond: null, pauseRatio: null }
  }
  const ordered = [...words].sort((a, b) => a.startSeconds - b.startSeconds)
  let activeSeconds = 0
  let intervalStart = ordered[0].startSeconds
  let intervalEnd = ordered[0].endSeconds
  for (const timing of ordered.slice(1)) {
    if (timing.startSeconds <= intervalEnd) intervalEnd = Math.max(intervalEnd, timing.endSeconds)
    else {
      activeSeconds += intervalEnd - intervalStart
      intervalStart = timing.startSeconds
      intervalEnd = timing.endSeconds
    }
  }
  activeSeconds += intervalEnd - intervalStart
  if (activeSeconds <= 0) return { speechRateWordsPerSecond: null, pauseRatio: null }
  return { speechRateWordsPerSecond: words.length / activeSeconds, pauseRatio: Math.max(0, Math.min(1, 1 - activeSeconds / durationSeconds)) }
}
/** Deterministic ffmpeg-only measurements. Unknown source separation/timing data stays null. */
export async function analyzeAudioFile(localFilePath: string, runner: AudioCommandRunner = (command, args) => run(command, args, { maxBuffer: 2_000_000 }), wordTimings: WordTiming[] = []): Promise<AudioFeatures> {
  if (typeof localFilePath !== 'string' || !localFilePath) throw new AnalysisInputError('A local audio file path is required')
  let loudness: number | null = null
  let durationSeconds: number | null = null
  try {
    const { stderr } = await runner('ffmpeg', ['-hide_banner','-nostats','-i',localFilePath,'-filter_complex','ebur128=framelog=verbose','-f','null','-'])
    const duration = stderr.match(/\bDuration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/)
    if (duration) durationSeconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3])
    const matches = [...stderr.matchAll(/\bI:\s*(-?\d+(?:\.\d+)?)\s*LUFS/g)]
    const parsed = matches.length ? Number(matches[matches.length-1][1]) : NaN
    if (Number.isFinite(parsed) && parsed > -70) loudness = parsed
  } catch {
    throw new AnalysisTransportError('ffmpeg could not analyze the local audio file')
  }
  const speech = durationSeconds === null ? { speechRateWordsPerSecond: null, pauseRatio: null } : speechTimingFeatures(wordTimings, durationSeconds)
  return { integratedLoudnessLufs: loudness, voiceMusicBalance: { firstThreeSeconds: { voice: null, music: null }, overall: { voice: null, music: null } }, ...speech, phoneSpeakerAudibilityProxy: null }
}
