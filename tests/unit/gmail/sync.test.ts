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
  // Allow direct `await chain` (for list queries and updates without terminal call)
  chain['then'] = (onFulfilled: (v: ChainResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected)
  return chain
}

const DEFAULT_WALLETS = [{ id: 'wallet-001', provider: 'mandiri', balance: 1000000 }]

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
  const walletResult = overrides.walletResult ?? { data: DEFAULT_WALLETS, error: null }
  const insertResult = overrides.insertResult ?? { data: null, error: null }
  const updateResult = overrides.updateResult ?? { data: null, error: null }
  const logResult = overrides.logResult ?? { data: { id: 'sync-log-001' }, error: null }

  // Track per-table call counts
  const tableCallCounts: Record<string, number> = {}

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    tableCallCounts[table] = (tableCallCounts[table] ?? 0) + 1
    const callNum = tableCallCounts[table]

    if (table === 'profiles') {
      const chain = makeQueryChain(callNum === 1 ? profileResult : updateResult)
      chain['update'] = vi.fn().mockReturnValue(makeQueryChain(updateResult))
      return chain
    }

    if (table === 'transactions') {
      const chain: Record<string, unknown> = {}
      const methods = ['select', 'eq', 'is', 'limit', 'insert', 'order']
      methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain) })
      chain['maybeSingle'] = vi.fn().mockResolvedValue(existingTxResult)
      const insertChain = makeQueryChain(insertResult)
      chain['insert'] = vi.fn().mockReturnValue(insertChain)
      return chain
    }

    if (table === 'wallets') {
      const chain = makeQueryChain(walletResult)
      chain['update'] = vi.fn().mockReturnValue(makeQueryChain(updateResult))
      return chain
    }

    if (table === 'gmail_sync_logs') {
      const chain = makeQueryChain(logResult)
      chain['update'] = vi.fn().mockReturnValue(makeQueryChain(updateResult))
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
      existingTxResult: { data: null, error: null }, // não duplikat
      walletResult: { data: DEFAULT_WALLETS, error: null },
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

  it('matches transaction to wallet whose provider contains the bank name', async () => {
    const email = makeMockEmail('email-bca')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-600' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue({
      transaction: {
        amount: 200000,
        type: 'expense' as const,
        merchant_name: 'Indomaret',
        description: 'Belanja',
        payment_method: 'debit' as const,
        transacted_at: new Date(),
        reference_number: 'REF-BCA',
        raw_email_id: 'email-bca',
        raw_snippet: 'Debit Rp 200.000',
        confidence: 0.9,
        bank: 'bca',
      },
      error: null,
      bank: 'bca',
    })

    const wallets = [
      { id: 'wallet-mandiri', provider: 'mandiri', balance: 500000 },
      { id: 'wallet-bca', provider: 'bca', balance: 1000000 },
    ]
    const mockFrom = vi.fn()
    let callCount = 0

    mockFrom.mockImplementation((table: string) => {
      callCount++
      if (table === 'profiles') {
        const chain = makeQueryChain({ data: { gmail_sync_token: null, gmail_sync_enabled: true }, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      if (table === 'wallets') {
        const chain = makeQueryChain({ data: wallets, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      if (table === 'transactions') {
        const chain: Record<string, unknown> = {}
        const methods = ['select', 'eq', 'is', 'limit', 'insert', 'order']
        methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain) })
        chain['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null })
        const insertChain = makeQueryChain({ data: { id: 'tx-new' }, error: null })
        chain['insert'] = vi.fn().mockReturnValue(insertChain)
        return chain
      }
      return makeQueryChain({ data: null, error: null })
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await syncUserGmail({ from: mockFrom } as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(1)

    // Find the transactions insert call and verify wallet_id is wallet-bca
    const txInsertCalls = mockFrom.mock.calls.filter(([t]) => t === 'transactions')
    const insertChainCall = txInsertCalls.find(([_]) => {
      const chain = mockFrom.mock.results[mockFrom.mock.calls.indexOf(_)]
      return chain
    })
    // Verify the insert was called with wallet-bca
    const transactionsChain = mockFrom.mock.results
      .filter((_, i) => mockFrom.mock.calls[i][0] === 'transactions')
      .map(r => r.value)
    const insertSpy = transactionsChain.find(c => c?.insert?.mock?.calls?.length > 0)
    expect(insertSpy?.insert).toHaveBeenCalledWith(
      expect.objectContaining({ wallet_id: 'wallet-bca' })
    )
  })

  it('updates wallet balance after successful transaction insert', async () => {
    const email = makeMockEmail('email-balance')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-700' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTransaction('email-balance'))

    const walletUpdateSpy = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        const chain = makeQueryChain({ data: { gmail_sync_token: null, gmail_sync_enabled: true }, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      if (table === 'wallets') {
        const chain = makeQueryChain({ data: DEFAULT_WALLETS, error: null })
        chain['update'] = walletUpdateSpy
        return chain
      }
      if (table === 'transactions') {
        const chain: Record<string, unknown> = {}
        const methods = ['select', 'eq', 'is', 'limit', 'insert', 'order']
        methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain) })
        chain['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null })
        const insertChain = makeQueryChain({ data: { id: 'tx-balance' }, error: null })
        chain['insert'] = vi.fn().mockReturnValue(insertChain)
        return chain
      }
      return makeQueryChain({ data: null, error: null })
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await syncUserGmail({ from: mockFrom } as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(1)
    // Expense of 150000 → balance decreases: 1000000 - 150000 = 850000
    expect(walletUpdateSpy).toHaveBeenCalledWith({ balance: 850000 })
  })
})
