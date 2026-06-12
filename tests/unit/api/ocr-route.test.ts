import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockCheckRateLimit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: vi.fn(),
  }),
}))

vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

const VALID_USER = { id: 'user-abc', email: 'a@b.com' }

function postRequest(body: unknown) {
  return new Request('http://localhost/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCheckRateLimit.mockReturnValue({ allowed: true })
  mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
})

describe('POST /api/ocr — guards', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') })
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ text: 'Rp 10.000' }))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate-limited', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 12 })
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ text: 'Rp 10.000' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('12')
  })

  it('returns 400 for invalid JSON body', async () => {
    const { POST } = await import('@/app/api/ocr/route')
    const req = new Request('http://localhost/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/ocr — input validation', () => {
  it('returns 422 when text is empty', async () => {
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ text: '' }))
    expect(res.status).toBe(422)
  })

  it('returns 422 when text is missing', async () => {
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ foo: 'bar' }))
    expect(res.status).toBe(422)
  })

  it('returns 422 when text exceeds max length', async () => {
    const { POST } = await import('@/app/api/ocr/route')
    const longText = 'Rp 10.000\n' + 'x'.repeat(20_000)
    const res = await POST(postRequest({ text: longText }))
    expect(res.status).toBe(422)
  })
})

describe('POST /api/ocr — parse outcomes', () => {
  it('returns 422 PARSE_FAILED when no amount found', async () => {
    const { POST } = await import('@/app/api/ocr/route')
    const res = await POST(postRequest({ text: 'Hello world no money here' }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe('PARSE_FAILED')
  })

  it('returns parsed shape on success', async () => {
    const { POST } = await import('@/app/api/ocr/route')
    const text = 'GoPay\nTotal Pembayaran\nRp 35.000\nMcDonalds\n12 Jun 2026, 14:30'
    const res = await POST(postRequest({ text }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.error).toBeNull()
    expect(json.data.amount).toBe(35_000)
    expect(json.data.payment_method).toBe('ewallet')
    expect(json.data.merchant_name).toBe('McDonalds')
    expect(json.data.transacted_at).toBeDefined()
    expect(json.data.confidence).toBeGreaterThan(0.5)
  })
})
