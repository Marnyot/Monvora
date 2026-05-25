import { describe, it, expect } from 'vitest'
import { createWalletSchema, updateWalletSchema } from '@/lib/validations/wallet'

describe('createWalletSchema', () => {
  it('accepts valid wallet input', () => {
    const result = createWalletSchema.safeParse({
      name: 'BCA Utama',
      type: 'bank',
      provider: 'BCA',
      balance: 5000000,
      color: '#3b82f6',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createWalletSchema.safeParse({ name: '', type: 'bank' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('name')
  })

  it('rejects invalid wallet type', () => {
    const result = createWalletSchema.safeParse({ name: 'Test', type: 'crypto' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('type')
  })

  it('rejects float balance', () => {
    const result = createWalletSchema.safeParse({ name: 'Test', type: 'cash', balance: 1000.5 })
    expect(result.success).toBe(false)
  })

  it('rejects negative balance', () => {
    const result = createWalletSchema.safeParse({ name: 'Test', type: 'cash', balance: -100 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid color format', () => {
    const result = createWalletSchema.safeParse({ name: 'Test', type: 'cash', color: 'blue' })
    expect(result.success).toBe(false)
  })

  it('uses default color and balance when not provided', () => {
    const result = createWalletSchema.safeParse({ name: 'Tunai', type: 'cash' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.color).toBe('#6366f1')
      expect(result.data.balance).toBe(0)
    }
  })

  it('accepts all valid wallet types', () => {
    for (const type of ['bank', 'ewallet', 'cash', 'other'] as const) {
      const result = createWalletSchema.safeParse({ name: 'Test', type })
      expect(result.success).toBe(true)
    }
  })
})

describe('updateWalletSchema', () => {
  it('accepts partial update', () => {
    const result = updateWalletSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('accepts is_active toggle', () => {
    const result = updateWalletSchema.safeParse({ is_active: false })
    expect(result.success).toBe(true)
  })
})
