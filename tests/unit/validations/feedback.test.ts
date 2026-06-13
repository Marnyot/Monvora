import { describe, it, expect } from 'vitest'
import { createFeedbackSchema } from '@/lib/validations/feedback'

const valid = {
  category: 'bug' as const,
  body: 'Tombol simpan kadang tidak merespon di iPhone Safari',
}

describe('createFeedbackSchema', () => {
  it('accepts valid feedback', () => {
    expect(createFeedbackSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts all 4 categories', () => {
    for (const c of ['bug', 'feature', 'praise', 'other'] as const) {
      expect(createFeedbackSchema.safeParse({ ...valid, category: c }).success).toBe(true)
    }
  })

  it('rejects unknown category', () => {
    expect(
      createFeedbackSchema.safeParse({ ...valid, category: 'complaint' }).success
    ).toBe(false)
  })

  it('rejects body under 5 chars', () => {
    expect(createFeedbackSchema.safeParse({ ...valid, body: 'hi' }).success).toBe(false)
  })

  it('rejects body over 2000 chars', () => {
    expect(
      createFeedbackSchema.safeParse({ ...valid, body: 'a'.repeat(2001) }).success
    ).toBe(false)
  })

  it('trims whitespace before validating length', () => {
    const r = createFeedbackSchema.safeParse({ ...valid, body: '   hi   ' })
    expect(r.success).toBe(false)
  })

  it('accepts optional app_version and user_agent', () => {
    const r = createFeedbackSchema.safeParse({
      ...valid,
      app_version: '0.3.0',
      user_agent: 'Mozilla/5.0',
    })
    expect(r.success).toBe(true)
  })

  it('rejects oversize user_agent', () => {
    const r = createFeedbackSchema.safeParse({
      ...valid,
      user_agent: 'a'.repeat(501),
    })
    expect(r.success).toBe(false)
  })
})
