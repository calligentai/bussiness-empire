# Media prototype inventory (R7.1)

Evidence base for this inventory: a repository-wide search for `pixshop`, `product mockup`,
`co-creator`, `omni` and `veo` finds only three planning documents —
`docs/plans/archive/BUSINESS_EMPIRE_Master_Execution_Plan_v1.md`,
`docs/plans/BUSINESS_EMPIRE_Master_Execution_Plan_v1.1_TDD_Production.md` and
`docs/plans/BUS-25-m7-fan-out.md`. None of the four prototypes has source code, a README,
a route, a fixture or a test in this repository.

So the only evidenced capability requirement is the one line common to all four plans: they
are content-generation prototypes that must be consolidated into a single
provider-independent media interface. Everything beyond that line is unknown here and is
recorded as unknown rather than described.

## Capability the interface must cover (evidenced)

From `types/media.ts` and the R7.1 scope in `docs/plans/BUS-25-m7-fan-out.md`:

- one request shape for `image` and `video` output, with an optional seed, source asset refs
  and aspect ratio;
- explicit provider selection by id — no silent fallback when the provider does not support
  the kind;
- a per-request `maxCostCents` ceiling and a company-wide `budgetCapCents`, enforced before
  `generate()` runs;
- mandatory provenance on every returned asset (`providerId`, `modelId`, `generatedAt`,
  `promptHash`) that cannot be skipped by a provider;
- a consent record whenever the output depicts a person or brand;
- an injected `MediaTransport` so tests never reach the network.

## Prototypes

| Prototype | Capability the interface must cover | Evidence source | Status |
| --- | --- | --- | --- |
| Pixshop | Image generation behind the shared media interface (kind `image`), budget- and provenance-checked. Further capabilities unknown. | Only the plan line `docs/plans/BUSINESS_EMPIRE_Master_Execution_Plan_v1.1_TDD_Production.md:167`. No Pixshop source in repo. | not available in repo - needs source import |
| Product Mockup | Image generation behind the shared media interface (kind `image`), budget- and provenance-checked. Further capabilities unknown. | Only the plan line above. No Product Mockup source in repo. | not available in repo - needs source import |
| Co-Creator | Image and/or video generation behind the shared media interface, budget- and provenance-checked; whether it edits existing assets is unknown. | Only the plan line above. No Co-Creator source in repo. | not available in repo - needs source import |
| Omni/Veo | Video generation behind the shared media interface (kind `video`), which stays disabled until a budget is approved and an endpoint is reachable. Exact model, API and pricing unknown. | Only the plan line above. No Omni/Veo source in repo. | not available in repo - needs source import |

## Not claimed

- No provider pricing, model name, latency, resolution or quality claim is made here; none is
  evidenced.
- The presence of a prototype name in a plan does not prove the prototype runs, is
  reachable, or may be reused. Importing the source is the next step for any capability
  beyond the shared interface.
