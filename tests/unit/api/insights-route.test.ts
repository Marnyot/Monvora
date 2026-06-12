import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeChain(finalResult: unknown) {
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'lte', 'gte', 'order', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain['maybeSingle'] = vi.fn().mockResolvedValue(finalResult)
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

describe('GET /api/insights — guards', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') })
    const { GET } = await import('@/app/api/insights/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate-limited', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 42 })
    const { GET } = await import('@/app/api/insights/route')
    const res = await GET()
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('42')
  })

  it('returns 500 when DB query fails', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: new Error('db down') }))
    const { GET } = await import('@/app/api/insights/route')
    const res = await GET()
    expect(res.status).toBe(500)
  })
})

describe('GET /api/insights — data shape', () => {
  it('returns null when no cached insights exist', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null }))
    const { GET } = await import('@/app/api/insights/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ data: null, error: null })
  })

  it('returns cached insights envelope', async () => {
    mockFrom.mockReturnValueOnce(
      makeChain({
        data: {
          insights: ['Pengeluaran naik 10%.', 'Cek subskripsi.'],
          generated_at: '2026-06-12T00:00:00.000Z',
          period_key: '2026-06-12',
        },
        error: null,
      })
    )
    const { GET } = await import('@/app/api/insights/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.error).toBeNull()
    expect(json.data.insights).toHaveLength(2)
    expect(json.data.periodKey).toBe('2026-06-12')
  })

  it('filters by authenticated user_id', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null }))
    const { GET } = await import('@/app/api/insights/route')
    await GET()
    const chain = mockFrom.mock.results[0].value as { eq: ReturnType<typeof vi.fn> }
    const eqCalls = chain.eq.mock.calls
    expect(eqCalls.some((c: unknown[]) => c[0] === 'user_id' && c[1] === VALID_USER.id)).toBe(true)
  })
})
