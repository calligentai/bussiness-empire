import type { PersonaComparison } from '../../types/persona'
import { labelFor } from './labels'

const fixed = (value: number, digits = 3): string => value.toFixed(digits)

const band = (min: number, max: number): string => `${Number(min.toFixed(2))}-${Number(max.toFixed(2))}`

/**
 * Render a human-readable comparison report.
 *
 * The provenance label is derived from the data source here, never taken from the caller:
 * simulated numbers can never be rendered without `SIMULATED - NOT PROVEN VIEWER BEHAVIOUR`,
 * whatever the comparison object claims.
 */
export const renderReport = (comparison: PersonaComparison): string => {
  const label = labelFor(comparison.dataSource)
  const simulated = comparison.dataSource === 'simulated'
  const strength = Math.abs(comparison.rankCorrelation)
  const direction = comparison.rankCorrelation >= 0 ? 'positive' : 'negative'

  const interpretation = simulated
    ? [
        `On this fixture sample the AI order and the observed order move together with a ${direction} rank correlation of ${fixed(strength)}.`,
        'This is a rehearsal of the trial, not a result: the measured column comes from fixtures written by hand.',
        'It cannot be cited as evidence that AI judgement predicts viewer behaviour, and no creative should be shipped or killed on it.',
      ]
    : [
        `On this measured sample the AI order and the observed order move together with a ${direction} rank correlation of ${fixed(strength)}.`,
        `Sample: ${comparison.sampleSize} matched asset pairs. A correlation on a small sample is a lead, not a conclusion.`,
        'Review the calibration table before reusing a persona score as a ranking signal.',
      ]

  const calibrationRows = comparison.calibrationBuckets.map(
    (bucket) =>
      `| ${band(bucket.min, bucket.max)} | ${bucket.count} | ${fixed(bucket.predictedMean, 1)} | ${fixed(bucket.observedMean, 1)} |`,
  )

  return [
    '# Buyer-persona trial report',
    '',
    `Data source: ${comparison.dataSource} - ${label}`,
    '',
    `## Correlation - ${label}`,
    '',
    `- Spearman rank correlation: ${fixed(comparison.rankCorrelation)}`,
    `- n = ${comparison.sampleSize} matched asset pairs`,
    `- Rows dropped with impressions = 0: ${comparison.droppedRows}`,
    `- Judgements with no usable measurement: ${comparison.excludedJudgements}`,
    `- Provenance: ${label}`,
    '',
    `## Calibration - ${label}`,
    '',
    'Observed scores are min-max normalised within this sample, so bucket columns compare',
    'assets in this report to each other, not to an absolute benchmark.',
    '',
    '| predicted band | samples | mean predicted | mean observed |',
    '| --- | --- | --- | --- |',
    ...calibrationRows,
    '',
    `## Interpretation - ${label}`,
    '',
    ...interpretation.map((line) => `- ${line}`),
    '',
    `## Provenance - ${label}`,
    '',
    `- This report carries the label ${label} on every section by construction.`,
    simulated
      ? '- Fixture rows exist to prove the harness mechanics. Replace them with an analytics export before any decision.'
      : '- Rows marked real must trace back to the analytics export described in docs/persona/measurement-contract.md.',
    '',
  ].join('\n')
}
