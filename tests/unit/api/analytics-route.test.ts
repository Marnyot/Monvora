import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeChain(finalResult: unknown) {
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'gte', 'lte', 'order']) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // The actual fetch happens when the chain is awaited; mock via .then for thenable proxy.
  ;(chain as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) =>
    Promise.resolve(finalResult).then(resolve)
  return chain
}

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockCheckRateLimit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

const VALID_USER = { id: 'user-abc', email: 'a@b.com' }

beforeEach(() => {
  vi.clearAllMocks()
  mockCheckRateLimit.mockReturnValue({ allowed: true })
  mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
})

describe('GET /api/analytics — guards', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') })
    const { GET } = await import('@/app/api/analytics/route')
    const res = await GET(new Request('http://localhost/api/analytics'))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate-limited', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 30 })
    const { GET } = await import('@/app/api/analytics/route')
    const res = await GET(new Request('http://localhost/api/analytics'))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('returns 500 when DB query fails', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: new Error('db down') }))
    const { GET } = await import('@/app/api/analytics/route')
    const res = await GET(new Request('http://localhost/api/analytics'))
    expect(res.status).toBe(500)
  })
})

describe('GET /api/analytics — filtering', () => {
  it('filters transactions by the authenticated user_id, not user-supplied', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }))
    const { GET } = await import('@/app/api/analytics/route')
    // Attacker passes user_id in query string — must be ignored
    const res = await GET(new Request('http://localhost/api/analytics?user_id=other-user'))
    expect(res.status).toBe(200)
    // Verify .eq was called with VALID_USER.id, never with 'other-user'
    const chain = mockFrom.mock.results[0].value as { eq: ReturnType<typeof vi.fn> }
    const eqCalls = chain.eq.mock.calls
    expect(eqCalls.some((c: unknown[]) => c[0] === 'user_id' && c[1] === VALID_USER.id)).toBe(true)
    expect(eqCalls.some((c: unknown[]) => c[0] === 'user_id' && c[1] === 'other-user')).toBe(false)
  })

  it('returns the aggregate result envelope on empty data', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }))
    const { GET } = await import('@/app/api/analytics/route')
    const res = await GET(new Request('http://localhost/api/analytics'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.error).toBeNull()
    expect(json.data.trend).toHaveLength(6)
    expect(json.data.byCategory).toEqual([])
    expect(json.data.topMerchants).toEqual([])
    expect(json.data.byDayOfWeek).toHaveLength(7)
    expect(json.data.totals).toEqual({ income: 0, expense: 0, net: 0 })
  })
})
