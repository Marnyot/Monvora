import { describe, it, expect, vi, beforeEach } from 'vitest'

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

function chain(result: unknown) {
  const c: Record<string, unknown> = {}
  ;['insert', 'select', 'eq'].forEach((m) => {
    c[m] = vi.fn().mockReturnValue(c)
  })
  c.single = vi.fn().mockResolvedValue(result)
  return c
}

const VALID_USER = { id: 'user-feedback', email: 'u@example.com' }

const VALID_BODY = {
  category: 'bug',
  body: 'Quick entry sheet tidak menutup setelah submit di Android Chrome',
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') })

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(VALID_BODY),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
    const { checkRateLimit } = await import('@/lib/utils/rate-limit')
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, retryAfter: 60 })

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(VALID_BODY),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(429)
  })

  it('returns 422 on Zod validation failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ category: 'bug', body: 'hi' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(422)
  })

  it('returns 400 on invalid JSON', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        body: 'not json',
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
  })

  it('inserts feedback and returns 201 with id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
    const insertChain = chain({
      data: { id: 'fb-uuid', created_at: '2026-06-13T12:00:00Z' },
      error: null,
    })
    mockFrom.mockReturnValueOnce(insertChain)

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(VALID_BODY),
        headers: { 'content-type': 'application/json' },
      })
    )

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe('fb-uuid')
    expect(json.error).toBeNull()

    // Verify user_id was set from session, not body
    const insertCall = (insertChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(insertCall.user_id).toBe('user-feedback')
  })

  it('does not leak DB error to client', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
    const failChain = chain({
      data: null,
      error: { message: 'duplicate key constraint xyz', code: '23505' },
    })
    mockFrom.mockReturnValueOnce(failChain)

    const { POST } = await import('@/app/api/feedback/route')
    const res = await POST(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(VALID_BODY),
        headers: { 'content-type': 'application/json' },
      })
    )

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error.message).not.toContain('duplicate')
    expect(json.error.message).not.toContain('23505')
    expect(typeof json.error.errorId).toBe('string')
  })
})
