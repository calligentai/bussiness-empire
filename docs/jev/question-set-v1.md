# JEV atomic question set v1.0.0

The frozen questions and thresholds live in `server/jev/questions.ts`. Each
answer must cite a fact with an evidence span. The dimension mapping follows the
shipped `lavabean-jev` rubric; craft questions use the closest existing
dimension because the rubric has no dedicated craft dimension.

| id | dimension | instructions for answerable evidence | not asking |
| --- | --- | --- | --- |
| `hook_product_or_problem` | `hook_strength` | Cite the opening frame timestamp and identify a visible product or problem cue. | Whether the product or problem is attractive or persuasive. |
| `hook_early_speech_or_text` | `hook_strength` | Cite speech or visible text observed from 0 through 1 second. | Whether the words are effective or compelling. |
| `hook_claim_before_brand` | `hook_strength` | Cite the claim/conflict and first brand mention spans, then compare their order. | Whether the claim is true or the brand is well known. |
| `hook_no_logo_intro` | `hook_strength` | Cite inspected frames in the first 3 seconds and any logo or intro card present. | Whether later branding is appropriate. |
| `hook_end_result` | `hook_strength` | Cite the opening span and the observed result used to classify it as an end result. | Whether the result is desirable or caused by the product. |
| `proof_product_used` | `product_clarity` | Cite an on-camera timestamp showing product use as an action. | Whether the product works as claimed. |
| `proof_before_after` | `product_clarity` | Cite frames/shots showing both comparison states together or in sequence. | Whether the change is statistically valid. |
| `proof_demonstrated_claim` | `product_clarity` | Cite a visible action/result and the claim it demonstrates. | Whether a narrated claim is factually true. |
| `proof_specific_number` | `product_clarity` | Quote a specific visible/spoken number and cite its timestamp. | Whether the number is accurate, affordable, or impressive. |
| `proof_human_reaction` | `product_clarity` | Cite a frame showing a human face or reaction. | Whether the person is sincere or representative. |
| `craft_loop_shot` | `hook_strength` | Compare opening and closing shots and cite the closing span. | Whether the loop increases watch time. |
| `craft_visual_change` | `hook_strength` | Cite successive shot changes and their timestamps to assess the 2-second cadence. | Whether each visual change is aesthetically good. |
| `craft_text_density` | `brand_safety` | Transcribe a visible text block, cite it, and count whitespace-separated words. | Whether the text is readable, accurate, or compliant. |
| `cta_benefit` | `call_to_action` | Quote the visible/spoken CTA and cite its span; identify any stated benefit. | Whether the offer exists, is available, or will convert. |

`prevalenceThreshold` is 0.7 for each question. A question becomes a ranked
issue only when cohort prevalence meets that threshold, asset probability is at
most 0.4, and cited evidence resolves to a usable span. Missing evidence is
`insufficient_evidence`, never a silent negative.
