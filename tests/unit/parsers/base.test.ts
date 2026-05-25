import { describe, it, expect } from 'vitest'
import { parseIDRAmount, normalizeText, isFromSender, parseEmailDate } from '@/lib/gmail/parsers/base'
import type { GmailMessage } from '@/types/parser'

function makeEmail(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    id: 'msg-001',
    threadId: 'thread-001',
    subject: 'Notifikasi Transaksi',
    from: 'BankMandiri <notifikasi@bankmandiri.co.id>',
    body: '',
    date: '2024-01-15T10:30:00+07:00',
    snippet: '',
    ...overrides,
  }
}

// ─── parseIDRAmount ────────────────────────────────────────────────────────────

describe('parseIDRAmount', () => {
  it('parses "Rp. 150.000" to 150000', () => {
    expect(parseIDRAmount('Rp. 150.000')).toBe(150000)
  })

  it('parses "Rp 1.500.000,00" to 1500000', () => {
    expect(parseIDRAmount('Rp 1.500.000,00')).toBe(1500000)
  })

  it('parses "IDR 250000" to 250000', () => {
    expect(parseIDRAmount('IDR 250000')).toBe(250000)
  })

  it('parses "Rp50.000" without space to 50000', () => {
    expect(parseIDRAmount('Rp50.000')).toBe(50000)
  })

  it('parses "Rp 2.000.000,50" stripping cents to 2000000', () => {
    expect(parseIDRAmount('Rp 2.000.000,50')).toBe(2000000)
  })

  it('returns null for non-numeric string "bukan angka"', () => {
    expect(parseIDRAmount('bukan angka')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseIDRAmount('')).toBeNull()
  })

  it('parses amount embedded in a sentence', () => {
    const text = 'Transaksi sebesar Rp 500.000 telah berhasil'
    expect(parseIDRAmount(text)).toBe(500000)
  })
})

// ─── normalizeText ─────────────────────────────────────────────────────────────

describe('normalizeText', () => {
  it('lowercases and trims surrounding whitespace', () => {
    expect(normalizeText('  Hello   World  ')).toBe('hello world')
  })

  it('collapses multiple internal spaces to one', () => {
    expect(normalizeText('foo    bar')).toBe('foo bar')
  })

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('')
  })

  it('converts uppercase to lowercase', () => {
    expect(normalizeText('BANK MANDIRI')).toBe('bank mandiri')
  })
})

// ─── isFromSender ──────────────────────────────────────────────────────────────

describe('isFromSender', () => {
  it('returns true when from field contains the sender pattern', () => {
    const email = makeEmail({ from: 'BankMandiri <notifikasi@bankmandiri.co.id>' })
    expect(isFromSender(email, 'bankmandiri.co.id')).toBe(true)
  })

  it('returns false when from field does not match the sender pattern', () => {
    const email = makeEmail({ from: 'Gmail <someone@gmail.com>' })
    expect(isFromSender(email, 'bankmandiri.co.id')).toBe(false)
  })

  it('is case-insensitive for pattern matching', () => {
    const email = makeEmail({ from: 'BankMandiri <notifikasi@BankMandiri.co.id>' })
    expect(isFromSender(email, 'bankmandiri.co.id')).toBe(true)
  })

  it('returns false for empty from field', () => {
    const email = makeEmail({ from: '' })
    expect(isFromSender(email, 'bankmandiri.co.id')).toBe(false)
  })
})

// ─── parseEmailDate ────────────────────────────────────────────────────────────

describe('parseEmailDate', () => {
  it('parses ISO 8601 date string', () => {
    const result = parseEmailDate('2024-01-15T10:30:00+07:00')
    expect(result).toBeInstanceOf(Date)
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(0) // January = 0
    expect(result.getDate()).toBe(15)
  })

  it('parses RFC 2822-style email date', () => {
    const result = parseEmailDate('Mon, 15 Jan 2024 10:30:00 +0700')
    expect(result).toBeInstanceOf(Date)
    expect(result.getFullYear()).toBe(2024)
  })

  it('returns a valid Date object for any parseable date string', () => {
    const result = parseEmailDate('2024-06-20')
    expect(result).toBeInstanceOf(Date)
    expect(isNaN(result.getTime())).toBe(false)
  })

  it('falls back gracefully for unparseable string by returning a Date', () => {
    const result = parseEmailDate('not-a-date')
    // Implementation should return a Date (possibly Invalid Date or current date fallback)
    expect(result).toBeInstanceOf(Date)
  })
})
