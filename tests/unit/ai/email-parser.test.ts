import { describe, it, expect } from 'vitest'
import { parseEmailResponse } from '@/lib/ai/email-parser'

describe('parseEmailResponse', () => {
  it('parses a valid JSON response', () => {
    const raw = `{
      "amount": 150000,
      "type": "expense",
      "merchant_name": "Tokopedia",
      "description": "Pembelian online",
      "payment_method": "qris",
      "transacted_at": "2026-06-13T14:30:00+07:00",
      "reference_number": "TRX12345",
      "bank_name": "mandiri",
      "confidence": 0.9
    }`

    const result = parseEmailResponse(raw)
    expect(result).not.toBeNull()
    expect(result?.amount).toBe(150000)
    expect(result?.merchantName).toBe('Tokopedia')
    expect(result?.bankName).toBe('mandiri')
    expect(result?.paymentMethod).toBe('qris')
  })

  it('strips markdown fences', () => {
    const raw = '```json\n{"amount": 50000, "type": "expense", "payment_method": "transfer", "transacted_at": "2026-06-13T14:30:00+07:00", "bank_name": "bca", "confidence": 0.8}\n```'
    const result = parseEmailResponse(raw)
    expect(result?.amount).toBe(50000)
    expect(result?.bankName).toBe('bca')
  })

  it('returns null when amount is missing or zero', () => {
    const raw = '{"amount": 0, "type": "expense", "transacted_at": "2026-06-13T14:30:00+07:00", "confidence": 0.1}'
    expect(parseEmailResponse(raw)).toBeNull()
  })

  it('returns null when transacted_at missing', () => {
    const raw = '{"amount": 10000, "type": "expense", "confidence": 0.7}'
    expect(parseEmailResponse(raw)).toBeNull()
  })

  it('defaults payment_method to "other" when unknown', () => {
    const raw = '{"amount": 10000, "type": "expense", "payment_method": "bitcoin", "transacted_at": "2026-06-13T14:30:00+07:00", "bank_name": "mandiri", "confidence": 0.7}'
    const result = parseEmailResponse(raw)
    expect(result?.paymentMethod).toBe('other')
  })

  it('lowercases bank_name', () => {
    const raw = '{"amount": 10000, "type": "expense", "payment_method": "qris", "transacted_at": "2026-06-13T14:30:00+07:00", "bank_name": "BCA", "confidence": 0.7}'
    const result = parseEmailResponse(raw)
    expect(result?.bankName).toBe('bca')
  })

  it('returns null on invalid JSON', () => {
    expect(parseEmailResponse('not json')).toBeNull()
    expect(parseEmailResponse('')).toBeNull()
  })
})
