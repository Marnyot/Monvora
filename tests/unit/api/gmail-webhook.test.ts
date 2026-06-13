import { describe, it, expect, vi, beforeEach } from 'vitest'

const TOKEN = 'secret-123'

const mockGetUserById = vi.fn()
const mockSyncUserGmail = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        getUserById: mockGetUserById,
      },
    },
  }),
}))

vi.mock('@/lib/gmail/sync', () => ({
  syncUserGmail: mockSyncUserGmail,
}))

vi.mock('@/lib/utils/google-token', () => ({
  getValidGoogleToken: vi.fn().mockResolvedValue('mock-access-token'),
}))

vi.mock('@/lib/gmail/watch', () => ({}))

function makeRequest(body: unknown, authToken: string | null = TOKEN): Request {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (authToken) headers.set('authorization', `Bearer ${authToken}`)
  return new Request('http://localhost:3000/api/sync/gmail/webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function encodePubSubData(emailAddress: string, historyId: string): string {
  const json = JSON.stringify({ emailAddress, historyId })
  return Buffer.from(json).toString('base64')
}

describe('POST /api/sync/gmail/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN = TOKEN
  })

  it('returns 503 when verification token env var is not set (auth bypass guard)', async () => {
    delete process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN
    const { POST } = await import('@/app/api/sync/gmail/webhook/route')

    const res = await POST(makeRequest(
      { message: { data: '', messageId: '1', publishTime: '' }, subscription: '' }
    ))

    expect(res.status).toBe(503)
  })

  it('returns 401 when authorization header is missing', async () => {
    const { POST } = await import('@/app/api/sync/gmail/webhook/route')

    const res = await POST(makeRequest(
      { message: { data: '', messageId: '1', publishTime: '' }, subscription: '' },
      null
    ))

    expect(res.status).toBe(401)
  })

  it('returns 401 when verification token does not match', async () => {
    const { POST } = await import('@/app/api/sync/gmail/webhook/route')

    const res = await POST(makeRequest(
      { message: { data: '', messageId: '1', publishTime: '' }, subscription: '' },
      'wrong-token'
    ))

    expect(res.status).toBe(401)
  })

  it('returns 400 when payload is missing message data', async () => {
    const { POST } = await import('@/app/api/sync/gmail/webhook/route')

    const res = await POST(makeRequest({
      message: { messageId: '1', publishTime: '' },
      subscription: '',
    }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when emailAddress or historyId is missing in decoded data', async () => {
    const { POST } = await import('@/app/api/sync/gmail/webhook/route')

    const res = await POST(makeRequest({
      message: { data: Buffer.from('{}').toString('base64'), messageId: '1', publishTime: '' },
      subscription: '',
    }))

    expect(res.status).toBe(400)
  })

  it('acknowledges notification when user is not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const { POST } = await import('@/app/api/sync/gmail/webhook/route')

    const res = await POST(makeRequest({
      message: {
        data: encodePubSubData('nonexistent@email.com', 'hist-123'),
        messageId: '1',
        publishTime: '',
      },
      subscription: '',
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.ack).toBe(true)
  })

  it('calls syncUserGmail when valid notification arrives for known user', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-123', gmail_watch_history_id: 'hist-old' },
        error: null,
      }),
    })
    mockSyncUserGmail.mockResolvedValue({ emailsProcessed: 2, transactionsCreated: 1 })

    const { POST } = await import('@/app/api/sync/gmail/webhook/route')

    const res = await POST(makeRequest({
      message: {
        data: encodePubSubData('user@email.com', 'hist-456'),
        messageId: '1',
        publishTime: '',
      },
      subscription: '',
    }))

    expect(res.status).toBe(200)
    expect(mockSyncUserGmail).toHaveBeenCalledWith(
      expect.anything(),
      'user-123',
      'mock-access-token'
    )
  })

  it('skips sync when historyId has not changed (duplicate notification)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-123', gmail_watch_history_id: 'hist-same' },
        error: null,
      }),
    })

    const { POST } = await import('@/app/api/sync/gmail/webhook/route')

    const res = await POST(makeRequest({
      message: {
        data: encodePubSubData('user@email.com', 'hist-same'),
        messageId: '1',
        publishTime: '',
      },
      subscription: '',
    }))

    expect(res.status).toBe(200)
    expect(mockSyncUserGmail).not.toHaveBeenCalled()
  })
})
