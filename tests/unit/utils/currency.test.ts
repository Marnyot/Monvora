import { describe, it, expect } from 'vitest'
import { formatIDR, parseIDR } from '@/lib/utils/currency'

describe('formatIDR', () => {
  it('formats thousands with dot separator', () => {
    expect(formatIDR(50000)).toBe('Rp 50.000')
  })

  it('formats millions correctly', () => {
    expect(formatIDR(1500000)).toBe('Rp 1.500.000')
  })

  it('formats zero', () => {
    expect(formatIDR(0)).toBe('Rp 0')
  })

  it('throws for negative amount', () => {
    expect(() => formatIDR(-1)).toThrow('Amount cannot be negative')
  })

  it('throws for float amount', () => {
    expect(() => formatIDR(1500.5)).toThrow('Amount must be an integer')
  })

  it('formats single thousands', () => {
    expect(formatIDR(5000)).toBe('Rp 5.000')
  })

  it('formats large amount', () => {
    expect(formatIDR(10000000)).toBe('Rp 10.000.000')
  })
})

describe('parseIDR', () => {
  it('parses "Rp 50.000" to 50000', () => {
    expect(parseIDR('Rp 50.000')).toBe(50000)
  })

  it('parses "Rp1.500.000" (no space) to 1500000', () => {
    expect(parseIDR('Rp1.500.000')).toBe(1500000)
  })

  it('parses plain number string', () => {
    expect(parseIDR('150000')).toBe(150000)
  })

  it('parses amount with Rp prefix and spaces', () => {
    expect(parseIDR('Rp 10.000.000')).toBe(10000000)
  })

  it('returns null for non-numeric string', () => {
    expect(parseIDR('bukan angka')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseIDR('')).toBeNull()
  })
})
