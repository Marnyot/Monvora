import { describe, it, expect } from 'vitest'
import { createCategorySchema } from '@/lib/validations/category'

describe('createCategorySchema', () => {
  it('accepts valid category', () => {
    const result = createCategorySchema.safeParse({
      name: 'Kopi',
      icon: 'Coffee',
      color: '#f97316',
      type: 'expense',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createCategorySchema.safeParse({ name: '', icon: 'Coffee', color: '#f97316', type: 'expense' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('name')
  })

  it('rejects invalid color', () => {
    const result = createCategorySchema.safeParse({ name: 'Test', icon: 'Coffee', color: 'red', type: 'expense' })
    expect(result.success).toBe(false)
  })

  it('accepts all transaction types', () => {
    for (const type of ['expense', 'income', 'transfer'] as const) {
      const result = createCategorySchema.safeParse({ name: 'Test', icon: 'Star', color: '#000000', type })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    const result = createCategorySchema.safeParse({ name: 'Test', icon: 'Star', color: '#000000', type: 'savings' })
    expect(result.success).toBe(false)
  })
})
