import { describe, it, expect } from 'vitest'
import { parseVisionResponse } from '@/lib/ai/ocr-vision'

describe('parseVisionResponse', () => {
  it('extracts a clean JSON object', () => {
    const raw = JSON.stringify({
      amount: 35000,
      merchant_name: 'McDonalds',
      description: 'Big Mac + Coke',
      transacted_at: '2026-06-13T14:30:00+07:00',
      payment_method: 'qris',
      category_name: 'Makanan & Minuman',
      confidence: 0.9,
    })
    const result = parseVisionResponse(raw)
    expect(result).toEqual({
      amount: 35000,
      merchantName: 'McDonalds',
      description: 'Big Mac + Coke',
      transactedAt: '2026-06-13T14:30:00+07:00',
      paymentMethod: 'qris',
      categoryName: 'Makanan & Minuman',
      confidence: 0.9,
    })
  })

  it('strips markdown fences', () => {
    const raw = '```json\n{"amount": 10000, "confidence": 0.7}\n```'
    expect(parseVisionResponse(raw)?.amount).toBe(10000)
  })

  it('returns null for non-JSON', () => {
    expect(parseVisionResponse('not json')).toBeNull()
    expect(parseVisionResponse('')).toBeNull()
  })

  it('treats missing/invalid fields as null instead of throwing', () => {
    const raw = JSON.stringify({ amount: 5000 })
    const result = parseVisionResponse(raw)
    expect(result?.amount).toBe(5000)
    expect(result?.merchantName).toBeNull()
    expect(result?.description).toBeNull()
    expect(result?.transactedAt).toBeNull()
    expect(result?.paymentMethod).toBeNull()
    expect(result?.categoryName).toBeNull()
  })

  it('rejects payment_method not in allowed enum', () => {
    const raw = JSON.stringify({ amount: 5000, payment_method: 'bitcoin' })
    expect(parseVisionResponse(raw)?.paymentMethod).toBeNull()
  })

  it('clamps confidence default at 0.5 when missing/invalid', () => {
    const raw = JSON.stringify({ amount: 5000 })
    expect(parseVisionResponse(raw)?.confidence).toBe(0.5)
    const out = parseVisionResponse(JSON.stringify({ amount: 5000, confidence: 1.5 }))
    expect(out?.confidence).toBe(0.5)
  })

  it('rejects non-integer or non-positive amount', () => {
    expect(parseVisionResponse(JSON.stringify({ amount: 0 }))?.amount).toBeNull()
    expect(parseVisionResponse(JSON.stringify({ amount: -5 }))?.amount).toBeNull()
    expect(parseVisionResponse(JSON.stringify({ amount: 1.5 }))?.amount).toBeNull()
    expect(parseVisionResponse(JSON.stringify({ amount: '5000' }))?.amount).toBeNull()
  })

  it('trims string fields and treats empty string as null', () => {
    const raw = JSON.stringify({
      amount: 5000,
      merchant_name: '   ',
      description: '  Some item  ',
    })
    const result = parseVisionResponse(raw)
    expect(result?.merchantName).toBeNull()
    expect(result?.description).toBe('Some item')
  })
})
