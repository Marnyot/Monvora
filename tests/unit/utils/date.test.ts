import { describe, it, expect } from 'vitest'
import { formatDate, formatDateShort, toJakartaISO } from '@/lib/utils/date'

describe('formatDate', () => {
  it('formats a date to readable Indonesian format', () => {
    const result = formatDate('2026-05-24T12:30:00+07:00')
    expect(result).toBe('24 Mei 2026, 12.30')
  })

  it('formats a different date correctly', () => {
    const result = formatDate('2026-01-01T07:00:00+07:00')
    expect(result).toBe('1 Jan 2026, 07.00')
  })
})

describe('formatDateShort', () => {
  it('formats to short date only', () => {
    const result = formatDateShort('2026-05-24T12:30:00+07:00')
    expect(result).toBe('24 Mei')
  })
})

describe('toJakartaISO', () => {
  it('converts a Date to ISO string with +07:00 timezone', () => {
    const date = new Date('2026-05-24T05:30:00.000Z') // 12:30 WIB
    const result = toJakartaISO(date)
    expect(result).toBe('2026-05-24T12:30:00+07:00')
  })

  it('handles midnight UTC as 07:00 WIB', () => {
    const date = new Date('2026-05-24T00:00:00.000Z')
    const result = toJakartaISO(date)
    expect(result).toBe('2026-05-24T07:00:00+07:00')
  })
})
