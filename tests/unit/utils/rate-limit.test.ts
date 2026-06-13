import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  checkRateLimit,
  __resetRateLimitStore,
  __getRateLimitStoreSize,
  RATE_LIMIT_MAX_ENTRIES,
} from '@/lib/utils/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    __resetRateLimitStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request', () => {
    const result = checkRateLimit('user-1', '/api/transactions')
    expect(result.allowed).toBe(true)
  })

  it('blocks once limit is exceeded within window', () => {
    const limit = 60 // /api/transactions
    for (let i = 0; i < limit; i++) {
      const r = checkRateLimit('user-1', '/api/transactions')
      expect(r.allowed).toBe(true)
    }
    const overflow = checkRateLimit('user-1', '/api/transactions')
    expect(overflow.allowed).toBe(false)
    expect(typeof overflow.retryAfter).toBe('number')
    expect(overflow.retryAfter!).toBeGreaterThan(0)
  })

  it('resets window after windowMs elapses', () => {
    for (let i = 0; i < 60; i++) checkRateLimit('user-1', '/api/transactions')
    expect(checkRateLimit('user-1', '/api/transactions').allowed).toBe(false)

    vi.advanceTimersByTime(60_001)

    expect(checkRateLimit('user-1', '/api/transactions').allowed).toBe(true)
  })

  it('separates buckets per user + endpoint', () => {
    for (let i = 0; i < 60; i++) checkRateLimit('user-1', '/api/transactions')
    expect(checkRateLimit('user-1', '/api/transactions').allowed).toBe(false)

    // Same endpoint, different user — independent bucket
    expect(checkRateLimit('user-2', '/api/transactions').allowed).toBe(true)
    // Same user, different endpoint — independent bucket
    expect(checkRateLimit('user-1', '/api/wallets').allowed).toBe(true)
  })

  it('has explicit config for sync disconnect + reconnect routes', () => {
    // Should be hardened with low limit (not fall through to default 60/min)
    const disconnectBefore = checkRateLimit('user-1', '/api/sync/gmail/disconnect')
    const reconnectBefore = checkRateLimit('user-1', '/api/sync/gmail/reconnect')
    expect(disconnectBefore.allowed).toBe(true)
    expect(reconnectBefore.allowed).toBe(true)

    // Burn through expected explicit limit (5 per 5 min)
    for (let i = 0; i < 4; i++) {
      checkRateLimit('user-1', '/api/sync/gmail/disconnect')
      checkRateLimit('user-1', '/api/sync/gmail/reconnect')
    }
    expect(checkRateLimit('user-1', '/api/sync/gmail/disconnect').allowed).toBe(false)
    expect(checkRateLimit('user-1', '/api/sync/gmail/reconnect').allowed).toBe(false)
  })

  it('evicts expired entries once store passes eviction threshold', async () => {
    const { RATE_LIMIT_EVICTION_THRESHOLD } = await import('@/lib/utils/rate-limit')
    // Fill above threshold so next call triggers sweep
    const fill = RATE_LIMIT_EVICTION_THRESHOLD + 50
    for (let i = 0; i < fill; i++) {
      checkRateLimit(`bulk-${i}`, '/api/transactions')
    }
    const sizeBefore = __getRateLimitStoreSize()
    expect(sizeBefore).toBeGreaterThanOrEqual(fill)

    // Advance past window so all existing entries are expired
    vi.advanceTimersByTime(60_001)

    // One more call past threshold triggers sweepExpired
    checkRateLimit('fresh-user', '/api/transactions')

    const sizeAfter = __getRateLimitStoreSize()
    // After sweep + insert of fresh entry, almost everything should be gone
    expect(sizeAfter).toBeLessThan(sizeBefore)
    expect(sizeAfter).toBeLessThanOrEqual(2)
  })

  it('caps store growth to prevent memory exhaustion attack', () => {
    // Try to overflow store with unique users — store must not grow past cap
    for (let i = 0; i < RATE_LIMIT_MAX_ENTRIES + 500; i++) {
      checkRateLimit(`attacker-${i}`, '/api/transactions')
    }
    expect(__getRateLimitStoreSize()).toBeLessThanOrEqual(RATE_LIMIT_MAX_ENTRIES)
  })
})
