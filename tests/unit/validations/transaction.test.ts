import { describe, it, expect } from 'vitest'
import { createTransactionSchema, listTransactionSchema } from '@/lib/validations/transaction'

const validTx = {
  wallet_id: '550e8400-e29b-41d4-a716-446655440000',
  amount: 50000,
  type: 'expense' as const,
  transacted_at: '2026-05-25T09:00:00+07:00',
}

describe('createTransactionSchema', () => {
  it('accepts valid transaction', () => {
    expect(createTransactionSchema.safeParse(validTx).success).toBe(true)
  })

  it('rejects amount = 0', () => {
    const result = createTransactionSchema.safeParse({ ...validTx, amount: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = createTransactionSchema.safeParse({ ...validTx, amount: -1000 })
    expect(result.success).toBe(false)
  })

  it('rejects float amount', () => {
    const result = createTransactionSchema.safeParse({ ...validTx, amount: 1500.5 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid wallet_id format', () => {
    const result = createTransactionSchema.safeParse({ ...validTx, wallet_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = createTransactionSchema.safeParse({ ...validTx, type: 'savings' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid datetime', () => {
    const result = createTransactionSchema.safeParse({ ...validTx, transacted_at: '2026-05-25' })
    expect(result.success).toBe(false)
  })

  it('accepts datetime with timezone offset', () => {
    const result = createTransactionSchema.safeParse({
      ...validTx,
      transacted_at: '2026-05-25T09:00:00+07:00',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional fields', () => {
    const result = createTransactionSchema.safeParse({
      ...validTx,
      description: 'Makan siang',
      merchant_name: 'Warteg Pak Haji',
      payment_method: 'qris',
    })
    expect(result.success).toBe(true)
  })
})

describe('listTransactionSchema', () => {
  it('uses defaults when no params', () => {
    const result = listTransactionSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
    }
  })

  it('coerces string numbers', () => {
    const result = listTransactionSchema.safeParse({ page: '2', limit: '50' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(50)
    }
  })

  it('rejects limit > 100', () => {
    const result = listTransactionSchema.safeParse({ limit: 200 })
    expect(result.success).toBe(false)
  })
})
