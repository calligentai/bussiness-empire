# JEV labelled library percentiles

`server/jev/baseline.ts` can build a dimension baseline from labelled library
entries. It reports the number of scorable entries, the 25th percentile, median,
75th percentile and mean for each dimension. Null scores are omitted from that
dimension's distribution.

`percentileOf(score, baseline)` estimates where each scorable dimension sits
relative to the library using its stored quartile anchors. The result is a
dimension-by-dimension comparison. It is not a probability of virality, a causal
claim, a forecast, or a scalar quality score. `diagnoseDelta` ranks distance from
the cohort midpoint; missing dimensions are skipped and do not alter other
dimensions.

At least five scorable observations are required for a dimension percentile.
The baseline can still report descriptive medians and quartiles for smaller
samples, but percentile requests throw `BaselineVersionError` until the cohort
is large enough.

All entries must have matching extractor, rubric and question-set versions.
Those versions affect how evidence is extracted, scored and interpreted, so a
mixed library would compare unlike measurements. Labels and evidence references
describe the library record; performance metadata must never enter analyzer or
scoring state.
