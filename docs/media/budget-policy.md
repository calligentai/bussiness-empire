# Media budget policy

Free options are the default. Uploaded assets and local prototype exports have no provider-generation charge. This implementation does not claim that OpenAI API generation is free. Without a positive `MEDIA_BUDGET_CENTS`, paid generation is disabled and the provider must not call its transport. A positive cap enables a paid request only when both the request limit and run cap cover its estimate.

The OpenAI provider supports one fixed shape: one `gpt-image-2-2026-04-21` image at 1024×1024, low quality, with a prompt no longer than 4096 UTF-8 bytes and no reference images. Other sizes, qualities, edits, and prompt lengths are rejected before transport. The output estimate uses the OpenAI image calculator's 196 output tokens for that size and quality. Text input is bounded by the prompt's UTF-8 byte count. The provider combines those token ceilings with the published standard rates and rounds up to cents before transport. It rejects when the estimate exceeds either the company cap or the per-request cap.

No video generation is enabled by default. Video requires a positive `MEDIA_VIDEO_BUDGET_CENTS`, a positive company media cap, and a successful reachability probe against `MEDIA_VIDEO_ENDPOINT_URL` through the injected transport. The probe runs only when budget resolution is explicitly invoked. Reachability does not establish provider support, authorization, or safe pricing.

The company budget owner must approve both caps before paid media is enabled. Video approval additionally requires a reachable, documented endpoint and verified pricing. No video budget or endpoint has been approved.

## OpenAI pricing evidence

OpenAI's [API pricing page](https://developers.openai.com/api/docs/pricing) lists the standard `gpt-image-2` image output rate as USD $15 per million tokens and text input at USD $2.50 per million tokens. The [image-generation guide](https://developers.openai.com/api/docs/guides/image-generation) embeds the GPT Image token calculator and states that output tokens depend on model, quality, and dimensions. Its calculator source provides the fixed 1024×1024 low-quality estimate used here. This implementation pins those request parameters and limits prompt bytes; no estimate is supplied for other shapes.
