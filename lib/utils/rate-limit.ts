const RATE_LIMITS: Record<string, { requests: number; windowMs: number }> = {
  '/api/transactions': { requests: 60, windowMs: 60_000 },
  '/api/wallets': { requests: 30, windowMs: 60_000 },
  '/api/categories': { requests: 30, windowMs: 60_000 },
  '/api/sync/gmail': { requests: 1, windowMs: 300_000 },
  '/api/sync/gmail/disconnect': { requests: 5, windowMs: 300_000 },
  '/api/sync/gmail/reconnect': { requests: 5, windowMs: 300_000 },
  '/api/sync/status': { requests: 30, windowMs: 60_000 },
  '/api/analytics': { requests: 30, windowMs: 60_000 },
  '/api/insights': { requests: 30, windowMs: 60_000 },
  '/api/budgets': { requests: 30, windowMs: 60_000 },
  '/api/ocr': { requests: 20, windowMs: 60_000 },
  '/api/auth': { requests: 10, windowMs: 60_000 },
}

export const RATE_LIMIT_MAX_ENTRIES = 10_000
// Sweep expired entries aggressively — cheap O(n) operation amortized
// over many requests. Keeps memory tight under sustained load.
export const RATE_LIMIT_EVICTION_THRESHOLD = 256

const store = new Map<string, { count: number; resetAt: number }>()

function sweepExpired(now: number): void {
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

function enforceCap(): void {
  // If still over cap after sweep, drop oldest insertion order entries
  // (Map preserves insertion order — first iterated = oldest).
  while (store.size > RATE_LIMIT_MAX_ENTRIES) {
    const oldest = store.keys().next().value
    if (oldest === undefined) break
    store.delete(oldest)
  }
}

export function checkRateLimit(
  userId: string,
  endpoint: string
): { allowed: boolean; retryAfter?: number } {
  const config = RATE_LIMITS[endpoint] ?? { requests: 60, windowMs: 60_000 }
  const key = `${userId}:${endpoint}`
  const now = Date.now()

  // Opportunistic eviction when store gets large
  if (store.size >= RATE_LIMIT_EVICTION_THRESHOLD) {
    sweepExpired(now)
  }

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    // Enforce cap after insert — protects against unbounded growth attack
    if (store.size > RATE_LIMIT_MAX_ENTRIES) enforceCap()
    return { allowed: true }
  }

  if (entry.count >= config.requests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}

// Test-only helpers
export function __resetRateLimitStore(): void {
  store.clear()
}

export function __getRateLimitStoreSize(): number {
  return store.size
}
