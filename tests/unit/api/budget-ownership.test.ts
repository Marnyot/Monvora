import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeChain(finalResult: unknown) {
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'update', 'order', 'gte', 'or']) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain['single'] = vi.fn().mockResolvedValue(finalResult)
  chain['maybeSingle'] = vi.fn().mockResolvedValue(finalResult)
  return chain
}

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
}))

const VALID_USER = { id: 'user-abc', email: 'a@b.com' }
const VALID_ID = '550e8400-e29b-41d4-a716-446655440099'
const VALID_PARAMS = Promise.resolve({ id: VALID_ID })

function patchRequest(body: unknown = { amount: 500_000 }) {
  return new Request(`http://localhost/api/budgets/${VALID_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
})

describe('UUID guard', () => {
  it('returns 422 for non-UUID id on PATCH', async () => {
    const { PATCH } = await import('@/app/api/budgets/[id]/route')
    const res = await PATCH(patchRequest(), { params: Promise.resolve({ id: 'not-uuid' }) })
    expect(res.status).toBe(422)
  })
})

describe('PATCH /api/budgets/[id] — ownership guard', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') })
    const { PATCH } = await import('@/app/api/budgets/[id]/route')
    const res = await PATCH(patchRequest(), { params: VALID_PARAMS })
    expect(res.status).toBe(401)
  })

  it('returns 404 when budget does not belong to user', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null }))
    const { PATCH } = await import('@/app/api/budgets/[id]/route')
    const res = await PATCH(patchRequest(), { params: VALID_PARAMS })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error.code).toBe('NOT_FOUND')
  })
})

describe('DELETE /api/budgets/[id] — ownership guard', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') })
    const { DELETE } = await import('@/app/api/budgets/[id]/route')
    const req = new Request(`http://localhost/api/budgets/${VALID_ID}`, { method: 'DELETE' })
    const res = await DELETE(req, { params: VALID_PARAMS })
    expect(res.status).toBe(401)
  })

  it('returns 404 when budget does not belong to user', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null }))
    const { DELETE } = await import('@/app/api/budgets/[id]/route')
    const req = new Request(`http://localhost/api/budgets/${VALID_ID}`, { method: 'DELETE' })
    const res = await DELETE(req, { params: VALID_PARAMS })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/budgets — input validation', () => {
  it('returns 422 for missing required fields', async () => {
    const { POST } = await import('@/app/api/budgets/route')
    const req = new Request('http://localhost/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }), // missing amount, period
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 422 for amount <= 0', async () => {
    const { POST } = await import('@/app/api/budgets/route')
    const req = new Request('http://localhost/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', amount: 0, period: 'monthly' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') })
    const { POST } = await import('@/app/api/budgets/route')
    const req = new Request('http://localhost/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', amount: 100_000, period: 'monthly' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
