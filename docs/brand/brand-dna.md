# Lava Bean Brand DNA v1.0

Source of truth: `brand/tokens.json`. Generated CSS: `assets/css/tokens.css`.
Any visual rule that cannot be expressed as a token is documented here and checked by
`pnpm brand:check`.

## 1. Essence

**Volcanic precision. No noise.**

Lava Bean is the product-first coffee platform of Business Empire. We do not advertise
at people; we show the bean, the data and the machine. The brand should feel like a
precision instrument that happens to smell of roasted coffee: dark, warm, exact and a
little dangerous.

- **Positioning:** European specialty coffee, sourced through HiFanny, engineered for
  repeatable individual taste.
- **Promise:** the shortest path between a volcanic-origin bean and a cup that fits you.
- **Personality:** geologist, barista, engineer. Curious, direct, never hype.
- **Enemy:** hollow "premium" language, stock-photo smiles and marketing fog.

## 2. Tone of voice

| Do | Do not |
| --- | --- |
| Short declarative sentences. | Superlatives without evidence. |
| Name the bean, process, roast and measurement. | "World's best", "revolutionary", "game-changing". |
| Talk about what the user tastes. | Talk about how great the brand is. |
| Use numbers, dates and provenance. | Vague claims such as "carefully selected". |
| Dry confidence, occasional heat. | Exclamation marks, emoji strings, meme voice. |

Example: "Rwanda. Washed. 12.4 g in, 36 g out, 28 seconds. That is the starting point,
not the answer."

Dutch copy follows the same rules. Use "je", not "u", unless a legal or financial
context requires formality.

## 3. Logo

- Mark: a coffee bean split by a lava vein. Files: `public/brand/lavabean-mark.svg`.
- Clear space: at least 1/4 of the mark width on every side.
- Minimum size: 24 px digital.
- On light surfaces use the full-colour mark; on dark surfaces the same mark is legible
  because the bean body is paper-coloured and the vein is lava.
- Never stretch, rotate, add gradients, or place the mark on a busy photograph without
  a solid ink or paper panel behind it.
- The wordmark is always set in Space Grotesk 700, tracking `tight`. Do not redraw it.

## 4. Colour

| Token | Hex | Role |
| --- | --- | --- |
| `ink` | `#141210` | Text, dark surfaces, logo body. |
| `paper` | `#F4F0EA` | Default page background. |
| `lava` | `#E2481B` | Primary accent, molten highlights, display type on paper. |
| `ember` | `#F2A03D` | Primary action background, warm secondary accent. |
| `muted` | `#6B625B` | Secondary text and metadata. |
| `surface` | `#2A2522` | Inverted sections, cards on dark. |
| `line` | `#D9D2C7` | Hairline dividers on paper. |
| `danger` | `#B3261E` | Errors only. |
| `success` | `#1E6B45` | Confirmations only. |

Rules:

- Body text is `ink` on `paper`, or `paper` on `surface`/`ink`.
- Primary buttons are `ink` on `ember` (8.78:1).
- `lava` on `paper` (3.57:1) and white on `lava` (4.06:1) are display-only: 24 px and
  above, or bold 19 px and above. Never use them for body copy.
- No raw hex values in product code. Use the generated CSS variables or the JSON tokens.
- Colour is never the only signal for status; pair it with text or an icon.

## 5. Typography

| Role | Family | Weight | Size |
| --- | --- | --- | --- |
| Display | Space Grotesk | 700 | 46–64 px (`text-700`, `text-800`) |
| Heading | Space Grotesk | 500–700 | 26–34 px |
| Body | Inter | 400 | 16–20 px |
| UI label | Inter | 500 | 14 px, tracking `wide` for all-caps |
| Data / provenance | IBM Plex Mono | 400 | 12–14 px |

- Line heights: `tight` 1.1 for display, `display` 1.2 for headings, `body` 1.6 for
  running text.
- Maximum body measure: 68 characters.
- Load fonts through the platform font pipeline; the stacks in `tokens.json` provide
  deterministic fallbacks for local tests.
- No more than two families in one view (display/mono count together).

## 6. Spacing scale

Base unit **4 px**. Approved steps: **0, 4, 8, 12, 16, 24, 32, 48, 64, 96**.
Any other value fails `pnpm brand:check` with rule `spacing.grid` unless it is an
approved, version-controlled deviation.

Use `--lb-space-*` variables. Component-internal spacing also follows the scale; do not
invent `20px` or `18px` gaps.

## 7. Grid and breakpoints

- 12 columns, max width 1200 px.
- Gutter 24 px. Page margin 16 px below `md`, 48 px from `md` up.
- Breakpoints: `sm` 480 px, `md` 768 px, `lg` 1024 px, `xl` 1280 px.
- Layouts collapse from 3 columns (desktop) to 2 (tablet) to 1 (mobile). Never shrink
  type below 14 px to force a layout.

## 8. Imagery

- Volcanic landscapes, green coffee, macro texture, steam, control panels, hands at work.
- Hard natural light, deep shadows, visible grain. Warm highlights, never neon.
- No generic lifestyle stock, no fake offices, no suits shaking hands.
- Product shots keep the bean and the machine honest: show scale, provenance and wear.
- Every image needs alt text that describes the content, not the mood.

## 9. Motion and interaction

- Fast: 120 ms. Base: 200 ms. Easing: `cubic-bezier(0.2, 0, 0, 1)`.
- Motion explains state (hover, reveal, loading); it never decorates idle content.
- Respect `prefers-reduced-motion`.
- Focus states use a 2 px `ink` outline with a 2 px offset on light surfaces, and a
  2 px `ember` outline on dark surfaces.

## 10. Accessibility

- WCAG 2.2 AA is the floor.
- Every interactive element is keyboard reachable and has a visible focus state.
- Text contrast follows the token pairs in `brand/tokens.json`; `pnpm brand:check`
  enforces them.
- Touch targets are at least 44 × 44 px.
- Do not remove outlines without replacing them.

## 11. Governance

1. Change `brand/tokens.json` first, then run `pnpm tokens:build`.
2. Run `pnpm brand:check` and `pnpm test` before opening a PR.
3. A deliberate exception goes in `brand/deviations.json` with `rule`, `path`, `value`,
   `reason` and `approvedBy`. Unlisted deviations fail the check.
4. Visual changes require updated Playwright snapshots and a reviewed diff.
5. The brand owner approves token changes; no merge or deploy without human approval.
