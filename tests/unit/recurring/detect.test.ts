import { describe, it, expect } from 'vitest'
import { detectRecurring, type RecurringTxn } from '@/lib/recurring/detect'

function wib(yyyy: number, mm: number, dd: number): string {
  return new Date(Date.UTC(yyyy, mm - 1, dd, 5, 0)).toISOString() // 12:00 WIB
}

function tx(over: Partial<RecurringTxn>): RecurringTxn {
  return {
    id: 't-' + Math.random().toString(36).slice(2, 8),
    amount: 50_000,
    type: 'expense',
    merchant_name: 'Netflix',
    transacted_at: wib(2026, 3, 1),
    ...over,
  }
}

describe('detectRecurring — grouping', () => {
  it('groups expense transactions by normalized merchant name (case + whitespace)', () => {
    const groups = detectRecurring([
      tx({ merchant_name: 'Netflix', transacted_at: wib(2026, 3, 1) }),
      tx({ merchant_name: 'NETFLIX  ', transacted_at: wib(2026, 4, 1) }),
      tx({ merchant_name: ' netflix', transacted_at: wib(2026, 5, 1) }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].txIds).toHaveLength(3)
  })

  it('ignores income and transfer transactions', () => {
    const groups = detectRecurring([
      tx({ type: 'income', merchant_name: 'Gaji', transacted_at: wib(2026, 3, 1) }),
      tx({ type: 'income', merchant_name: 'Gaji', transacted_at: wib(2026, 4, 1) }),
      tx({ type: 'income', merchant_name: 'Gaji', transacted_at: wib(2026, 5, 1) }),
      tx({ type: 'transfer', merchant_name: 'Transfer Budi', transacted_at: wib(2026, 3, 1) }),
    ])
    expect(groups).toHaveLength(0)
  })

  it('ignores transactions with null/empty merchant_name', () => {
    const groups = detectRecurring([
      tx({ merchant_name: null, transacted_at: wib(2026, 3, 1) }),
      tx({ merchant_name: '   ', transacted_at: wib(2026, 4, 1) }),
      tx({ merchant_name: '', transacted_at: wib(2026, 5, 1) }),
    ])
    expect(groups).toHaveLength(0)
  })
})

describe('detectRecurring — monthly interval detection', () => {
  it('detects 3 transactions at ~30 day intervals as monthly recurring', () => {
    const groups = detectRecurring([
      tx({ id: 'a', transacted_at: wib(2026, 3, 1) }),
      tx({ id: 'b', transacted_at: wib(2026, 4, 1) }),
      tx({ id: 'c', transacted_at: wib(2026, 5, 1) }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].frequency).toBe('monthly')
    expect(groups[0].txIds.sort()).toEqual(['a', 'b', 'c'])
  })

  it('tolerates ±5 day variance (28-day February → 31-day March)', () => {
    const groups = detectRecurring([
      tx({ transacted_at: wib(2026, 1, 5) }),
      tx({ transacted_at: wib(2026, 2, 3) }), // 29 days
      tx({ transacted_at: wib(2026, 3, 6) }), // 31 days
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].frequency).toBe('monthly')
  })

  it('rejects transactions with inconsistent intervals', () => {
    const groups = detectRecurring([
      tx({ transacted_at: wib(2026, 1, 1) }),
      tx({ transacted_at: wib(2026, 1, 15) }), // 14 days — too short for monthly
      tx({ transacted_at: wib(2026, 5, 1) }),  // 100 days — too long
    ])
    expect(groups).toHaveLength(0)
  })

  it('requires at least 3 transactions to call something recurring', () => {
    const groups = detectRecurring([
      tx({ transacted_at: wib(2026, 3, 1) }),
      tx({ transacted_at: wib(2026, 4, 1) }),
    ])
    expect(groups).toHaveLength(0)
  })
})

describe('detectRecurring — monthly amount estimate', () => {
  it('uses average amount as monthly estimate', () => {
    const groups = detectRecurring([
      tx({ amount: 100_000, transacted_at: wib(2026, 3, 1) }),
      tx({ amount: 110_000, transacted_at: wib(2026, 4, 1) }),
      tx({ amount: 120_000, transacted_at: wib(2026, 5, 1) }),
    ])
    expect(groups[0].monthlyEstimate).toBe(110_000)
  })
})

describe('detectRecurring — group output shape', () => {
  it('emits merchantName (display) + canonicalKey + assigned groupId', () => {
    const groups = detectRecurring([
      tx({ merchant_name: 'Spotify Premium', transacted_at: wib(2026, 3, 1) }),
      tx({ merchant_name: 'Spotify Premium', transacted_at: wib(2026, 4, 1) }),
      tx({ merchant_name: 'Spotify Premium', transacted_at: wib(2026, 5, 1) }),
    ])
    expect(groups[0].merchantName).toBe('Spotify Premium')
    expect(groups[0].canonicalKey).toBe('spotify premium')
    expect(groups[0].groupId).toMatch(/^[0-9a-f-]{36}$/) // UUID
  })

  it('assigns distinct groupIds to distinct merchant groups', () => {
    const groups = detectRecurring([
      tx({ merchant_name: 'Netflix', transacted_at: wib(2026, 3, 1) }),
      tx({ merchant_name: 'Netflix', transacted_at: wib(2026, 4, 1) }),
      tx({ merchant_name: 'Netflix', transacted_at: wib(2026, 5, 1) }),
      tx({ merchant_name: 'Spotify', transacted_at: wib(2026, 3, 5) }),
      tx({ merchant_name: 'Spotify', transacted_at: wib(2026, 4, 5) }),
      tx({ merchant_name: 'Spotify', transacted_at: wib(2026, 5, 5) }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].groupId).not.toBe(groups[1].groupId)
  })
})
