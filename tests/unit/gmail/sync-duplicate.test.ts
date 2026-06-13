import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SyncResult } from '@/lib/gmail/sync'

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mockFetchNewEmails = vi.fn()
const mockIsBankEmail = vi.fn()
const mockDetectAndParse = vi.fn()

vi.mock('@/lib/gmail/client', () => ({
  fetchNewEmails: (...args: unknown[]) => mockFetchNewEmails(...args),
  isBankEmail: (email: unknown) => mockIsBankEmail(email),
  GmailTokenExpiredError: class GmailTokenExpiredError extends Error {
    constructor() {
      super('Gmail token expired or revoked')
      this.name = 'GmailTokenExpiredError'
    }
  },
  GmailRateLimitError: class GmailRateLimitError extends Error {
    retryAfter = 60
    constructor() { super('rate limit'); this.name = 'GmailRateLimitError' }
  },
  GmailAPIError: class GmailAPIError extends Error {
    constructor(msg: string) {
      super(`Gmail API error: ${msg}`)
      this.name = 'GmailAPIError'
    }
  },
}))

vi.mock('@/lib/gmail/parsers/index', () => ({
  detectAndParse: (email: unknown) => mockDetectAndParse(email),
  detectAndParseWithAi: async (email: unknown) => mockDetectAndParse(email),
  registerParser: vi.fn(),
}))

// ─── Supabase mock factory ──────────────────────────────────────────────────────

type ChainResult = { data: unknown; error: unknown }

function makeQueryChain(result: ChainResult) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is', 'update', 'insert', 'limit', 'order']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain['single'] = vi.fn().mockResolvedValue(result)
  chain['maybeSingle'] = vi.fn().mockResolvedValue(result)
  chain['then'] = (onFulfilled: (v: ChainResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected)
  return chain
}

const DEFAULT_WALLETS = [{ id: 'wallet-001', name: 'Mandiri', provider: 'mandiri', balance: 1000000 }]

function makeSupabaseMock(overrides: {
  insertResult?: ChainResult
  logResult?: ChainResult
} = {}) {
  const insertResult = overrides.insertResult ?? { data: [{ id: 'tx-new' }], error: null }
  const logResult = overrides.logResult ?? { data: { id: 'sync-log-001' }, error: null }

  const tableCallCounts: Record<string, number> = {}

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    tableCallCounts[table] = (tableCallCounts[table] ?? 0) + 1
    const callNum = tableCallCounts[table]

    if (table === 'profiles') {
      const chain = makeQueryChain({ data: { gmail_sync_token: null, gmail_sync_enabled: true }, error: null })
      chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
      return chain
    }

    if (table === 'transactions') {
      const chain: Record<string, unknown> = {}
      const methods = ['select', 'eq', 'is', 'limit', 'order']
      methods.forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain) })
      chain['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null })
      const insertChain = makeQueryChain(insertResult)
      chain['insert'] = vi.fn().mockReturnValue(insertChain)
      return chain
    }

    if (table === 'wallets') {
      const chain = makeQueryChain({ data: DEFAULT_WALLETS, error: null })
      chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
      return chain
    }

    if (table === 'gmail_sync_logs') {
      // callNum 1 = concurrency guard (maybeSingle) → no running log
      if (callNum === 1) return makeQueryChain({ data: null, error: null })
      const chain = makeQueryChain(logResult)
      chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
      return chain
    }

    return makeQueryChain({ data: null, error: null })
  })

  return { from: mockFrom }
}

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const MOCK_USER_ID = 'user-abc-123'
const MOCK_ACCESS_TOKEN = 'mock-access-token'

function makeMockEmail(id = 'email-001') {
  return {
    id,
    threadId: `thread-${id}`,
    subject: 'Notifikasi Transaksi',
    from: 'notifikasi@bankmandiri.co.id',
    body: 'Debit Rp 150.000',
    date: '2024-01-15T10:30:00+07:00',
    snippet: 'Debit Rp 150.000',
  }
}

function makeParsedTransaction(emailId = 'email-001') {
  return {
    transaction: {
      amount: 150000,
      type: 'expense' as const,
      merchant_name: 'Grab',
      description: 'Pembayaran Grab',
      payment_method: 'transfer' as const,
      transacted_at: new Date('2024-01-15T10:30:00+07:00'),
      reference_number: 'REF123',
      raw_email_id: emailId,
      raw_snippet: 'Debit Rp 150.000',
      confidence: 0.9,
      bank: 'mandiri',
    },
    error: null,
    bank: 'mandiri',
  }
}

// ─── Duplicate Detection Tests (via DB unique constraint + 23505) ─────────────
//
// Duplicate detection no longer uses a SELECT check (removed).
// The DB unique index on (user_id, raw_email_id) WHERE deleted_at IS NULL
// returns error code 23505 when a duplicate is inserted.
// syncUserGmail must count 23505 as transactionsSkipped, not errors.

describe('syncUserGmail — Duplicate Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should skip email when insert returns 23505 (DB unique constraint violation)', async () => {
    const email = makeMockEmail('email-duplicate-001')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-100' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTransaction('email-duplicate-001'))

    const supabase = makeSupabaseMock({
      insertResult: { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } },
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(0)
    expect(result.transactionsSkipped).toBe(1)
    expect(result.errors).toBe(0)
  })

  it('should process email when insert succeeds (new email, no duplicate)', async () => {
    const email = makeMockEmail('email-new-001')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-200' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTransaction('email-new-001'))

    const supabase = makeSupabaseMock({
      insertResult: { data: [{ id: 'tx-new-001' }], error: null },
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(1)
    expect(result.transactionsSkipped).toBe(0)
    expect(result.errors).toBe(0)
  })

  it('should increment transactionsSkipped for each 23505 (multiple duplicates)', async () => {
    const email1 = makeMockEmail('email-dup-1')
    const email2 = makeMockEmail('email-dup-2')
    const email3 = makeMockEmail('email-new-1')

    mockFetchNewEmails.mockResolvedValue({
      messages: [email1, email2, email3],
      newHistoryId: 'hist-300',
    })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockImplementation((email: { id: string }) =>
      makeParsedTransaction(email.id)
    )

    // First two inserts return 23505; third succeeds
    let insertCallCount = 0
    const tableCallCounts: Record<string, number> = {}

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      tableCallCounts[table] = (tableCallCounts[table] ?? 0) + 1
      const callNum = tableCallCounts[table]

      if (table === 'profiles') {
        const chain = makeQueryChain({ data: { gmail_sync_token: null, gmail_sync_enabled: true }, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      if (table === 'wallets') {
        const chain = makeQueryChain({ data: DEFAULT_WALLETS, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      if (table === 'transactions') {
        const txChain: Record<string, unknown> = {}
        const methods = ['select', 'eq', 'is', 'limit', 'order']
        methods.forEach(m => { txChain[m] = vi.fn().mockReturnValue(txChain) })
        txChain['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null })
        txChain['insert'] = vi.fn().mockImplementation(() => {
          insertCallCount++
          const result: ChainResult =
            insertCallCount <= 2
              ? { data: null, error: { code: '23505', message: 'duplicate key' } }
              : { data: [{ id: 'tx-new' }], error: null }
          return makeQueryChain(result)
        })
        return txChain
      }
      if (table === 'gmail_sync_logs') {
        if (callNum === 1) return makeQueryChain({ data: null, error: null })
        const chain = makeQueryChain({ data: { id: 'log-001' }, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      return makeQueryChain({ data: null, error: null })
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail({ from: mockFrom } as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsSkipped).toBe(2)
    expect(result.transactionsCreated).toBe(1)
    expect(result.errors).toBe(0)
  })

  it('should NOT increment transactionsCreated when 23505 is returned', async () => {
    const email = makeMockEmail('email-dup-final')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-400' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTransaction('email-dup-final'))

    const supabase = makeSupabaseMock({
      insertResult: { data: null, error: { code: '23505', message: 'duplicate key' } },
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(0)
    expect(result.transactionsSkipped).toBe(1)
  })

  it('should call insert with raw_email_id so the DB constraint can detect duplicates', async () => {
    const email = makeMockEmail('email-with-raw-id')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-500' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTransaction('email-with-raw-id'))

    const insertSpy = vi.fn().mockReturnValue(makeQueryChain({ data: [{ id: 'tx-001' }], error: null }))
    const tableCallCounts: Record<string, number> = {}

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      tableCallCounts[table] = (tableCallCounts[table] ?? 0) + 1
      const callNum = tableCallCounts[table]

      if (table === 'profiles') {
        const chain = makeQueryChain({ data: { gmail_sync_token: null, gmail_sync_enabled: true }, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      if (table === 'wallets') {
        const chain = makeQueryChain({ data: DEFAULT_WALLETS, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      if (table === 'transactions') {
        const txChain: Record<string, unknown> = {}
        const methods = ['select', 'eq', 'is', 'limit', 'order']
        methods.forEach(m => { txChain[m] = vi.fn().mockReturnValue(txChain) })
        txChain['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null })
        txChain['insert'] = insertSpy
        return txChain
      }
      if (table === 'gmail_sync_logs') {
        if (callNum === 1) return makeQueryChain({ data: null, error: null })
        const chain = makeQueryChain({ data: { id: 'log-001' }, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      return makeQueryChain({ data: null, error: null })
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await syncUserGmail({ from: mockFrom } as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    // Verify insert was called with raw_email_id so DB constraint can enforce uniqueness
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ raw_email_id: 'email-with-raw-id' })
    )
  })

  it('should continue processing remaining emails after encountering a 23505 skip', async () => {
    const email1 = makeMockEmail('email-dup')
    const email2 = makeMockEmail('email-new')

    mockFetchNewEmails.mockResolvedValue({
      messages: [email1, email2],
      newHistoryId: 'hist-600',
    })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockImplementation((email: { id: string }) =>
      makeParsedTransaction(email.id)
    )

    let insertCallCount = 0
    const tableCallCounts: Record<string, number> = {}

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      tableCallCounts[table] = (tableCallCounts[table] ?? 0) + 1
      const callNum = tableCallCounts[table]

      if (table === 'profiles') {
        const chain = makeQueryChain({ data: { gmail_sync_token: null, gmail_sync_enabled: true }, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      if (table === 'wallets') {
        const chain = makeQueryChain({ data: DEFAULT_WALLETS, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      if (table === 'transactions') {
        const txChain: Record<string, unknown> = {}
        const methods = ['select', 'eq', 'is', 'limit', 'order']
        methods.forEach(m => { txChain[m] = vi.fn().mockReturnValue(txChain) })
        txChain['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null })
        txChain['insert'] = vi.fn().mockImplementation(() => {
          insertCallCount++
          const result: ChainResult =
            insertCallCount === 1
              ? { data: null, error: { code: '23505', message: 'duplicate key' } }
              : { data: [{ id: 'tx-new' }], error: null }
          return makeQueryChain(result)
        })
        return txChain
      }
      if (table === 'gmail_sync_logs') {
        if (callNum === 1) return makeQueryChain({ data: null, error: null })
        const chain = makeQueryChain({ data: { id: 'log-001' }, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      return makeQueryChain({ data: null, error: null })
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail({ from: mockFrom } as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsSkipped).toBe(1)
    expect(result.transactionsCreated).toBe(1)
    expect(insertCallCount).toBe(2) // both emails attempted insert
  })
})
