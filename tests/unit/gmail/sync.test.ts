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
  GmailAPIError: class GmailAPIError extends Error {
    constructor(msg: string) {
      super(`Gmail API error: ${msg}`)
      this.name = 'GmailAPIError'
    }
  },
}))

vi.mock('@/lib/gmail/parsers/index', () => ({
  detectAndParse: (email: unknown) => mockDetectAndParse(email),
  registerParser: () => {}, // no-op for tests
}))

// ─── Supabase mock factory ──────────────────────────────────────────────────────

type ChainResult = { data: unknown; error: unknown }

function makeQueryChain(result: ChainResult) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is', 'update', 'insert', 'limit', 'order']
  methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain) })
  chain['single'] = vi.fn().mockResolvedValue(result)
  chain['maybeSingle'] = vi.fn().mockResolvedValue(result)
  return chain
}

function makeSupabaseMock(overrides: {
  profileResult?: ChainResult
  existingTxResult?: ChainResult
  walletResult?: ChainResult
  insertResult?: ChainResult
  updateResult?: ChainResult
  logResult?: ChainResult
} = {}) {
  const profileResult = overrides.profileResult ?? {
    data: { gmail_sync_token: null, gmail_sync_enabled: true },
    error: null,
  }
  const existingTxResult = overrides.existingTxResult ?? { data: null, error: null }
  const walletResult = overrides.walletResult ?? { data: { id: 'wallet-001' }, error: null }
  const insertResult = overrides.insertResult ?? { data: null, error: null }
  const updateResult = overrides.updateResult ?? { data: null, error: null }
  const logResult = overrides.logResult ?? { data: null, error: null }

  // Track call count to route from() calls in sequence
  let fromCallCount = 0

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    fromCallCount++

    if (table === 'profiles') {
      // Could be select or update
      const chain = makeQueryChain(
        fromCallCount === 1 ? profileResult : updateResult
      )
      chain['update'] = vi.fn().mockReturnValue(makeQueryChain(updateResult))
      return chain
    }

    if (table === 'transactions') {
      // Could be check-duplicate (select) or insert
      const chain: Record<string, unknown> = {}
      const methods = ['select', 'eq', 'is', 'limit', 'insert', 'order']
      methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain) })
      chain['maybeSingle'] = vi.fn().mockResolvedValue(existingTxResult)
      chain['insert'] = vi.fn().mockResolvedValue(insertResult)
      // Allow chaining after insert
      const insertChain = makeQueryChain(insertResult)
      chain['insert'] = vi.fn().mockReturnValue(insertChain)
      return chain
    }

    if (table === 'wallets') {
      return makeQueryChain(walletResult)
    }

    if (table === 'gmail_sync_logs') {
      return makeQueryChain(logResult)
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

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('syncUserGmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns empty result when no new emails are fetched', async () => {
    mockFetchNewEmails.mockResolvedValue({ messages: [], newHistoryId: 'hist-100' })
    mockIsBankEmail.mockReturnValue(false)

    const supabase = makeSupabaseMock()
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.emailsProcessed).toBe(0)
    expect(result.transactionsCreated).toBe(0)
    expect(result.transactionsSkipped).toBe(0)
    expect(result.errors).toBe(0)
    expect(result.newHistoryId).toBe('hist-100')
    expect(result.userId).toBe(MOCK_USER_ID)
  })

  it('creates transaction when email is parsed successfully', async () => {
    const email = makeMockEmail('email-001')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-200' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTransaction('email-001'))

    const supabase = makeSupabaseMock({
      existingTxResult: { data: null, error: null }, // tidak duplikat
      walletResult: { data: { id: 'wallet-001' }, error: null },
      insertResult: { data: { id: 'tx-001' }, error: null },
    })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.emailsProcessed).toBe(1)
    expect(result.transactionsCreated).toBe(1)
    expect(result.transactionsSkipped).toBe(0)
    expect(result.errors).toBe(0)
  })

  it('skips duplicate transaction when raw_email_id already exists', async () => {
    const email = makeMockEmail('email-dup')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-300' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTransaction('email-dup'))

    const supabase = makeSupabaseMock({
      existingTxResult: { data: { id: 'tx-existing' }, error: null }, // duplikat!
    })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(0)
    expect(result.transactionsSkipped).toBe(1)
    expect(result.errors).toBe(0)
  })

  it('increments errors count when parse returns no transaction', async () => {
    const email = makeMockEmail('email-unparse')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-400' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue({ transaction: null, error: 'No parser found', bank: null })

    const supabase = makeSupabaseMock({
      existingTxResult: { data: null, error: null },
    })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(0)
    // email that cannot be parsed is counted as skipped, not error
    expect(result.transactionsSkipped).toBe(1)
    expect(result.errors).toBe(0)
  })

  it('returns early and logs error when profile is not found', async () => {
    const supabase = makeSupabaseMock({
      profileResult: { data: null, error: new Error('not found') },
    })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.emailsProcessed).toBe(0)
    expect(result.transactionsCreated).toBe(0)
    // fetchNewEmails should not be called
    expect(mockFetchNewEmails).not.toHaveBeenCalled()
  })

  it('returns early when gmail_sync_enabled is false', async () => {
    const supabase = makeSupabaseMock({
      profileResult: { data: { gmail_sync_token: null, gmail_sync_enabled: false }, error: null },
    })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.emailsProcessed).toBe(0)
    expect(mockFetchNewEmails).not.toHaveBeenCalled()
  })

  it('handles GmailTokenExpiredError gracefully', async () => {
    const { GmailTokenExpiredError } = await import('@/lib/gmail/client')
    mockFetchNewEmails.mockRejectedValue(new GmailTokenExpiredError())

    const supabase = makeSupabaseMock()
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.emailsProcessed).toBe(0)
    expect(result.transactionsCreated).toBe(0)
    // Should not throw, handled gracefully
  })

  it('returns early when no active wallet found', async () => {
    const email = makeMockEmail('email-nowallet')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-500' })
    mockIsBankEmail.mockReturnValue(true)

    const supabase = makeSupabaseMock({
      walletResult: { data: null, error: null }, // tidak ada wallet
    })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(0)
    expect(result.errors).toBe(0)
  })

  it('uses lastHistoryId from profile for incremental sync', async () => {
    const SAVED_HISTORY_ID = 'hist-prev-123'
    const supabase = makeSupabaseMock({
      profileResult: {
        data: { gmail_sync_token: SAVED_HISTORY_ID, gmail_sync_enabled: true },
        error: null,
      },
    })
    mockFetchNewEmails.mockResolvedValue({ messages: [], newHistoryId: 'hist-new-456' })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    // fetchNewEmails should be called with the saved historyId
    expect(mockFetchNewEmails).toHaveBeenCalledWith(MOCK_ACCESS_TOKEN, SAVED_HISTORY_ID)
  })
})
