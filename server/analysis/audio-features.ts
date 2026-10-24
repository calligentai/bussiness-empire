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
/** Deterministic ffmpeg-only measurements. Unknown source separation/timing data stays null. */
export async function analyzeAudioFile(localFilePath: string, runner: AudioCommandRunner = (command, args) => run(command, args, { maxBuffer: 2_000_000 })): Promise<AudioFeatures> {
  if (typeof localFilePath !== 'string' || !localFilePath) throw new AnalysisInputError('A local audio file path is required')
  let loudness: number | null = null
  try {
    const { stderr } = await runner('ffmpeg', ['-hide_banner','-nostats','-i',localFilePath,'-filter_complex','ebur128=framelog=verbose','-f','null','-'])
    const matches = [...stderr.matchAll(/\bI:\s*(-?\d+(?:\.\d+)?)\s*LUFS/g)]
    const parsed = matches.length ? Number(matches[matches.length-1][1]) : NaN
    if (Number.isFinite(parsed) && parsed > -70) loudness = parsed
  } catch {
    throw new AnalysisTransportError('ffmpeg could not analyze the local audio file')
  }
  return { integratedLoudnessLufs: loudness, voiceMusicBalance: { firstThreeSeconds: { voice: null, music: null }, overall: { voice: null, music: null } }, speechRateWordsPerSecond: null, pauseRatio: null, phoneSpeakerAudibilityProxy: null }
}
