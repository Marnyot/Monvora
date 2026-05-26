import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal chainable Supabase query builder mock
function makeChain(finalResult: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is', 'update', 'insert', 'order', 'limit', 'range', 'gte', 'lte', 'or']
  methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain) })
  chain['single'] = vi.fn().mockResolvedValue(finalResult)
  // Juga simulate promise resolution untuk query yang tidak pakai single()
  chain.then = vi.fn(async (onFulfilled: any) => {
    return onFulfilled(finalResult)
  })
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

const mockGetValidGoogleToken = vi.fn().mockResolvedValue('google-access-token-xyz')

vi.mock('@/lib/utils/google-token', () => ({
  getValidGoogleToken: (...args: unknown[]) => mockGetValidGoogleToken(...args),
}))

vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
}))

const mockInngestSend = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/inngest/client', () => ({
  inngest: { send: (...args: unknown[]) => mockInngestSend(...args) },
}))

const mockSyncUserGmail = vi.fn().mockResolvedValue({
  emailsProcessed: 5,
  transactionsCreated: 3,
  transactionsSkipped: 2,
  errors: 0,
  newHistoryId: 'hist-500',
})

vi.mock('@/lib/gmail/sync', () => ({
  syncUserGmail: (...args: unknown[]) => mockSyncUserGmail(...args),
}))

const VALID_USER = {
  id: 'user-abc',
  email: 'user@example.com',
  identities: [{ provider: 'google', identity_data: {} }]
}

const VALID_PROFILE = {
  id: 'user-abc',
  gmail_sync_enabled: true,
  gmail_last_synced_at: '2026-05-25T10:00:00+07:00',
  google_access_token: 'stored-access-token',
  google_refresh_token: 'stored-refresh-token',
  google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
}

describe('POST /api/sync/gmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()

  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') })

    const { POST } = await import('@/app/api/sync/gmail/route')
    const req = new Request('http://localhost/api/sync/gmail', { method: 'POST' })
    const res = await POST(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 when gmail_sync_enabled is false', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })

    // First query (profile) returns gmail_sync_enabled = false
    const profileChain = makeChain({
      data: { id: 'user-abc', gmail_sync_enabled: false },
      error: null,
    })
    mockFrom.mockReturnValueOnce(profileChain)

    const { POST } = await import('@/app/api/sync/gmail/route')
    const req = new Request('http://localhost/api/sync/gmail', { method: 'POST' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('GMAIL_NOT_ENABLED')
  })

  it('returns 400 when no Google OAuth token is available', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })

    const profileChain = makeChain({ data: VALID_PROFILE, error: null })
    mockFrom.mockReturnValueOnce(profileChain)

    mockGetValidGoogleToken.mockResolvedValueOnce(null)

    const { POST } = await import('@/app/api/sync/gmail/route')
    const req = new Request('http://localhost/api/sync/gmail', { method: 'POST' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('NO_GOOGLE_TOKEN')
  })

  it('returns 200 and sync result on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })

    const profileChain = makeChain({ data: VALID_PROFILE, error: null })
    mockFrom.mockReturnValueOnce(profileChain)
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null }))

    mockSyncUserGmail.mockResolvedValueOnce({
      emailsProcessed: 5,
      transactionsCreated: 3,
      transactionsSkipped: 2,
      errors: 0,
      newHistoryId: 'hist-500',
    })

    const { POST } = await import('@/app/api/sync/gmail/route')
    const req = new Request('http://localhost/api/sync/gmail', { method: 'POST' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.error).toBeNull()
    expect(json.data.emailsProcessed).toBe(5)
    expect(json.data.transactionsCreated).toBe(3)
  })

  it('returns 500 when sync throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })

    const profileChain = makeChain({ data: VALID_PROFILE, error: null })
    mockFrom.mockReturnValueOnce(profileChain)
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null }))

    mockSyncUserGmail.mockRejectedValueOnce(new Error('Gmail API error'))

    const { POST } = await import('@/app/api/sync/gmail/route')
    const req = new Request('http://localhost/api/sync/gmail', { method: 'POST' })
    const res = await POST(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error.code).toBe('SYNC_ERROR')
  })

  it('returns 429 when rate limited', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })

    const profileChain = makeChain({ data: VALID_PROFILE, error: null })
    mockFrom.mockReturnValueOnce(profileChain)

    const { checkRateLimit } = await import('@/lib/utils/rate-limit')
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, retryAfter: 240 })

    const { POST } = await import('@/app/api/sync/gmail/route')
    const req = new Request('http://localhost/api/sync/gmail', { method: 'POST' })
    const res = await POST(req)

    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error.code).toBe('RATE_LIMIT')
  })
})

describe('GET /api/sync/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') })

    const { GET } = await import('@/app/api/sync/status/route')
    const req = new Request('http://localhost/api/sync/status', { method: 'GET' })
    const res = await GET(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 200 with profile and logs on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })

    // Profile chain — single() returns the profile directly
    const profileChain = makeChain({
      data: VALID_PROFILE,
      error: null,
    })
    mockFrom.mockReturnValueOnce(profileChain)

    // Logs chain — returns array of logs
    const logsChain = makeChain({
      data: [
        {
          id: 'log-1',
          status: 'success',
          emails_scanned: 10,
          transactions_created: 5,
          started_at: '2026-05-25T10:00:00+07:00',
          completed_at: '2026-05-25T10:01:00+07:00',
        },
      ],
      error: null,
    })
    mockFrom.mockReturnValueOnce(logsChain)

    const { GET } = await import('@/app/api/sync/status/route')
    const req = new Request('http://localhost/api/sync/status', { method: 'GET' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.error).toBeNull()
    expect(json.data.gmail_sync_enabled).toBe(true)
    expect(json.data.recent_logs).toHaveLength(1)
    expect(json.data.recent_logs[0].status).toBe('success')
  })

  it('returns empty logs array when no logs exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })

    const profileChain = makeChain({
      data: VALID_PROFILE,
      error: null,
    })
    mockFrom.mockReturnValueOnce(profileChain)

    const logsChain = makeChain({
      data: [],
      error: null,
    })
    mockFrom.mockReturnValueOnce(logsChain)

    const { GET } = await import('@/app/api/sync/status/route')
    const req = new Request('http://localhost/api/sync/status', { method: 'GET' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.recent_logs).toEqual([])
  })

  it('returns 429 when rate limited', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })

    const { checkRateLimit } = await import('@/lib/utils/rate-limit')
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, retryAfter: 45 })

    const { GET } = await import('@/app/api/sync/status/route')
    const req = new Request('http://localhost/api/sync/status', { method: 'GET' })
    const res = await GET(req)

    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error.code).toBe('RATE_LIMIT')
  })
})
