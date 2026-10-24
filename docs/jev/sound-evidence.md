# JEV sound and audio evidence — R7.3e

## Sound identity

`SoundRef` is platform-neutral: `{ platform: 'tiktok'|'youtube', soundId, title, author,
isOriginal, licensedLibrary, durationSeconds, raw }`. `SoundSource` is the shared
injected interface; TikTok and YouTube source adapters normalize captured platform data
without performing network requests.

The TikTok source extracts only from a captured TikTok video page blob at
`__UNIVERSAL_DATA_FOR_REHYDRATION__ → __DEFAULT_SCOPE__ → webapp.video-detail →
itemInfo.itemStruct.music`. Verified source fields (2026-10-25): `id`, `title`,
`original`, `authorName`, `duration`, `isCopyrighted`, `is_commerce_music`,
`is_unlimited_music`, and `tt2dsp`. `SoundRef` maps these to `soundId`, `title`,
`authorName`, `isOriginal`, `durationSeconds`, and `is_commerce_music` (mapped to
`author` and `licensedLibrary`); available source fields are retained in `raw`.

The YouTube source requires a captured sound entity. yt-dlp's `track`, `artists`, and
`album` metadata do not establish a sound entity and are rejected as identity input.

yt-dlp alone yields track/artists only and is not an identity source. A missing music
object is rejected. `is_commerce_music: false` creates the typed
`commerce_music_ineligible` violation.

## Trend evidence and provenance

Each platform-local harvest appends `{ platform, soundId, usageCount, harvestedAt,
source }`. Counts are
unofficial scrape observations, not official TikTok metrics. They are reported only as
ordinal rising/flat/stale/unknown evidence, never a rate or prediction. `harvestedAt`
travels with every observation because a sound can trend for a day. A delta requires at
least two observations spanning five days; otherwise the delta is null and trend is
unknown. Classification is trend precision: **unknown**.

## Acoustic evidence

`audio-features.ts` calls local `ffmpeg` with `ebur128=framelog=verbose` for integrated
loudness (LUFS). Voice/music balance, word timing, pause ratio, and phone-speaker band
energy are unknown until supported by measurable ffmpeg output and required input
annotations. No ML or affect/tone model is used. Unknown list: affect/tone and
music-genre classification; trend precision beyond ordinal snapshots.

Command used: `ffmpeg -hide_banner -nostats -i <local-file> -filter_complex
ebur128=framelog=verbose -f null -`. The analyzer parses integrated LUFS from stderr;
it returns null when the result is non-finite (such as silence) or unavailable. Voice
separation and speech word timings are not inferred from this command. When word
timings are supplied as annotations, speech rate and pause ratio are computed from the
timed word intervals and ffmpeg's reported duration. Missing or invalid timing data
returns null for both values.

Audio facts require `EvidenceSpan.audioSpan` with finite `startSeconds` and
`endSeconds > startSeconds`; missing spans are dropped by the existing fact validator.

## Cohort confound

A viral ad on a rising sound can receive distribution the script did not earn. Structural
priors are therefore keyed by `(platform, format, soundTrendStratum)`. Mixed-platform
cohorts always fail comparison; rising/stale or mixed-format cohorts require explicit
stratification. Report sound issues separately from structure issues so sound
distribution is not attributed to script structure.

Sound weight is configurable per platform through `PLATFORM_SOUND_WEIGHT_CONFIG`; both
values remain unset (`null`) until data supports calibration. The observed sound-weight
asymmetry between TikTok and Shorts is recorded here rather than encoded as a numeric
constant.
