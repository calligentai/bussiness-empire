import { describe, expect, it } from 'vitest'
import type { AiJudgement, MeasurementRow } from '../../types/persona'
import { compare } from '../../server/persona/harness'
import { renderReport } from '../../server/persona/report'
import { REAL_LABEL, SIMULATED_LABEL } from '../../server/persona/labels'

const judgement = (assetRefId: string, predictedScore: number): AiJudgement => ({
  assetRefId,
  predictedScore,
  dimensions: [{ name: 'hook', score: predictedScore }],
  judgedAt: '2026-10-01T00:00:00.000Z',
})

const row = (
  assetRefId: string,
  watchTimeSeconds: number,
  source: MeasurementRow['source'] = 'simulated',
): MeasurementRow => ({
  assetRefId,
  variantId: `${assetRefId}-v1`,
  impressions: 1200,
  watchTimeSeconds,
  scrollStop: true,
  ctr: 0.021,
  conversions: 3,
  source,
  collectedAt: '2026-10-20T00:00:00.000Z',
})

const fixture = (source: MeasurementRow['source'] = 'simulated') => {
  const judgements = [
    judgement('a', 95),
    judgement('b', 85),
    judgement('c', 70),
    judgement('d', 55),
    judgement('e', 40),
  ]
  const measurements = [
    row('a', 40, source),
    row('b', 10, source),
    row('c', 30, source),
    row('d', 20, source),
    row('e', 5, source),
  ]
  return compare(judgements, measurements, { minSampleSize: 5, metric: 'watchTimeSeconds', buckets: 5 })
}

const sections = (report: string): string[] =>
  report
    .split(/^## /m)
    .slice(1)
    .map((section) => section.trimEnd())

describe('persona report', () => {
  it('always prints how many rows were dropped, so a small sample cannot look complete', () => {
    const report = renderReport(fixture('simulated'))

    expect(report).toContain('- Rows dropped with impressions = 0: 0')
    expect(report).toContain('- Judgements with no usable measurement: 0')
  })
  it('carries the simulated disclaimer on every section, including the good-news summary', () => {
    const report = renderReport(fixture('simulated'))

    const rendered = sections(report)
    expect(rendered.length).toBeGreaterThanOrEqual(4)
    for (const section of rendered) {
      expect(section).toContain(SIMULATED_LABEL)
    }
    expect(report.trimStart().startsWith('#')).toBe(true)
    expect(report).toContain('0.7')
    expect(report).toContain('n = 5')
  })

  it('never presents simulated output as proven viewer behaviour', () => {
    const report = renderReport(fixture('simulated'))
    const claimLines = report
      .split('\n')
      .filter((line) => /proven viewer behaviou?r/i.test(line))

    expect(claimLines.length).toBeGreaterThan(0)
    for (const line of claimLines) {
      expect(line).toContain('NOT PROVEN VIEWER BEHAVIOUR')
    }
  })

  it('marks a real measurement report as measured and drops the simulated disclaimer', () => {
    const report = renderReport(fixture('real'))

    expect(report).toContain(REAL_LABEL)
    expect(report).not.toContain('SIMULATED')
    for (const section of sections(report)) {
      expect(section).toContain(REAL_LABEL)
    }
  })

  it('renders every calibration bucket as a table row with its sample count', () => {
    const report = renderReport(fixture('simulated'))
    const calibrationSection = sections(report).find((section) => /calibration/i.test(section))

    expect(calibrationSection).toBeDefined()
    expect(calibrationSection as string).toContain('| 0-20 |')
    expect(calibrationSection as string).toContain('| 80-100 |')
  })
})
