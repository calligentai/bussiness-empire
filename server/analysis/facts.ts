import type {
  Fact,
  FactKind,
  FactsBundle,
  RejectedSeoProposal,
  SeoFacts,
  SeoFactKind,
  SeoProposal,
} from '../../types/jev'

const SEO_KINDS: ReadonlySet<string> = new Set<SeoFactKind>(['seo_title', 'seo_description', 'seo_keyword'])

const TITLE_MAX_LENGTH = 60
const DESCRIPTION_MAX_LENGTH = 160
const MAX_KEYWORDS = 8
const MAX_DESCRIPTION_SOURCES = 3

/**
 * Cut on a word boundary so derived copy never ends mid-word. The result is always a
 * literal prefix of the source statement, never a rewritten or embellished version.
 */
export function truncateAtWord(value: string, maxLength: number): string {
  const trimmed = value.trim()
  if (trimmed.length <= maxLength) return trimmed
  const cut = trimmed.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut
  return base.replace(/[\s,.;:·—–-]+$/u, '')
}

const confidenceOf = (fact: Fact): number => {
  if (typeof fact.confidence !== 'number' || !Number.isFinite(fact.confidence)) return 0
  return Math.min(1, Math.max(0, fact.confidence))
}

const lowestConfidence = (sources: Fact[]): number => Math.min(...sources.map(confidenceOf))

const firstOfKind = (facts: Fact[], kind: FactKind): Fact | undefined => facts.find((fact) => fact.kind === kind)

const joinStatements = (sources: Fact[], separator: string): string =>
  sources.map((source) => source.statement.trim()).filter(Boolean).join(separator)

interface BuildArgs {
  id: string
  kind: SeoFactKind
  statement: string
  sources: Fact[]
}

const buildDerived = ({ id, kind, statement, sources }: BuildArgs): Fact => ({
  id,
  kind,
  statement,
  evidence: sources[0].evidence,
  confidence: lowestConfidence(sources),
  derivedFrom: sources.map((source) => source.id),
})

/**
 * Derive SEO-facing facts (title, description, keyword candidates) strictly from facts
 * that already exist. Every derived fact carries `derivedFrom` pointing at those facts
 * and inherits the first source's evidence span; nothing is generated from imagination.
 *
 * Optional proposals (operator or upstream copy) are validated against the same fact
 * graph: a proposal citing an unknown fact id is refused and reported, never emitted.
 */
export function deriveSeoFacts(bundle: FactsBundle, proposals: SeoProposal[] = []): SeoFacts {
  const facts = bundle && Array.isArray(bundle.facts) ? bundle.facts : []
  const assetRefId = bundle?.assetRefId ?? ''
  const derived: Fact[] = []
  const seen = new Set<string>()

  const emit = (fact: Fact): void => {
    const key = `${fact.kind}:${fact.statement}`
    if (!fact.statement || seen.has(key)) return
    seen.add(key)
    derived.push(fact)
  }

  const titleFromScreen: Fact[] = facts.filter((fact) => fact.kind === 'on_screen_text').slice(0, 2)
  if (titleFromScreen.length > 0) {
    emit(
      buildDerived({
        id: 'seo-title-1',
        kind: 'seo_title',
        statement: truncateAtWord(joinStatements(titleFromScreen, ' · '), TITLE_MAX_LENGTH),
        sources: titleFromScreen,
      }),
    )
  } else {
    const titleFromSubject: Fact[] = facts.filter((fact) => fact.kind === 'subject').slice(0, 2)
    if (titleFromSubject.length > 0) {
      emit(
        buildDerived({
          id: 'seo-title-1',
          kind: 'seo_title',
          statement: truncateAtWord(joinStatements(titleFromSubject, ' — '), TITLE_MAX_LENGTH),
          sources: titleFromSubject,
        }),
      )
    }
  }

  const descriptionSources = (['subject', 'action', 'setting'] as FactKind[])
    .map((kind) => firstOfKind(facts, kind))
    .filter((fact): fact is Fact => Boolean(fact))
    .slice(0, MAX_DESCRIPTION_SOURCES)
  if (descriptionSources.length > 0) {
    emit(
      buildDerived({
        id: 'seo-description-1',
        kind: 'seo_description',
        statement: truncateAtWord(`${joinStatements(descriptionSources, '. ')}.`, DESCRIPTION_MAX_LENGTH),
        sources: descriptionSources,
      }),
    )
  }

  const keywordStatements = new Set<string>()
  for (const fact of facts) {
    if (fact.kind !== 'product_attribute') continue
    const keyword = fact.statement.trim().toLowerCase()
    if (!keyword || keywordStatements.has(keyword)) continue
    keywordStatements.add(keyword)
    emit(
      buildDerived({
        id: `seo-keyword-${keywordStatements.size}`,
        kind: 'seo_keyword',
        statement: keyword,
        sources: [fact],
      }),
    )
    if (keywordStatements.size >= MAX_KEYWORDS) break
  }

  const rejected: RejectedSeoProposal[] = []
  const knownIds = (): Set<string> =>
    new Set([...facts.map((fact) => fact.id), ...derived.map((fact) => fact.id)])
  let proposalIndex = 0

  for (const proposal of proposals) {
    if (!proposal || !SEO_KINDS.has(proposal.kind)) {
      rejected.push({
        proposal,
        reason: 'invalid_kind',
        detail: `Unsupported SEO fact kind: ${String(proposal?.kind)}`,
      })
      continue
    }
    const value = typeof proposal.value === 'string' ? proposal.value.trim() : ''
    if (!value) {
      rejected.push({ proposal, reason: 'empty_value', detail: 'SEO copy must not be empty' })
      continue
    }
    const factIds = Array.isArray(proposal.factIds)
      ? proposal.factIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : []
    if (factIds.length === 0) {
      rejected.push({
        proposal,
        reason: 'no_supporting_facts',
        detail: 'SEO copy must cite at least one extracted fact',
      })
      continue
    }
    const ids = knownIds()
    const missing = factIds.filter((id) => !ids.has(id))
    if (missing.length > 0) {
      rejected.push({
        proposal,
        reason: 'unknown_fact_id',
        detail: `Unknown fact id(s): ${missing.join(', ')}`,
      })
      continue
    }
    const sources = factIds
      .map((id) => [...facts, ...derived].find((fact) => fact.id === id))
      .filter((fact): fact is Fact => Boolean(fact))
    proposalIndex += 1
    emit(
      buildDerived({
        id: `seo-proposed-${proposalIndex}`,
        kind: proposal.kind,
        statement: value,
        sources,
      }),
    )
  }

  return { assetRefId, facts: derived, rejected }
}
