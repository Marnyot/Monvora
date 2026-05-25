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
  // Allow direct `await chain` (for list queries and updates without terminal call)
  chain['then'] = (onFulfilled: (v: ChainResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected)
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
  const walletResult = overrides.walletResult ?? { data: [{ id: 'wallet-001', provider: 'mandiri', balance: 1000000 }], error: null }
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
      methods.forEach((m) => {
        chain[m] = vi.fn().mockReturnValue(chain)
      })
      chain['maybeSingle'] = vi.fn().mockResolvedValue(existingTxResult)
      chain['insert'] = vi.fn().mockResolvedValue(insertResult)
      // Allow chaining after insert
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

// ─── Duplicate Detection Tests ──────────────────────────────────────────────────

describe('syncUserGmail — Duplicate Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should skip email when raw_email_id already exists in database', async () => {
    const email = makeMockEmail('email-duplicate-001')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-100' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTransaction('email-duplicate-001'))

    const supabase = makeSupabaseMock({
      // Simulate: raw_email_id already exists in transactions table
      existingTxResult: { data: { id: 'tx-existing-001' }, error: null },
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    // Email should be marked as skipped, not created
    expect(result.transactionsCreated).toBe(0)
    expect(result.transactionsSkipped).toBe(1)
    expect(result.errors).toBe(0)
  })

  it('should process email when raw_email_id does NOT exist (new email)', async () => {
    const email = makeMockEmail('email-new-001')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-200' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTransaction('email-new-001'))

    const supabase = makeSupabaseMock({
      // Simulate: raw_email_id does NOT exist (maybeSingle returns null)
      existingTxResult: { data: null, error: null },
      walletResult: { data: [{ id: 'wallet-001', provider: 'mandiri', balance: 1000000 }], error: null },
      insertResult: { data: { id: 'tx-new-001' }, error: null },
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    // New email should be processed and created
    expect(result.transactionsCreated).toBe(1)
    expect(result.transactionsSkipped).toBe(0)
    expect(result.errors).toBe(0)
  })

  it('should increment transactionsSkipped for each duplicate email', async () => {
    // Simulate 3 emails: 2 duplicates + 1 new
    const email1 = makeMockEmail('email-dup-1')
    const email2 = makeMockEmail('email-dup-2')
    const email3 = makeMockEmail('email-new-1')

    mockFetchNewEmails.mockResolvedValue({
      messages: [email1, email2, email3],
      newHistoryId: 'hist-300',
    })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTransaction())

    // Mock: first two exist, third does not
    let callCount = 0
    const supabase = makeSupabaseMock()
    const originalFrom = supabase.from as any

    supabase.from = vi.fn().mockImplementation((table: string) => {
      const result = originalFrom(table)

      if (table === 'transactions') {
        // Modify maybeSingle to return duplicate for first 2 calls
        const originalMaybeSingle = result.maybeSingle
        result.maybeSingle = vi.fn().mockImplementation(() => {
          callCount++
          if (callCount <= 2) {
            return Promise.resolve({ data: { id: 'existing-tx' }, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        })
      }

      return result
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    // 2 duplicates skipped, 1 new created
    expect(result.transactionsSkipped).toBe(2)
    expect(result.transactionsCreated).toBe(1)
  })

  it('should NOT increment transactionsCreated when duplicate is found', async () => {
    const email = makeMockEmail('email-dup-final')
    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-400' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTransaction('email-dup-final'))

    const supabase = makeSupabaseMock({
      existingTxResult: { data: { id: 'tx-existing-final' }, error: null },
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    // Verify transactionsCreated is not incremented for duplicate
    expect(result.transactionsCreated).toBe(0)
    expect(result.transactionsSkipped).toBe(1)
  })

  it('should check for duplicates using raw_email_id field from parsed transaction', async () => {
    const email = makeMockEmail('email-with-raw-id')
    const parsed = makeParsedTransaction('email-with-raw-id')

    mockFetchNewEmails.mockResolvedValue({ messages: [email], newHistoryId: 'hist-500' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(parsed)

    // Create a spy supabase to track the duplicate check query
    const checkDuplicateSpy = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })
    const supabase = makeSupabaseMock()
    const originalFrom = supabase.from as any

    let checkDuplicateQueried = false

    supabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'transactions') {
        const result = originalFrom(table)
        const originalMaybeSingle = result.maybeSingle
        result.maybeSingle = vi.fn().mockImplementation(() => {
          checkDuplicateQueried = true
          return originalMaybeSingle()
        })
        return result
      }
      return originalFrom(table)
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    // Verify duplicate check was performed
    expect(checkDuplicateQueried).toBe(true)
  })

  it('should continue processing remaining emails after encountering duplicate', async () => {
    const email1 = makeMockEmail('email-dup')
    const email2 = makeMockEmail('email-new')

    mockFetchNewEmails.mockResolvedValue({
      messages: [email1, email2],
      newHistoryId: 'hist-600',
    })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockImplementation((email: any) => {
      if (email.id === 'email-dup') {
        return makeParsedTransaction('email-dup')
      }
      return makeParsedTransaction('email-new')
    })

    let duplicateCheckCount = 0
    const supabase = makeSupabaseMock()
    const originalFrom = supabase.from as any

    supabase.from = vi.fn().mockImplementation((table: string) => {
      const result = originalFrom(table)
      if (table === 'transactions') {
        const originalMaybeSingle = result.maybeSingle
        result.maybeSingle = vi.fn().mockImplementation(() => {
          duplicateCheckCount++
          if (duplicateCheckCount === 1) {
            // First email is duplicate
            return Promise.resolve({ data: { id: 'existing' }, error: null })
          }
          // Second email is new
          return Promise.resolve({ data: null, error: null })
        })
      }
      return result
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: SyncResult = await syncUserGmail(supabase as any, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    // Should continue and process the second email
    expect(result.transactionsSkipped).toBe(1)
    expect(result.transactionsCreated).toBe(1)
    expect(duplicateCheckCount).toBe(2) // Both emails were checked
  })
})
