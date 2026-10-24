# JEV scoring rubric — Lava Bean (`lavabean-jev` v1.0.0)

JEV scores a creative **after** multimodal fact extraction, and only on facts that carry an
evidence span in the analysed asset. The machine-readable copy of this rubric lives in
`server/jev/scoring.ts` (`LAVABEAN_JEV_RUBRIC`); `tests/jev/scoring.test.ts` fails when this
document and the constant drift apart.

## Dimensions and weights

| id | weight | scorable when |
| --- | --- | --- |
| `brand_authenticity` | 0.25 | At least one cited fact exists in the facts bundle (for example a labelled product shot with a timestamp and shot id). |
| `product_clarity` | 0.20 | At least one cited fact states the product, its label or a defining property. |
| `originality` | 0.20 | At least one cited fact describes framing, setting or treatment that is actually visible in the analysed shots. |
| `brand_fit` | 0.20 | At least one cited fact can be checked against the Lava Bean brand rules. |
| `emotional_pull` | 0.15 | At least one cited fact describes the mood, pacing or human element that carries the creative. |

Weights must sum to **1.0**. A rubric whose weights do not sum to 1.0 (tolerance `1e-6`), that
repeats a dimension id, or that has a non-positive weight is rejected with `JevRubricError`.

## Scoring rules

1. Each dimension receives a score of `0`–`100` from a model judgement together with the ids of
   the facts that support it. A score outside that range, an unknown dimension id, or two
   judgements for the same dimension throws `JevScoreError`.
2. A dimension is scorable only when it cites **at least one fact id that exists in the facts
   bundle**. Ids that do not exist are discarded, so citing an imagined fact cannot make a
   dimension scorable.
3. A dimension without supporting facts reports `score: null`, an empty `factIds` list and a
   rationale containing `insufficient_evidence`. The score also appears in
   `insufficientReasons` as `<dimensionId>: insufficient_evidence`.
4. The overall score is the weighted average of the **scorable dimensions only**, renormalised
   by the sum of their weights. A null dimension is never averaged in and never counted as a
   zero.
5. `overall` is `null` when fewer than `minScorableDimensions` dimensions are scorable. For this
   rubric the minimum is **3** of **5**.

## Evidence rules

- A fact without an evidence span is dropped during analysis and counted in
  `droppedWithoutEvidence`; it can never support a dimension, an SEO candidate or a claim.
- An evidence span names the asset (`assetRefId`) plus a timestamp inside the asset or a shot id
  from the analysed timeline. Out-of-bounds timestamps and unknown shot ids are dropped.
- SEO candidates derived from facts cite the fact ids they came from. A candidate that cites a
  missing fact id, cites no facts, or uses words that no cited fact contains is rejected.
- No invented product claim, price, certification or capability may enter the rubric rationale,
  the SEO bundle or the score. Record what is evidenced; mark the rest as unknown.

## Not covered here

- Provider pricing, model selection and video spend are owned by R7.1/R7.2 and the budget
  policy, not by this rubric.
- The rubric is a review aid. A human still reviews any creative that carries a public claim.
