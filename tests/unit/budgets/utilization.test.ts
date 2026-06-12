import { describe, it, expect } from 'vitest'
import {
  computeBudgetStatus,
  periodWindow,
  type BudgetInput,
  type BudgetTxn,
} from '@/lib/budgets/utilization'

// Fixed "now": Friday 12 Jun 2026 12:00 WIB (05:00 UTC)
const NOW = new Date('2026-06-12T05:00:00.000Z')

function wib(yyyy: number, mm: number, dd: number, hh = 10): string {
  return new Date(Date.UTC(yyyy, mm - 1, dd, hh - 7, 0, 0)).toISOString()
}

describe('periodWindow', () => {
  it('monthly: start of current WIB month → start of next', () => {
    const { start, end } = periodWindow('monthly', NOW)
    expect(start.toISOString()).toBe('2026-05-31T17:00:00.000Z') // 2026-06-01 00:00 WIB
    expect(end.toISOString()).toBe('2026-06-30T17:00:00.000Z')   // 2026-07-01 00:00 WIB
  })

  it('weekly: start of WIB ISO week (Mon) → next Mon', () => {
    // 12 Jun 2026 is Friday; ISO week starts Mon 8 Jun
    const { start, end } = periodWindow('weekly', NOW)
    expect(start.toISOString()).toBe('2026-06-07T17:00:00.000Z') // 2026-06-08 00:00 WIB
    expect(end.toISOString()).toBe('2026-06-14T17:00:00.000Z')   // 2026-06-15 00:00 WIB
  })

  it('weekly: Sunday is treated as last day of previous week', () => {
    // 14 Jun 2026 (Sunday) at 23:30 WIB
    const sun = new Date(Date.UTC(2026, 5, 14, 16, 30))
    const { start, end } = periodWindow('weekly', sun)
    expect(start.toISOString()).toBe('2026-06-07T17:00:00.000Z')
    expect(end.toISOString()).toBe('2026-06-14T17:00:00.000Z')
  })

  it('yearly: Jan 1 WIB → next Jan 1', () => {
    const { start, end } = periodWindow('yearly', NOW)
    expect(start.toISOString()).toBe('2025-12-31T17:00:00.000Z') // 2026-01-01 00:00 WIB
    expect(end.toISOString()).toBe('2026-12-31T17:00:00.000Z')   // 2027-01-01 00:00 WIB
  })
})

describe('computeBudgetStatus — sums', () => {
  const baseTx = (over: Partial<BudgetTxn>): BudgetTxn => ({
    amount: 0,
    type: 'expense',
    transacted_at: wib(2026, 6, 5),
    category_id: null,
    ...over,
  })

  it('sums only expense transactions in current monthly period that match category', () => {
    const budget: BudgetInput = {
      id: 'b1', amount: 1_000_000, period: 'monthly', category_id: 'cat-food',
    }
    const txs: BudgetTxn[] = [
      baseTx({ amount: 300_000, category_id: 'cat-food' }),
      baseTx({ amount: 100_000, category_id: 'cat-food' }),
      baseTx({ amount: 999_999, category_id: 'cat-transport' }), // wrong category
      baseTx({ amount: 999_999, type: 'income', category_id: 'cat-food' }), // wrong type
      baseTx({ amount: 999_999, transacted_at: wib(2026, 5, 20), category_id: 'cat-food' }), // out of period
    ]
    const { spent, percent, status, remaining } = computeBudgetStatus(budget, txs, NOW)
    expect(spent).toBe(400_000)
    expect(percent).toBe(40)
    expect(status).toBe('ok')
    expect(remaining).toBe(600_000)
  })

  it('null category_id budget counts all expenses regardless of category', () => {
    const budget: BudgetInput = {
      id: 'b1', amount: 2_000_000, period: 'monthly', category_id: null,
    }
    const txs: BudgetTxn[] = [
      baseTx({ amount: 500_000, category_id: 'cat-food' }),
      baseTx({ amount: 700_000, category_id: 'cat-transport' }),
      baseTx({ amount: 100_000, category_id: null }),
      baseTx({ amount: 99_999, type: 'transfer' }), // transfer excluded
    ]
    const { spent } = computeBudgetStatus(budget, txs, NOW)
    expect(spent).toBe(1_300_000)
  })
})

describe('computeBudgetStatus — status thresholds', () => {
  const budget: BudgetInput = { id: 'b1', amount: 1_000_000, period: 'monthly', category_id: null }

  function statusFor(spent: number) {
    const tx: BudgetTxn = { amount: spent, type: 'expense', transacted_at: wib(2026, 6, 1), category_id: null }
    return computeBudgetStatus(budget, [tx], NOW).status
  }

  it('"ok" when spent < 80%', () => {
    expect(statusFor(799_999)).toBe('ok')
  })
  it('"warn" when 80% ≤ spent < 100%', () => {
    expect(statusFor(800_000)).toBe('warn')
    expect(statusFor(999_999)).toBe('warn')
  })
  it('"over" when spent ≥ 100%', () => {
    expect(statusFor(1_000_000)).toBe('over')
    expect(statusFor(1_500_000)).toBe('over')
  })

  it('clamps percent in result for UI but reports true remaining as negative when over budget', () => {
    const tx: BudgetTxn = { amount: 1_500_000, type: 'expense', transacted_at: wib(2026, 6, 1), category_id: null }
    const result = computeBudgetStatus(budget, [tx], NOW)
    expect(result.percent).toBe(150)
    expect(result.remaining).toBe(-500_000)
  })
})
