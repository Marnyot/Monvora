import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockCheckRateLimit = vi.fn()
const mockFrom = vi.fn()
const mockExtract = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

vi.mock('@/lib/ai/ocr-vision', () => ({
  extractReceiptFromImage: (...args: unknown[]) => mockExtract(...args),
  VISION_PAYMENT_METHODS: ['qris', 'transfer', 'cash', 'debit', 'credit', 'ewallet', 'topup', 'other'],
}))

const VALID_USER = { id: 'user-abc', email: 'a@b.com' }
const TINY_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

function postRequest(body: unknown) {
  return new Request('http://localhost/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function categoriesChain(rows: Array<{ id: string; name: string }>) {
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'or']) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // The route awaits the final builder chain — last `.or()` resolves data.
  ;(chain as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) =>
    Promise.resolve({ data: rows, error: null }).then(resolve)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCheckRateLimit.mockReturnValue({ allowed: true })
  mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
  mockFrom.mockReturnValue(categoriesChain([
    { id: 'cat-food', name: 'Makanan & Minuman' },
    { id: 'cat-transport', name: 'Transportasi' },
  ]))
})

describe('POST /api/ocr — guards', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') })
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ image: TINY_BASE64 }))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate-limited', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 12 })
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ image: TINY_BASE64 }))
    expect(res.status).toBe(429)
  })
})

describe('POST /api/ocr — input validation', () => {
  it('rejects body without image field', async () => {
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ foo: 'bar' }))
    expect(res.status).toBe(422)
  })

  it('rejects non-data-url image string', async () => {
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ image: 'http://example.com/x.jpg' }))
    expect(res.status).toBe(422)
  })

  it('rejects unsupported mime type', async () => {
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ image: 'data:image/gif;base64,xxx' }))
    expect(res.status).toBe(422)
  })
})

describe('POST /api/ocr — extraction outcomes', () => {
  it('returns 422 PARSE_FAILED when Gemini cannot extract amount', async () => {
    mockExtract.mockResolvedValue({ ok: false, error: { kind: 'no_amount' } })
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ image: TINY_BASE64 }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe('PARSE_FAILED')
  })

  it('returns 503 AI_UNAVAILABLE when Gemini upstream errors', async () => {
    mockExtract.mockResolvedValue({ ok: false, error: { kind: 'upstream', errorId: 'ERR_test' } })
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ image: TINY_BASE64 }))
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.error.code).toBe('AI_UNAVAILABLE')
  })

  it('maps category_name back to category_id (case-insensitive)', async () => {
    mockExtract.mockResolvedValue({
      ok: true,
      data: {
        amount: 35000,
        merchantName: 'McDonalds',
        description: 'Big Mac',
        transactedAt: '2026-06-13T14:30:00+07:00',
        paymentMethod: 'qris',
        categoryName: 'MAKANAN & minuman', // different casing
        confidence: 0.9,
      },
    })
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ image: TINY_BASE64 }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.amount).toBe(35000)
    expect(json.data.category_id).toBe('cat-food')
    expect(json.data.category_name).toBe('MAKANAN & minuman')
    expect(json.data.payment_method).toBe('qris')
    expect(json.data.description).toBe('Big Mac')
  })

  it('returns null category_id when category_name not in user list', async () => {
    mockExtract.mockResolvedValue({
      ok: true,
      data: {
        amount: 35000,
        merchantName: null,
        description: null,
        transactedAt: null,
        paymentMethod: null,
        categoryName: 'Unknown',
        confidence: 0.6,
      },
    })
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ image: TINY_BASE64 }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.category_id).toBeNull()
  })
})
