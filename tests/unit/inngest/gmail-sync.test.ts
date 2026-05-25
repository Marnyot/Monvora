import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mockSyncUserGmail = vi.fn()
const mockGetUserById = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/gmail/sync', () => ({
  syncUserGmail: (...args: unknown[]) => mockSyncUserGmail(...args),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      admin: {
        getUserById: (...args: unknown[]) => mockGetUserById(...args),
      },
    },
  })),
}))

// Import setelah mock
import { gmailSyncFunction } from '@/lib/inngest/functions/gmail-sync'

// ─── Type helper to access Inngest function internals ──────────────────────────

interface InngestFunctionOpts {
  id: string
  name?: string
  triggers: Array<{ cron?: string; event?: string }>
  concurrency?: { limit: number }
  retries?: number
}

function getFunctionOpts(fn: unknown): InngestFunctionOpts {
  return (fn as { opts: InngestFunctionOpts }).opts
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('gmailSyncFunction — Inngest Cron Job', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  // ── Test 1: Function id harus 'gmail-sync' ───────────────────────────────────
  it('should have function id "gmail-sync"', () => {
    const opts = getFunctionOpts(gmailSyncFunction)
    expect(opts.id).toBe('gmail-sync')
  })

  // ── Test 2: Cron schedule harus '*/15 * * * *' ──────────────────────────────
  it('should have cron schedule "*/15 * * * *"', () => {
    const opts = getFunctionOpts(gmailSyncFunction)
    expect(opts.triggers).toBeDefined()
    expect(opts.triggers).toHaveLength(1)
    expect(opts.triggers[0].cron).toBe('*/15 * * * *')
  })

  // ── Test 3: Concurrency limit harus 10 ──────────────────────────────────────
  it('should have concurrency limit of 10', () => {
    const opts = getFunctionOpts(gmailSyncFunction)
    expect(opts.concurrency).toBeDefined()
    expect(opts.concurrency?.limit).toBe(10)
  })

  // ── Test 4: Retries harus 3 ─────────────────────────────────────────────────
  it('should have 3 retries', () => {
    const opts = getFunctionOpts(gmailSyncFunction)
    expect(opts.retries).toBe(3)
  })

  // ── Test 5: gmailSyncFunction adalah object yang valid ───────────────────────
  it('should export gmailSyncFunction as a valid Inngest function object', () => {
    expect(gmailSyncFunction).toBeDefined()
    expect(typeof gmailSyncFunction).toBe('object')
    // Inngest functions expose an id() method
    expect(typeof (gmailSyncFunction as unknown as { id: () => string }).id).toBe('function')
    expect((gmailSyncFunction as unknown as { id: () => string }).id()).toBe('gmail-sync')
  })

  // ── Test 6: Function mempunyai handler (fn property) ────────────────────────
  it('should have a handler function defined', () => {
    const fnAny = gmailSyncFunction as unknown as { fn: unknown }
    expect(fnAny.fn).toBeDefined()
    expect(typeof fnAny.fn).toBe('function')
  })

  // ── Test 7: users dengan gmail_sync_enabled = true diproses ─────────────────
  it('should process users that have gmail_sync_enabled = true via step.run', async () => {
    const mockUserId = 'user-abc-123'

    // Mock profiles query (no .is() — profiles table has no deleted_at)
    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: mockUserId }],
        error: null,
      }),
    }
    mockFrom.mockReturnValue(profilesChain)

    // Mock getUserById dengan Google identity
    mockGetUserById.mockResolvedValue({
      data: {
        user: {
          id: mockUserId,
          identities: [
            {
              provider: 'google',
              identity_data: { access_token: 'ya29.test-token' },
            },
          ],
        },
      },
      error: null,
    })

    // Mock syncUserGmail
    mockSyncUserGmail.mockResolvedValue({
      userId: mockUserId,
      emailsProcessed: 5,
      transactionsCreated: 3,
      transactionsSkipped: 1,
      errors: 0,
      newHistoryId: '99999',
    })

    // Simulasikan handler dengan step mock yang langsung memanggil fn
    const mockStepRun = vi.fn(async (_id: string, fn: () => Promise<unknown>) => fn())
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

    const handler = (gmailSyncFunction as unknown as {
      fn: (ctx: { step: { run: typeof mockStepRun }; logger: typeof mockLogger }) => Promise<unknown>
    }).fn

    const result = await handler({ step: { run: mockStepRun }, logger: mockLogger })

    // Verify step.run dipanggil untuk user ini
    expect(mockStepRun).toHaveBeenCalledWith(
      `sync-user-${mockUserId}`,
      expect.any(Function)
    )
    // syncUserGmail dipanggil dengan userId yang benar
    expect(mockSyncUserGmail).toHaveBeenCalledWith(
      expect.anything(), // supabase client
      mockUserId,
      'ya29.test-token'
    )
    // Return summary yang benar
    expect(result).toMatchObject({
      usersProcessed: 1,
      totalTransactions: 3,
      errors: 0,
    })
  })

  // ── Test 8: Tidak ada user aktif → return empty summary ─────────────────────
  it('should return empty summary when no users have gmail_sync_enabled', async () => {
    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(profilesChain)

    const mockStepRun = vi.fn()
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

    const handler = (gmailSyncFunction as unknown as {
      fn: (ctx: { step: { run: typeof mockStepRun }; logger: typeof mockLogger }) => Promise<unknown>
    }).fn

    const result = await handler({ step: { run: mockStepRun }, logger: mockLogger })

    expect(mockStepRun).not.toHaveBeenCalled()
    expect(mockSyncUserGmail).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      usersProcessed: 0,
      totalTransactions: 0,
      errors: 0,
    })
  })
})
