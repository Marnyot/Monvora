import { describe, it, expect } from 'vitest'
import { aggregate, type AnalyticsInput } from '@/lib/analytics/aggregate'

// Fixed "now" — 12 Juni 2026 12:00 WIB (= 05:00 UTC)
const NOW = new Date('2026-06-12T05:00:00.000Z')

// Helper: WIB ISO with manual offset; produces a UTC instant
function wib(yyyy: number, mm: number, dd: number, hh = 10, mi = 0): string {
  return new Date(Date.UTC(yyyy, mm - 1, dd, hh - 7, mi)).toISOString()
}

const cat = (id: string, name: string, icon = '🍔', color = '#f59e0b') => ({ id, name, icon, color })

function tx(over: Partial<AnalyticsInput> = {}): AnalyticsInput {
  return {
    id: 't-' + Math.random().toString(36).slice(2, 8),
    amount: 50_000,
    type: 'expense',
    transacted_at: wib(2026, 6, 5, 12, 0),
    merchant_name: 'Indomaret',
    description: null,
    category: cat('cat-shop', 'Belanja'),
    ...over,
  }
}

describe('aggregate — totals (current month, WIB)', () => {
  it('sums income, expense, net for current month only', () => {
    const result = aggregate(
      [
        tx({ type: 'income', amount: 5_000_000, transacted_at: wib(2026, 6, 1, 9, 0) }),
        tx({ type: 'expense', amount: 50_000, transacted_at: wib(2026, 6, 5, 12, 0) }),
        tx({ type: 'expense', amount: 30_000, transacted_at: wib(2026, 6, 11, 18, 0) }),
        // last month — should NOT count in totals
        tx({ type: 'expense', amount: 999_999, transacted_at: wib(2026, 5, 20, 12, 0) }),
        // transfer — never counts in income/expense totals
        tx({ type: 'transfer', amount: 200_000, transacted_at: wib(2026, 6, 8, 10, 0) }),
      ],
      NOW
    )
    expect(result.totals.income).toBe(5_000_000)
    expect(result.totals.expense).toBe(80_000)
    expect(result.totals.net).toBe(4_920_000)
  })

  it('zero totals for empty input', () => {
    const result = aggregate([], NOW)
    expect(result.totals).toEqual({ income: 0, expense: 0, net: 0 })
  })
})

describe('aggregate — trend (6 months ending current)', () => {
  it('returns 6 month buckets in chronological order ending current month', () => {
    const result = aggregate([], NOW)
    expect(result.trend).toHaveLength(6)
    expect(result.trend[5].month).toBe('2026-06')
    expect(result.trend[4].month).toBe('2026-05')
    expect(result.trend[3].month).toBe('2026-04')
    expect(result.trend[0].month).toBe('2026-01')
  })

  it('buckets income/expense per month using WIB calendar', () => {
    const result = aggregate(
      [
        tx({ type: 'income', amount: 1_000, transacted_at: wib(2026, 4, 10) }),
        tx({ type: 'expense', amount: 500, transacted_at: wib(2026, 4, 11) }),
        tx({ type: 'expense', amount: 700, transacted_at: wib(2026, 6, 1) }),
        // transfers never counted
        tx({ type: 'transfer', amount: 99_999, transacted_at: wib(2026, 6, 2) }),
        // older than 6mo window — dropped
        tx({ type: 'expense', amount: 12_345, transacted_at: wib(2025, 12, 1) }),
      ],
      NOW
    )
    const apr = result.trend.find((p) => p.month === '2026-04')!
    expect(apr.income).toBe(1_000)
    expect(apr.expense).toBe(500)

    const jun = result.trend.find((p) => p.month === '2026-06')!
    expect(jun.income).toBe(0)
    expect(jun.expense).toBe(700)

    const may = result.trend.find((p) => p.month === '2026-05')!
    expect(may).toEqual({ month: '2026-05', income: 0, expense: 0 })
  })

  it('respects WIB midnight boundary (transaction late UTC, early WIB next day)', () => {
    // 2026-05-31 18:00 UTC === 2026-06-01 01:00 WIB → belongs to June, not May
    const result = aggregate(
      [
        {
          id: 't-1', amount: 100, type: 'expense',
          transacted_at: '2026-05-31T18:00:00.000Z',
          merchant_name: null, description: null, category: cat('c', 'Lain'),
        },
      ],
      NOW
    )
    expect(result.trend.find((p) => p.month === '2026-06')!.expense).toBe(100)
    expect(result.trend.find((p) => p.month === '2026-05')!.expense).toBe(0)
  })
})

describe('aggregate — byCategory (current month, expense only)', () => {
  it('sums expense per category, sorted by amount desc', () => {
    const result = aggregate(
      [
        tx({ amount: 25_000, category: cat('c-food', 'Makan', '🍔', '#f59e0b') }),
        tx({ amount: 75_000, category: cat('c-food', 'Makan', '🍔', '#f59e0b') }),
        tx({ amount: 200_000, category: cat('c-trans', 'Transport', '🚗', '#3b82f6') }),
        // income — excluded
        tx({ type: 'income', amount: 999_999, category: cat('c-salary', 'Gaji') }),
        // last month — excluded
        tx({ amount: 500_000, transacted_at: wib(2026, 5, 1), category: cat('c-food', 'Makan') }),
      ],
      NOW
    )
    expect(result.byCategory).toHaveLength(2)
    expect(result.byCategory[0]).toMatchObject({ categoryId: 'c-trans', amount: 200_000, count: 1 })
    expect(result.byCategory[1]).toMatchObject({ categoryId: 'c-food', amount: 100_000, count: 2 })
  })

  it('groups uncategorized transactions under a synthetic "Lainnya" bucket', () => {
    const result = aggregate([tx({ amount: 12_000, category: null })], NOW)
    expect(result.byCategory).toHaveLength(1)
    expect(result.byCategory[0].name).toBe('Lainnya')
    expect(result.byCategory[0].amount).toBe(12_000)
  })
})

describe('aggregate — topMerchants (current month, expense only)', () => {
  it('returns top 5 merchants by amount with count', () => {
    const merchants = ['A', 'B', 'C', 'D', 'E', 'F']
    const result = aggregate(
      merchants.flatMap((m, idx) => [
        tx({ merchant_name: m, amount: (idx + 1) * 10_000 }),
        tx({ merchant_name: m, amount: (idx + 1) * 10_000 }),
      ]),
      NOW
    )
    expect(result.topMerchants).toHaveLength(5)
    expect(result.topMerchants[0]).toEqual({ merchantName: 'F', amount: 120_000, count: 2 })
    expect(result.topMerchants[4]).toEqual({ merchantName: 'B', amount: 40_000, count: 2 })
  })

  it('falls back to description, then "Lainnya" when no merchant name', () => {
    const result = aggregate(
      [
        tx({ merchant_name: null, description: 'Beli pulsa', amount: 50_000 }),
        tx({ merchant_name: null, description: null, amount: 25_000 }),
      ],
      NOW
    )
    const names = result.topMerchants.map((m) => m.merchantName)
    expect(names).toContain('Beli pulsa')
    expect(names).toContain('Lainnya')
  })

  it('ignores income transactions', () => {
    const result = aggregate(
      [tx({ type: 'income', amount: 5_000_000, merchant_name: 'Gajian' })],
      NOW
    )
    expect(result.topMerchants).toHaveLength(0)
  })
})

describe('aggregate — byDayOfWeek (current month, expense only, WIB)', () => {
  it('returns 7 buckets (Mon=1..Sun=0 ISO) with sums', () => {
    // 2026-06-01 is Monday in WIB
    const result = aggregate(
      [
        tx({ amount: 10_000, transacted_at: wib(2026, 6, 1, 12) }),  // Mon
        tx({ amount: 20_000, transacted_at: wib(2026, 6, 2, 12) }),  // Tue
        tx({ amount: 5_000, transacted_at: wib(2026, 6, 7, 12) }),   // Sun
      ],
      NOW
    )
    expect(result.byDayOfWeek).toHaveLength(7)
    const get = (d: number) => result.byDayOfWeek.find((x) => x.day === d)!
    expect(get(1).amount).toBe(10_000) // Mon
    expect(get(2).amount).toBe(20_000) // Tue
    expect(get(0).amount).toBe(5_000)  // Sun
    expect(get(3).amount).toBe(0)
  })
})
