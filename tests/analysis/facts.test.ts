import { describe, expect, it } from 'vitest'
import type { Fact, FactsBundle } from '../../types/jev'
import { deriveSeoFacts } from '../../server/analysis/facts'

const fact = (overrides: Partial<Fact> & Pick<Fact, 'id' | 'kind' | 'statement'>): Fact => ({
  confidence: 0.9,
  evidence: { assetRefId: 'asset-video-1', timestampSeconds: 1 },
  ...overrides,
})

const bundle: FactsBundle = {
  assetRefId: 'asset-video-1',
  droppedWithoutEvidence: 0,
  facts: [
    fact({ id: 'fact-1', kind: 'on_screen_text', statement: 'Lava Bean', evidence: { assetRefId: 'asset-video-1', timestampSeconds: 1 } }),
    fact({ id: 'fact-2', kind: 'subject', statement: 'A cup of latte', evidence: { assetRefId: 'asset-video-1', timestampSeconds: 2 } }),
    fact({ id: 'fact-3', kind: 'action', statement: 'A hand pours milk', evidence: { assetRefId: 'asset-video-1', timestampSeconds: 3 } }),
    fact({ id: 'fact-4', kind: 'product_attribute', statement: 'Oat milk', evidence: { assetRefId: 'asset-video-1', timestampSeconds: 4 } }),
    fact({ id: 'fact-5', kind: 'product_attribute', statement: 'Oat milk', evidence: { assetRefId: 'asset-video-1', timestampSeconds: 5 } }),
    fact({ id: 'fact-6', kind: 'setting', statement: 'A small cafe counter', evidence: { assetRefId: 'asset-video-1', timestampSeconds: 6 } }),
  ],
}

const byKind = (facts: Fact[], kind: Fact['kind']) => facts.filter((entry) => entry.kind === kind)

describe('deriveSeoFacts', () => {
  it('derives a title from an on-screen text fact and cites it', () => {
    const seo = deriveSeoFacts(bundle)
    const [title] = byKind(seo.facts, 'seo_title')

    expect(title.statement).toBe('Lava Bean')
    expect(title.derivedFrom).toEqual(['fact-1'])
    expect(title.evidence).toEqual({ assetRefId: 'asset-video-1', timestampSeconds: 1 })
  })

  it('derives a description only from subject, action and setting facts', () => {
    const seo = deriveSeoFacts(bundle)
    const [description] = byKind(seo.facts, 'seo_description')

    expect(description.derivedFrom).toEqual(['fact-2', 'fact-3', 'fact-6'])
    expect(description.statement).toBe('A cup of latte. A hand pours milk. A small cafe counter.')
    for (const sourceId of description.derivedFrom!) {
      const source = bundle.facts.find((entry) => entry.id === sourceId)
      expect(source).toBeDefined()
      expect(description.statement).toContain(source!.statement)
    }
  })

  it('derives deduplicated keywords from product attribute facts', () => {
    const seo = deriveSeoFacts(bundle)
    const keywords = byKind(seo.facts, 'seo_keyword')

    expect(keywords).toHaveLength(1)
    expect(keywords[0].statement).toBe('oat milk')
    expect(keywords[0].derivedFrom).toEqual(['fact-4'])
  })

  it('resolves every derived reference to a fact that exists', () => {
    const seo = deriveSeoFacts(bundle)
    const known = new Set([...bundle.facts.map((entry) => entry.id), ...seo.facts.map((entry) => entry.id)])

    expect(seo.rejected).toEqual([])
    for (const entry of seo.facts) {
      expect(entry.derivedFrom?.length).toBeGreaterThan(0)
      for (const id of entry.derivedFrom!) expect(known.has(id)).toBe(true)
    }
  })

  it('does not invent a title or description when no fact supports one', () => {
    const sparse: FactsBundle = {
      assetRefId: bundle.assetRefId,
      droppedWithoutEvidence: 0,
      facts: [fact({ id: 'fact-9', kind: 'product_attribute', statement: 'Recyclable cup' })],
    }
    const seo = deriveSeoFacts(sparse)

    expect(byKind(seo.facts, 'seo_title')).toEqual([])
    expect(byKind(seo.facts, 'seo_description')).toEqual([])
    expect(byKind(seo.facts, 'seo_keyword')).toHaveLength(1)
  })

  it('truncates a derived title without cutting a word', () => {
    const long: FactsBundle = {
      assetRefId: bundle.assetRefId,
      droppedWithoutEvidence: 0,
      facts: [
        fact({
          id: 'fact-1',
          kind: 'on_screen_text',
          statement: 'Lava Bean single origin oat milk latte poured by hand every single morning',
        }),
      ],
    }
    const [title] = byKind(deriveSeoFacts(long).facts, 'seo_title')

    expect(title.statement.length).toBeLessThanOrEqual(60)
    expect(title.statement.endsWith(' ')).toBe(false)
    expect(long.facts[0].statement.startsWith(title.statement)).toBe(true)
  })

  it('rejects a proposal that cites a fact id which does not exist', () => {
    const seo = deriveSeoFacts(bundle, [
      { kind: 'seo_keyword', value: 'single origin', factIds: ['fact-4', 'fact-does-not-exist'] },
    ])

    expect(seo.rejected).toHaveLength(1)
    expect(seo.rejected[0].reason).toBe('unknown_fact_id')
    expect(seo.rejected[0].detail).toContain('fact-does-not-exist')
    expect(seo.facts.some((entry) => entry.statement === 'single origin')).toBe(false)
  })

  it('rejects a proposal that cites no facts at all', () => {
    const seo = deriveSeoFacts(bundle, [{ kind: 'seo_keyword', value: 'oat milk', factIds: [] }])

    expect(seo.rejected).toHaveLength(1)
    expect(seo.rejected[0].reason).toBe('no_supporting_facts')
  })

  it('rejects a proposal with an empty value', () => {
    const seo = deriveSeoFacts(bundle, [{ kind: 'seo_title', value: '   ', factIds: ['fact-1'] }])

    expect(seo.rejected).toHaveLength(1)
    expect(seo.rejected[0].reason).toBe('empty_value')
  })

  it('accepts a proposal whose fact ids all exist and inherits their evidence', () => {
    const seo = deriveSeoFacts(bundle, [
      { kind: 'seo_keyword', value: 'Latte art', factIds: ['fact-2', 'fact-3'] },
    ])
    const accepted = seo.facts.find((entry) => entry.statement === 'Latte art')

    expect(seo.rejected).toEqual([])
    expect(accepted).toMatchObject({ kind: 'seo_keyword', derivedFrom: ['fact-2', 'fact-3'] })
    expect(accepted!.evidence).toEqual(bundle.facts[1].evidence)
    expect(accepted!.confidence).toBe(0.9)
  })
})
