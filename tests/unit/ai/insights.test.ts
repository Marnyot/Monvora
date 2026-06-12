import { describe, it, expect } from 'vitest'
import { buildInsightsPrompt, parseInsights, type InsightsContext } from '@/lib/ai/insights'

const ctx: InsightsContext = {
  monthLabel: 'Juni 2026',
  prevMonthLabel: 'Mei 2026',
  totals: { income: 8_000_000, expense: 3_500_000 },
  prevTotals: { income: 7_500_000, expense: 4_200_000 },
  topCategories: [
    { name: 'Makanan & Minuman', amount: 1_200_000 },
    { name: 'Transportasi', amount: 800_000 },
  ],
  topMerchants: [
    { name: 'Shopee', count: 7, amount: 600_000 },
  ],
}

describe('buildInsightsPrompt', () => {
  it('includes Indonesian instruction and period labels, never raw PII formatting', () => {
    const prompt = buildInsightsPrompt(ctx)
    expect(prompt).toMatch(/Bahasa Indonesia/)
    expect(prompt).toContain('Juni 2026')
    expect(prompt).toContain('Mei 2026')
    expect(prompt).toContain('Makanan & Minuman')
    expect(prompt).toContain('Shopee')
    // Plain Rp formatting (titik separator)
    expect(prompt).toMatch(/Rp\s?3\.500\.000/)
  })

  it('demands JSON-only array of strings (no preamble)', () => {
    const prompt = buildInsightsPrompt(ctx)
    expect(prompt).toMatch(/JSON/i)
    expect(prompt).toMatch(/array/i)
  })
})

describe('parseInsights', () => {
  it('extracts JSON array even when wrapped in markdown fences', () => {
    const raw = '```json\n["Insight 1", "Insight 2"]\n```'
    expect(parseInsights(raw)).toEqual(['Insight 1', 'Insight 2'])
  })

  it('caps at 3 insights, trimming whitespace', () => {
    const raw = '["  a ", " b", "c", "d", "e"]'
    expect(parseInsights(raw)).toEqual(['a', 'b', 'c'])
  })

  it('rejects non-string entries and empties', () => {
    const raw = '["valid", "", null, 42, "  ", "still valid"]'
    expect(parseInsights(raw)).toEqual(['valid', 'still valid'])
  })

  it('returns null when JSON missing or invalid', () => {
    expect(parseInsights('not json at all')).toBeNull()
    expect(parseInsights('{ "category": "x" }')).toBeNull()
    expect(parseInsights('[]')).toBeNull()
  })

  it('strips items that exceed reasonable length (200 chars) to avoid prompt injection echo', () => {
    const long = 'x'.repeat(250)
    const raw = JSON.stringify(['short', long])
    expect(parseInsights(raw)).toEqual(['short'])
  })
})
