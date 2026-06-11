/**
 * Tests for two bugs in lib/gmail/sync.ts:
 *
 * Bug 1 — Wallet matching only checked `provider`, missed `name`.
 *         Also, defaultWallet was wallets[0] which could be cash/tunai.
 *
 * Bug 2 — Race condition: two concurrent syncs could both pass the
 *         application-level duplicate check and both insert. DB unique
 *         constraint returns 23505; sync must count that as skipped, not error.
 */

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
    constructor() { super('token expired'); this.name = 'GmailTokenExpiredError' }
  },
  GmailRateLimitError: class GmailRateLimitError extends Error {
    retryAfter = 60
    constructor() { super('rate limit'); this.name = 'GmailRateLimitError' }
  },
  GmailAPIError: class GmailAPIError extends Error {
    constructor(msg: string) { super(msg); this.name = 'GmailAPIError' }
  },
}))

vi.mock('@/lib/gmail/parsers/index', () => ({
  detectAndParse: (email: unknown) => mockDetectAndParse(email),
  registerParser: vi.fn(),
}))

// ─── Types & helpers ──────────────────────────────────────────────────────────

type WalletRow = { id: string; name: string | null; provider: string | null; balance: number }
type ChainResult = { data: unknown; error: unknown }

function makeQueryChain(result: ChainResult) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is', 'update', 'insert', 'limit', 'order', 'single']
  methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain) })
  chain['single'] = vi.fn().mockResolvedValue(result)
  chain['maybeSingle'] = vi.fn().mockResolvedValue(result)
  chain['then'] = (resolve: (v: ChainResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return chain
}

/**
 * Build a Supabase mock focused on wallet matching and insert behaviour.
 * Returns supabase mock + insert spy so callers can assert wallet_id used.
 */
function buildSupabase({
  wallets,
  insertResult = { data: [{ id: 'tx-001' }], error: null },
}: {
  wallets: WalletRow[]
  insertResult?: ChainResult
}) {
  const insertSpy = vi.fn().mockReturnValue(makeQueryChain(insertResult))

  let gmailLogCallCount = 0

  const from = vi.fn().mockImplementation((table: string) => {
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
      const txChain: Record<string, unknown> = {}
      const methods = ['select', 'eq', 'is', 'limit', 'order']
      methods.forEach(m => { txChain[m] = vi.fn().mockReturnValue(txChain) })
      txChain['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null })
      txChain['insert'] = insertSpy
      return txChain
    }

    if (table === 'gmail_sync_logs') {
      gmailLogCallCount++
      if (gmailLogCallCount === 1) {
        // Concurrency guard: no running log
        return makeQueryChain({ data: null, error: null })
      }
      // Insert started log
      const chain = makeQueryChain({ data: { id: 'log-001' }, error: null })
      chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
      return chain
    }

    return makeQueryChain({ data: null, error: null })
  })

  return { supabase: { from }, insertSpy }
}

const MOCK_USER_ID = 'user-wallet-test'
const MOCK_ACCESS_TOKEN = 'token-wallet-test'

function makeParsedTx(bank: string, emailId = 'email-001') {
  return {
    transaction: {
      amount: 100000,
      type: 'expense' as const,
      merchant_name: 'Test Merchant',
      description: null,
      payment_method: 'debit' as const,
      transacted_at: new Date('2026-06-01T10:00:00+07:00'),
      reference_number: 'REF-001',
      raw_email_id: emailId,
      raw_snippet: 'Debit Rp 100.000',
      confidence: 0.9,
      bank,
    },
    error: null,
    bank,
  }
}

// ─── Bug 1: Wallet Matching ──────────────────────────────────────────────────

describe('Wallet Matching — Bug 1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockFetchNewEmails.mockResolvedValue({ messages: [{ id: 'email-001' }], newHistoryId: 'h-1' })
    mockIsBankEmail.mockReturnValue(true)
  })

  it('matches wallet by name when provider is null (case-insensitive)', async () => {
    mockDetectAndParse.mockReturnValue(makeParsedTx('bca', 'email-001'))

    const wallets: WalletRow[] = [
      { id: 'wallet-bca', name: 'BCA Utama', provider: null, balance: 1000000 },
      { id: 'wallet-mandiri', name: 'Mandiri', provider: 'mandiri', balance: 500000 },
    ]
    const { supabase, insertSpy } = buildSupabase({ wallets })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    const result: SyncResult = await syncUserGmail(supabase as never, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(1)
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ wallet_id: 'wallet-bca' })
    )
  })

  it('matches wallet by provider name (case-insensitive, existing behaviour)', async () => {
    mockDetectAndParse.mockReturnValue(makeParsedTx('mandiri', 'email-001'))

    const wallets: WalletRow[] = [
      { id: 'wallet-bca', name: 'BCA Utama', provider: 'bca', balance: 1000000 },
      { id: 'wallet-mandiri', name: 'Mandiri', provider: 'mandiri', balance: 500000 },
    ]
    const { supabase, insertSpy } = buildSupabase({ wallets })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    const result: SyncResult = await syncUserGmail(supabase as never, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(1)
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ wallet_id: 'wallet-mandiri' })
    )
  })

  it('wallet name match takes precedence even with partial bank name in name', async () => {
    mockDetectAndParse.mockReturnValue(makeParsedTx('bri', 'email-001'))

    const wallets: WalletRow[] = [
      { id: 'wallet-tunai', name: 'Tunai', provider: null, balance: 50000 },
      { id: 'wallet-bri', name: 'BRI Tabungan', provider: null, balance: 800000 },
    ]
    const { supabase, insertSpy } = buildSupabase({ wallets })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    const result: SyncResult = await syncUserGmail(supabase as never, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(1)
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ wallet_id: 'wallet-bri' })
    )
  })

  it('default wallet skips cash/tunai wallets when no bank matches', async () => {
    mockDetectAndParse.mockReturnValue(makeParsedTx('unknown-bank', 'email-001'))

    // First wallet is Tunai, second is a real bank — default should pick the real bank
    const wallets: WalletRow[] = [
      { id: 'wallet-tunai', name: 'Tunai', provider: null, balance: 50000 },
      { id: 'wallet-bca', name: 'BCA Utama', provider: 'bca', balance: 1000000 },
    ]
    const { supabase, insertSpy } = buildSupabase({ wallets })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    const result: SyncResult = await syncUserGmail(supabase as never, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsCreated).toBe(1)
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ wallet_id: 'wallet-bca' })
    )
  })

  it('default wallet also skips wallet named "cash" (English)', async () => {
    mockDetectAndParse.mockReturnValue(makeParsedTx('unknown-bank', 'email-001'))

    const wallets: WalletRow[] = [
      { id: 'wallet-cash', name: 'Cash', provider: null, balance: 10000 },
      { id: 'wallet-gopay', name: 'GoPay', provider: null, balance: 200000 },
    ]
    const { supabase, insertSpy } = buildSupabase({ wallets })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    await syncUserGmail(supabase as never, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ wallet_id: 'wallet-gopay' })
    )
  })
})

// ─── Bug 2: Race Condition Duplicate (23505 handling) ────────────────────────

describe('Race Condition Duplicate — Bug 2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockFetchNewEmails.mockResolvedValue({ messages: [{ id: 'email-race' }], newHistoryId: 'h-2' })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockReturnValue(makeParsedTx('mandiri', 'email-race'))
  })

  const WALLETS: WalletRow[] = [
    { id: 'wallet-001', name: 'Mandiri', provider: 'mandiri', balance: 500000 },
  ]

  it('counts as transactionsSkipped when insert returns 23505 unique_violation', async () => {
    const { supabase } = buildSupabase({
      wallets: WALLETS,
      insertResult: {
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      },
    })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    const result: SyncResult = await syncUserGmail(supabase as never, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsSkipped).toBe(1)
    expect(result.transactionsCreated).toBe(0)
    expect(result.errors).toBe(0)
  })

  it('counts as errors when insert returns a non-23505 database error', async () => {
    const { supabase } = buildSupabase({
      wallets: WALLETS,
      insertResult: {
        data: null,
        error: { code: '42501', message: 'permission denied' },
      },
    })
    const { syncUserGmail } = await import('@/lib/gmail/sync')

    const result: SyncResult = await syncUserGmail(supabase as never, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.errors).toBe(1)
    expect(result.transactionsCreated).toBe(0)
    expect(result.transactionsSkipped).toBe(0)
  })

  it('continues processing next emails after a 23505 skip', async () => {
    mockFetchNewEmails.mockResolvedValue({
      messages: [{ id: 'email-dup' }, { id: 'email-new' }],
      newHistoryId: 'h-3',
    })
    mockIsBankEmail.mockReturnValue(true)
    mockDetectAndParse.mockImplementation((email: { id: string }) =>
      makeParsedTx('mandiri', email.id)
    )

    let insertCallCount = 0
    const insertSpy = vi.fn().mockImplementation(() => {
      insertCallCount++
      const result: ChainResult =
        insertCallCount === 1
          ? { data: null, error: { code: '23505', message: 'duplicate key' } }
          : { data: [{ id: 'tx-new' }], error: null }
      return makeQueryChain(result)
    })

    // Override insert in the supabase mock
    let gmailLogCount = 0
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        const chain = makeQueryChain({ data: { gmail_sync_token: null, gmail_sync_enabled: true }, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      if (table === 'wallets') {
        const chain = makeQueryChain({ data: WALLETS, error: null })
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
        gmailLogCount++
        if (gmailLogCount === 1) return makeQueryChain({ data: null, error: null })
        const chain = makeQueryChain({ data: { id: 'log-001' }, error: null })
        chain['update'] = vi.fn().mockReturnValue(makeQueryChain({ data: null, error: null }))
        return chain
      }
      return makeQueryChain({ data: null, error: null })
    })

    const { syncUserGmail } = await import('@/lib/gmail/sync')
    const result: SyncResult = await syncUserGmail({ from } as never, MOCK_USER_ID, MOCK_ACCESS_TOKEN)

    expect(result.transactionsSkipped).toBe(1)
    expect(result.transactionsCreated).toBe(1)
    expect(result.errors).toBe(0)
    expect(insertSpy).toHaveBeenCalledTimes(2)
  })
})
