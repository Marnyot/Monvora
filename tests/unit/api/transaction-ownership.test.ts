import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal chainable Supabase query builder mock
function makeChain(finalResult: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is', 'update', 'insert', 'order', 'limit', 'range', 'gte', 'lte', 'or']
  methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain) })
  chain['single'] = vi.fn().mockResolvedValue(finalResult)
  return chain
}

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
}))

const VALID_USER = { id: 'user-abc', email: 'a@b.com' }
const VALID_ID = '550e8400-e29b-41d4-a716-446655440001'
const VALID_PARAMS = Promise.resolve({ id: VALID_ID })

function makeRequest(body: unknown = {}) {
  return new Request(`http://localhost/api/transactions/${VALID_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('UUID validation guard', () => {
  it('returns 422 for non-UUID id', async () => {
    const { PATCH } = await import('@/app/api/transactions/[id]/route')
    const badParams = Promise.resolve({ id: 'not-a-uuid' })
    const res = await PATCH(makeRequest(), { params: badParams })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PATCH /api/transactions/[id] — ownership guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
  })

  it('returns 404 when transaction does not belong to user', async () => {
    // First query (ownership check) returns null — not found or wrong user
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null }))

    const { PATCH } = await import('@/app/api/transactions/[id]/route')
    const res = await PATCH(makeRequest({ merchant_name: 'Grab' }), { params: VALID_PARAMS })

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error.code).toBe('NOT_FOUND')
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') })

    const { PATCH } = await import('@/app/api/transactions/[id]/route')
    const res = await PATCH(makeRequest(), { params: VALID_PARAMS })

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/transactions/[id] — ownership guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
  })

  it('returns 404 when transaction does not belong to user', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null }))

    const { DELETE } = await import('@/app/api/transactions/[id]/route')
    const req = new Request(`http://localhost/api/transactions/${VALID_ID}`, { method: 'DELETE' })
    const res = await DELETE(req, { params: VALID_PARAMS })

    expect(res.status).toBe(404)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') })

    const { DELETE } = await import('@/app/api/transactions/[id]/route')
    const req = new Request(`http://localhost/api/transactions/${VALID_ID}`, { method: 'DELETE' })
    const res = await DELETE(req, { params: VALID_PARAMS })

    expect(res.status).toBe(401)
  })
})
