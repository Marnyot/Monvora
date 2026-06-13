import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { getValidGoogleToken } from '@/lib/utils/google-token'
import { syncUserGmail } from '@/lib/gmail/sync'

/**
 * POST /api/sync/gmail
 * Trigger manual Gmail sync untuk user yang sedang login.
 *
 * Sync dijalankan langsung (synchronous) di route ini menggunakan
 * session user (bukan admin client) karena Inngest Cloud signature
 * validation belum stabil.
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  // ─── 1. AUTH CHECK ─────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  // ─── 2. CHECK GMAIL SYNC ENABLED + BACA TOKEN DARI DB ─────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('gmail_sync_enabled, google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Profil tidak ditemukan' } },
      { status: 404 }
    )
  }

  if (!profile.gmail_sync_enabled) {
    return NextResponse.json(
      { data: null, error: { code: 'GMAIL_NOT_ENABLED', message: 'Gmail sync belum diaktifkan' } },
      { status: 400 }
    )
  }

  // ─── 3. RATE LIMIT ────────────────────────────────────────
  const rl = checkRateLimit(user.id, '/api/sync/gmail')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan. Coba beberapa menit lagi.' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 300) } }
    )
  }

  // ─── 4. GET GOOGLE ACCESS TOKEN (dari DB, refresh jika expired) ──
  const accessToken = await getValidGoogleToken(profile, supabase, user.id)

  if (!accessToken) {
    return NextResponse.json(
      { data: null, error: { code: 'NO_GOOGLE_TOKEN', message: 'Sesi Gmail kadaluarsa. Silakan login ulang untuk memperbarui koneksi.' } },
      { status: 400 }
    )
  }

  // ─── 5. CLEANUP STALE SYNC LOGS ────────────────────────────
  await supabase
    .from('gmail_sync_logs')
    .update({ status: 'failed', error_message: 'Dibatalkan — sync manual baru', completed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'started')

  // ─── 6. JALANKAN SYNC LANGSUNG ─────────────────────────────
  try {
    const result = await syncUserGmail(supabase, user.id, accessToken)

    return NextResponse.json({
      data: {
        message: 'Sync selesai',
        emailsProcessed: result.emailsProcessed,
        transactionsCreated: result.transactionsCreated,
      },
      error: null,
    }, { status: 200 })
  } catch {
    const errorId = crypto.randomUUID()
    console.error('[sync/gmail] sync failed', { errorId, userId: user.id })
    return NextResponse.json(
      { data: null, error: { code: 'SYNC_ERROR', message: 'Sync gagal. Coba lagi nanti.', errorId } },
      { status: 500 }
    )
  }
}
