# Buyer-persona measurement contract (R7.4)

Status: **shelved on 2026-10-24 - no production traffic**. The harness in `server/persona/`
is proven on fixtures. The board confirmed that no production traffic exists, so no analytics
export can satisfy this contract yet: every number the harness produces carries
`SIMULATED - NOT PROVEN VIEWER BEHAVIOUR`, and the trial does not run.

Revival condition: once the store serves traffic, an export covering the events in section 2
with `source: "real"` and at least `minSampleSize` matched pairs turns the trial live. Nothing
else in this document changes.

This document says exactly what the export must contain before an AI persona judgement may
be compared with viewer behaviour, and what result would falsify that judgement.

## 1. What the trial measures

For each creative asset we hold two things:

| side | produced by | file |
| --- | --- | --- |
| prediction | AI persona judgement, 0-100 per asset | `types/persona.ts` -> `AiJudgement` |
| observation | real viewer behaviour per asset variant | `types/persona.ts` -> `MeasurementRow` |

The harness compares the *order* the persona puts assets in with the *order* viewers put
them in (Spearman rank correlation), and checks whether the predicted score bands line up
with observed scores (calibration buckets).

A positive correlation on one sample is not proof that the persona predicts behaviour.
It is one measurement, and the report is worded that way.

## 2. Required events in the analytics export

The export must be derived from these five events. Event names below are the contract the
analytics owner implements or maps to; if their platform uses different names, the export
must document the mapping explicitly and the mapping is part of the evidence.

### 2.1 `creative_impression`

Emitted once each time a creative asset is served into a viewport.

Required fields:

- `asset_ref_id` - joins to `AssetRef.id` in `types/media.ts` (never a rendered URL)
- `variant_id` - the creative variant actually served
- `placement` - where it appeared (page/slot identifier)
- `served_at` - ISO-8601 timestamp with offset
- `session_id` - pseudonymous session key, no personal data

### 2.2 `creative_scroll_stop`

Emitted when the platform's own scroll-stop condition is met for that impression.

Required fields:

- `asset_ref_id`, `variant_id`, `served_at`
- `scroll_stop` - boolean, true only when the platform's rule fired
- `scroll_stop_rule_id` - identifier of the definition used

The definition itself is the analytics owner's to publish. The trial does not invent a
dwell threshold here; if the rule is not documented and versioned, the `scrollStop`
column of `MeasurementRow` is unusable and the scroll-stop metric is dropped, not guessed.

### 2.3 `video_watch_time`

Emitted for video creatives on playback heartbeat or on exit.

Required fields:

- `asset_ref_id`, `variant_id`, `session_id`
- `watched_seconds` - accumulated watch time for this session and asset
- `duration_seconds` - duration of the creative as served
- `completed` - boolean

Deduplicate by `(session_id, asset_ref_id)` before summing: heartbeats must not be summed
as if they were separate viewers.

### 2.4 `creative_click`

Emitted on click or tap through a creative.

Required fields:

- `asset_ref_id`, `variant_id`, `session_id`, `clicked_at`

### 2.5 `order_completed`

Emitted on a completed purchase, with attribution to the creative that led to it.

Required fields:

- `order_id`, `value_cents`, `completed_at`
- `attributed_asset_ref_id`, `attributed_variant_id`
- `attribution_model` - the rule used (for example last creative click within a window)

If the store cannot attribute an order to a creative, conversions stay out of the trial and
the metric is reported as unavailable. Purchases are never heuristically assigned to
creatives to make the table look complete.

## 3. Export shape -> `MeasurementRow`

One row per `(asset_ref_id, variant_id, measurement_window)`:

| `MeasurementRow` field | derivation | unit |
| --- | --- | --- |
| `assetRefId` | `asset_ref_id` | string |
| `variantId` | `variant_id` | string |
| `impressions` | count of `creative_impression` | integer |
| `watchTimeSeconds` | mean `watched_seconds` per impression, deduplicated per section 2.3 | seconds |
| `scrollStop` | true when `creative_scroll_stop.scroll_stop` fired for the variant in the window | boolean |
| `ctr` | `creative_click` / `creative_impression` | fraction 0-1, not percent |
| `conversions` | count of attributed `order_completed` | integer |
| `source` | `"real"` for exported traffic | literal |
| `collectedAt` | window end, ISO-8601 with offset | timestamp |

Rules:

- `source` is `"real"` only for exported production traffic. Hand-written or modelled
  numbers are `"simulated"`, and `compare()` refuses to pool the two.
- Every asset in the trial needs a `variant_id` that never changes mid-window; changing the
  creative mid-window voids that window.
- Rows with `impressions = 0` are dropped, not zero-filled.
- Any asset that appears in `AiJudgement` with no measurement row is excluded from the
  comparison, and the drop count belongs in the trial notes.
- A row that cannot be true is rejected rather than correlated: `ctr` above 1 (a percentage
  export), more `conversions` than `impressions`, and a non-boolean `scrollStop` all throw.

## 4. Pre-registration (fixed before data is opened)

Written down and committed before the export is analysed, so the result cannot be
reverse-engineered:

1. the creative asset set and their `variant_id`s
2. the persona and model that produced `AiJudgement`, with `judgeId`
3. the observed metric used for ranking (`ComparisonPolicy.metric`)
4. `ComparisonPolicy.minSampleSize` - matched asset pairs required for a result
5. the measurement window
6. the pass/fail reading of section 6

`minSampleSize` is a policy choice, not a measured fact. The harness throws below it
instead of returning a correlation, so the number has to be agreed while it is still
inconvenient to change.

## 5. Unknowns (do not invent these)

- No analytics vendor or export pipeline for these events exists in this repository.
- No measurement window, traffic volume or impressions baseline has been agreed.
- No persona has been finalised; `AiJudgement.judgeId` is unset in all fixtures.
- Scroll-stop definition is unpublished (section 2.2).
- Order-to-creative attribution does not exist yet.

## 6. What would falsify an AI judgement

Falsification is decided on the pre-registered sample, with `source: "real"` rows only.

The claim "this persona predicts viewer behaviour" is **falsified** when any of these hold:

1. **Rank correlation is zero or negative** between predicted score and the pre-registered
   observed metric. The persona does not order assets better than chance.
2. **Calibration is inverted**: across at least three non-empty predicted bands, mean
   observed score decreases as predicted score increases.
3. **Sign flip on metric swap**: the correlation is positive on the primary metric but
   negative on a second pre-registered metric (for example positive on watch time,
   negative on conversions). The persona is then sensitive to the metric choice, which is
   a property of the measurement, not of viewer preference.
4. **Sign flip on holdout**: the correlation is positive in the first half of the window and
   negative in the second half for the same assets. The persona is fitting noise.
5. **Contamination**: any `source: "simulated"` row, any row without a resolvable
   `asset_ref_id`, or any variant whose creative changed mid-window. A contaminated sample
   is void - it neither confirms nor falsifies, and the trial is re-run.

Correspondingly, the strongest statement a passing sample supports is:
"on this sample, at this sample size, persona ranking and observed ranking agreed".
Never "the persona is proven", and never a claim about a persona that was not judged on
those exact assets.

## 7. Unblock condition for R7.4

R7.4 stays blocked until the analytics owner supplies an export satisfying sections 2 and 3,
covering the pre-registered asset set, with at least `minSampleSize` matched asset pairs and
`source: "real"` on every row.

Named unblock owner: **Lava Bean product owner on the BUS-25 board (calligentai)**.

Unblock action: provide the export described above, or confirm that no production traffic
exists for these creatives, in which case R7.4 is closed as shelved rather than left open
with fixture-only evidence.
