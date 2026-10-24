# JEV scoring rubric — R7.3

Structured scoring of a creative, computed only from facts extracted from the analysed
video. Nothing in this rubric rewards imagination: a dimension with no supporting fact
scores `null`, and the overall score is withheld when too few dimensions are scorable.

Code: `server/jev/scoring.ts` (`DEFAULT_JEV_RUBRIC`, `validateRubric`, `scoreJev`).
Types: `types/jev.ts`. Extraction: `server/analysis/video-analyzer.ts`,
`server/analysis/facts.ts`.

The absolute score is only half the answer. `server/jev/baseline.ts` adds the cohort
baseline, percentile estimate and ranked, evidence-backed issue list, documented in
[`baseline-and-diagnose.md`](./baseline-and-diagnose.md). The rubric itself is unchanged;
a baseline must be built from the same rubric version before it can be compared.

## Evidence rules

1. **A fact needs a span.** `analyzeVideo` emits a `Fact` only when the observation
   carries `assetRefId` equal to the analysed asset **and** a location inside it:
   `timestampSeconds` (finite, `>= 0`; zero is valid) or a non-blank `shotId`.
   An observation with no span, a span on a different asset, a negative/NaN timestamp or
   a blank shot id is dropped and counted in `droppedWithoutEvidence`. Observations that
   have a span but no statement are dropped and counted in `droppedInvalid`.
2. **Evidence is never rewritten.** A fact's `statement` is the trimmed observation text.
   `confidence` is clamped to `0..1`; a missing or non-finite confidence becomes `0.5`.
3. **Derived facts stay attached.** `deriveSeoFacts` builds title/description/keyword
   facts by quoting existing fact statements. Each carries `derivedFrom: string[]` with
   the source fact ids and inherits the first source's span and the lowest source
   confidence. A derived fact never adds a product claim the sources do not contain.
4. **Dangling references are refused.** A proposed SEO value (from an operator or another
   system) must cite at least one existing fact id. An unknown id is rejected with
   `reason: "unknown_fact_id"` and reported in `rejected`; the proposed copy is not
   emitted. Empty values (`empty_value`), missing citations (`no_supporting_facts`) and
   unsupported kinds (`invalid_kind`) are refused the same way.

## Dimensions (weights sum to 1.0)

| id | weight | signals (fact kind → max points) | minimumFacts |
| --- | --- | --- | --- |
| `hook_strength` | 0.25 | `action` 40, `on_screen_text` 35, `shot` 25 | 1 |
| `product_clarity` | 0.25 | `product_attribute` 60, `subject` 40 | 1 |
| `brand_safety` | 0.15 | `on_screen_text` 50, `audio` 50 | 1 |
| `seo_alignment` | 0.20 | `seo_title` 34, `seo_description` 33, `seo_keyword` 33 | 1 |
| `call_to_action` | 0.15 | `on_screen_text` 60, `audio` 40 | 1 |

`0.25 + 0.25 + 0.15 + 0.20 + 0.15 = 1.00`. `minimumScorableDimensions` is **3** of 5.

### How a dimension is scored

- Only facts whose `kind` appears in the dimension's `signals` are considered.
- For each matching kind, the highest-confidence fact is used and contributes
  `points × confidence`; contributions are summed and clamped to `0..100`, then rounded.
- `factIds` lists the exact facts that produced the score. It never contains a fact the
  dimension does not accept and is always empty when `score` is `null`.
- If the dimension has fewer than `minimumFacts` supporting facts, it is unscorable:
  `score: null`, `factIds: []`, and an `insufficient_evidence` reason with
  `scope: "dimension"` and the dimension id.

## Overall score

- The overall score is the weight-normalised mean over **scorable dimensions only**:
  `round(Σ weight × score / Σ weight)` for dimensions whose score is not null.
  With full evidence this equals the plain weighted sum.
- It is `null` when fewer than `minimumScorableDimensions` dimensions are scorable, or
  when the scorable dimensions carry zero weight. In both cases an `insufficient_evidence`
  reason with `scope: "overall"` explains why.
- A `null` dimension is never treated as `0` and never averaged in.
- An unscorable dimension also never silently raises the overall: renormalising by the
  scorable weight keeps the result interpretable, and the withheld reasons and the
  `factIds` remain the audit trail for what was actually scored.

## Rubric validation

`validateRubric` (also called by `scoreJev`) throws `JevRubricError` when:

- the rubric id is empty, or there are no dimensions;
- a dimension id is duplicated or empty;
- a weight is negative or non-finite;
- weights do not sum to `1.0` (tolerance `1e-6`);
- `minimumFacts` is not an integer `>= 1`;
- a dimension has no signals, or a signal's `points` falls outside `0..100`;
- `minimumScorableDimensions` is not an integer `>= 1`, or exceeds the dimension count.

An invalid rubric is a programming error, not a low score: it throws instead of producing
a number.

## What this rubric does not claim

- `confidence` is reported by the multimodal analyzer. It is not calibrated against human
  review and is not a probability of correctness.
- The dimension weights are a product judgement encoded as data, not measured
  effectiveness. They are not validated against watch-time, CTR or conversion data.
- No provider pricing, model capability or accuracy claim is made here. The analyzer is
  transport-injected; tests use recorded fixture observations and never touch the network.
- Changing a weight or dimension is a rubric change: update this document, the
  `DEFAULT_JEV_RUBRIC` constant and `tests/jev/scoring.test.ts` together. Changes that
  alter the shared media contract go back through BUS-25.
