import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'

/**
 * GET /api/sync/status
 * Status Gmail sync untuk user yang sedang login.
 *
 * Auth required: Yes (session check)
 * Rate limit: Normal (30 per menit)
 */
export async function GET(request: Request) {
  const supabase = await createClient()

  // ─── 1. AUTH CHECK ─────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  // ─── 2. RATE LIMIT ────────────────────────────────────────
  const rl = checkRateLimit(user.id, '/api/sync/status')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    )
  }

  // ─── 3. FETCH PROFILE ─────────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('gmail_sync_enabled, gmail_last_synced_at')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Profil tidak ditemukan' } },
      { status: 404 }
    )
  }

  // ─── 4. FETCH RECENT SYNC LOGS ────────────────────────────
  const { data: logs, error: logsError } = await supabase
    .from('gmail_sync_logs')
    .select('id, status, emails_scanned, transactions_found, transactions_created, error_message, started_at, completed_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(5)

  if (logsError) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } },
      { status: 500 }
    )
  }

  // ─── 5. RETURN RESPONSE ────────────────────────────────────
  return NextResponse.json({
    data: {
      gmail_sync_enabled: profile.gmail_sync_enabled,
      last_synced_at: profile.gmail_last_synced_at,
      recent_logs: (logs ?? []).map(log => ({
        id: log.id,
        status: log.status,
        emails_scanned: log.emails_scanned,
        transactions_found: log.transactions_found,
        transactions_created: log.transactions_created,
        error_message: log.error_message,
        started_at: log.started_at,
        completed_at: log.completed_at,
      })),
    },
    error: null,
  })
}
