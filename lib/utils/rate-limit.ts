const RATE_LIMITS: Record<string, { requests: number; windowMs: number }> = {
  '/api/transactions': { requests: 60, windowMs: 60_000 },
  '/api/wallets': { requests: 30, windowMs: 60_000 },
  '/api/categories': { requests: 30, windowMs: 60_000 },
  '/api/sync/gmail': { requests: 1, windowMs: 300_000 },   // 1 per 5 menit (300 detik)
  '/api/sync/status': { requests: 30, windowMs: 60_000 },  // 30 per menit
  '/api/ocr': { requests: 20, windowMs: 3_600_000 },
  '/api/analytics': { requests: 30, windowMs: 60_000 },
  '/api/auth': { requests: 10, windowMs: 60_000 },
}

const store = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  userId: string,
  endpoint: string
): { allowed: boolean; retryAfter?: number } {
  const config = RATE_LIMITS[endpoint] ?? { requests: 60, windowMs: 60_000 }
  const key = `${userId}:${endpoint}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true }
  }

  if (entry.count >= config.requests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}
