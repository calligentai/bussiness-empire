# JEV baseline and diagnosis — R7.3 relative layer

The R7.3 rubric scores one creative in absolute terms (see
[`scoring-rubric.md`](./scoring-rubric.md)). A 6.4/10 does not say whether the
creative beats a viral ad or is merely not insulting. This layer adds a **cohort**:
a labelled library of creatives with known outcomes, a per-dimension distribution,
a percentile estimate, and a ranked list of concrete, evidence-backed fixes.

Code: `server/jev/baseline.ts` (`buildBaseline`, `percentileOf`, `diagnose`,
`JevBaselineError`). Questions: `server/jev/questions.ts` (`JEV_QUESTIONS`,
`JEV_QUESTION_SET_VERSION`). Types: `types/jev.ts`. The rubric is unchanged.

## Library record

Every entry is one labelled creative:

```ts
{
  id, extractorVersion, rubricVersion, questionSetVersion,
  score: JevScore,                 // unchanged R7.3 output
  answers: QuestionAnswer[],       // per-question 0..1 probabilities
  outcome: { cohort: 'viral' | 'control' | 'unknown', ctr?: number }
}
```

**Outcome metadata never reaches the analysed state.** CTR, views, likes and brand
name are for labelling and stratification only. They must not be placed in the
facts, the extractor prompt or anything `scoreJev` reads; otherwise the model
infers "this is the high-CTR one" instead of judging the creative.

## `buildBaseline(entries, options)`

- `options.cohort` defaults to `viral`; `control` and `all` are explicit.
- `options.minimumCtr` gates the labels. Every selected entry must have a finite
  CTR at or above the threshold; a missing CTR fails the gate. A "viral" cohort
  containing sub-threshold creatives is refused rather than silently weakening
  the priors.
- All entries must share `extractorVersion`, `rubricVersion` and
  `questionSetVersion`. A mixed cohort throws `JevBaselineError`.
- `questionSetVersion` must equal the frozen `JEV_QUESTION_SET_VERSION`. A
  baseline from another question set throws instead of being compared.
- Each dimension gets `{ n, min, p25, median, p75, max, mean }` from the entries
  whose dimension score is a number. Quantiles use linear interpolation over the
  sorted sample; a null dimension is excluded, never counted as zero.
- Each question gets `{ n, prevalence }`, the mean probability over entries that
  answered it with a finite probability.
- A dimension or question with no observations is omitted, so diagnosis can
  report it as `insufficient_evidence` rather than assuming a value.

## Percentile estimate

`percentileOf(value, distribution)` places a score using the stored quartiles as
anchors (`min → 0`, `p25 → 25`, `median → 50`, `p75 → 75`, `max → 100`) and
interpolates linearly between them. It is a summary estimate, not an exact
empirical percentile, because the raw sample is deliberately not retained. A
zero-spread cohort returns `50`.

## Frozen atomic questions (v1.0.0)

Each question is answerable from facts that carry a timestamp or shot id, returns
a probability rather than a boolean, and is bound to one rubric dimension. The
question carries analyzer instructions, an expected evidence kind and its own
prevalence threshold. The complete evidence interpretation is documented in
[`question-set-v1.md`](./question-set-v1.md).

| id | window | dimension | prompt |
| --- | --- | --- | --- |
| `hook_product_or_problem` | hook | `hook_strength` | Does the first frame show the product or the problem it solves? |
| `hook_early_speech_or_text` | hook | `hook_strength` | Do speech or on-screen text appear within the first second? |
| `hook_claim_before_brand` | hook | `hook_strength` | Is a claim or conflict stated before any brand name appears? |
| `hook_no_logo_intro` | hook | `hook_strength` | Is the first three seconds free of a logo or intro card? |
| `hook_end_result` | hook | `hook_strength` | Does the opening show the end result rather than the setup? |
| `proof_product_used` | proof | `product_clarity` | Is the product physically used on camera, not merely held? |
| `proof_before_after` | proof | `product_clarity` | Is a before/after or side-by-side comparison visible? |
| `proof_demonstrated_claim` | proof | `product_clarity` | Is at least one claim demonstrated rather than only narrated? |
| `proof_specific_number` | proof | `product_clarity` | Does the creative state a specific number (price, percent, quantity or duration)? |
| `proof_human_reaction` | proof | `product_clarity` | Is a human face or reaction visible? |
| `craft_loop_shot` | craft | `hook_strength` | Does the last shot match the opening shot so the video loops cleanly? |
| `craft_visual_change` | craft | `hook_strength` | Does the image change at least every two seconds? |
| `craft_text_density` | craft | `brand_safety` | Is each on-screen text block five words or fewer? |
| `cta_benefit` | cta | `call_to_action` | Does the call to action name a benefit ("tap for 20% off") rather than only "link in bio"? |

The loop/visual-craft questions attach to `hook_strength` and text density to
`brand_safety` because the shipped rubric has no dedicated craft dimension. That
mapping is a judgement recorded here; adding a craft dimension would be a rubric
change and must go through the rubric document and `DEFAULT_JEV_RUBRIC` together.

Changing an id, prompt, instructions, evidence kind, dimension mapping, threshold or version is a question-set
change: update `JEV_QUESTION_SET_VERSION`, this table, and the tests together.

## `diagnose(score, baseline, answers, facts?)`

Returns `{ issues, questions, percentiles }`.

An issue is raised only when **all** of these hold:

- the bound dimension has a non-null score in `score` (otherwise the question is
  `insufficient_evidence` and does not shift any other question);
- an answer exists for the question with a finite probability;
- the answer resolves to a usable evidence span (explicit span, or the span of a
  cited fact). With `facts` supplied, citing an unknown fact id is
  `insufficient_evidence`, not a negative;
- the cohort has at least one answered sample for the question;
- cohort prevalence is `>= 0.7` **and** the asset probability is `<= 0.4`.

Issue priority is `gap × prevalence`, where `gap = prevalence - asset probability`.
Issues are sorted by priority descending, then question id ascending, so a fixed
fixture cohort produces a deterministic order. Every issue carries the evidence
span and fact ids, so the reviewer sees the offending timestamp instead of an
opinion.

A question with no supporting fact yields `status: 'insufficient_evidence'` and is
never silently counted as "no".

## Gates and rot risks

- **Version everything.** Mixing extractor, rubric or question-set versions throws.
  Without this, priors reset silently the day somebody edits a prompt.
- **Gate the labels.** `minimumCtr` is enforced, not advisory. Choose the threshold
  from the source's own definition and record it; this document does not assert a
  universally correct value.
- **Keep outcome metadata out of the analysed state.** See the library record above.
- **Check extractor stability before scaling.** Not implemented here. Re-extract
  five assets twice and compare per-question answers; if agreement is below roughly
  80%, the extractor is the noisy part and a larger library will not fix it. Record
  the measured agreement; do not assume it.

## Ingest source

No paid-social ingest exists in the repository. The TikTok Creative Radar endpoint
(`/creative_radar_api/v1/top_ads/v2/list`) was observed to return
`data.materials[]` with `ad_title`, `ctr`, `like`, `objective_key` and
`video_info.{vid,duration,cover}` **only from a browser session**; a direct server
request is rejected. Harvesting is therefore a browser-capture step behind an
injected `AdsSource` transport, so tests stay offline. Constraint: internal
analysis only; store vid + facts + scores, keep media local, and do not republish
ad creative.

## What this layer does not claim

- Question probabilities are model-reported judgements and are not calibrated.
  They are not probabilities of correctness or of virality.
- Percentiles are quartile-anchored estimates, not exact empirical ranks.
- The rubric weights and this question mapping are product judgements, not
  measured effectiveness.
- No model is trained or fine-tuned. The library supplies priors; nothing
  "learns".
- There is deliberately no single 0–100 "virality score". The output shape is a
  percentile per dimension plus a ranked issue list.
- No provider pricing, capability or accuracy claim is made, and no paid media
  generation or video spend is involved.

## Tests

Offline fixtures only, no network:

```sh
pnpm vitest run tests/jev
```

- `tests/jev/baseline.test.ts` — distributions, null exclusion, question
  prevalence, mixed-version refusal, frozen-question-set refusal, cohort
  selection, CTR gate, determinism, percentile anchors.
- `tests/jev/diagnose.test.ts` — ranking, determinism, null dimension skip,
  missing evidence, dangling fact ids, thresholds, percentiles.

`server/analysis/creative-center-source.ts` accepts a browser-session transport; it
does not create an HTTP client or access browser credentials. `scripts/harvest-top-ads.ts`
serializes only extracted ad reference fields and provenance timestamps. Keep outcome
metadata (`ctr`, `likes`) out of any state passed to the extractor, facts pipeline, or
`scoreJev`. The endpoint feed can change shape without notice, so malformed or missing
fields are rejected and should be reviewed against a fresh browser-captured fixture
before updating the parser. The endpoint's observed permission response (`40101`) is
reported as a typed permission failure, never an empty result.
