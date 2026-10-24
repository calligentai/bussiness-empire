import { readFile } from 'node:fs/promises'
import { agreement } from '../server/jev/calibration.ts'
import type { QuestionAnswer } from '../types/jev.ts'

interface CalibrationFixture {
  transcript: QuestionAnswer[]
  extraction: QuestionAnswer[]
}

const path = process.argv[2]
if (!path) {
  console.error('Usage: node --experimental-strip-types scripts/calibrate.ts <fixture-transcript-extraction.json>')
  process.exitCode = 2
} else {
  try {
    const fixture = JSON.parse(await readFile(path, 'utf8')) as CalibrationFixture
    if (!Array.isArray(fixture.transcript) || !Array.isArray(fixture.extraction)) {
      throw new Error('Fixture must contain transcript and extraction answer arrays.')
    }
    const result = agreement(fixture.transcript, fixture.extraction)
    for (const [questionId, value] of Object.entries(result.perQuestion)) {
      console.log(`${questionId}\t${value.toFixed(3)}${value < 0.8 ? '\tFLAG' : ''}`)
    }
    console.log(`overall\t${result.overall.toFixed(3)}${result.overall < 0.8 ? '\tFLAG' : ''}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
