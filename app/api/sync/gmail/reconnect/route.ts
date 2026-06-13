import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { getValidGoogleToken } from '@/lib/utils/google-token'
import { setupWatch } from '@/lib/gmail/watch'
import { anchorGmailCursor } from '@/lib/gmail/sync'

export async function POST() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const rl = checkRateLimit(user.id, '/api/sync/gmail/reconnect')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan. Coba beberapa menit lagi.' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 30) } }
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Profil tidak ditemukan' } },
      { status: 404 }
    )
  }

  const accessToken = await getValidGoogleToken(profile, supabase, user.id)

  // Re-enable sync regardless — if no token, user will need OAuth
  await supabase
    .from('profiles')
    .update({ gmail_sync_enabled: !!accessToken })
    .eq('id', user.id)

  if (!accessToken) {
    return NextResponse.json(
      { data: { needsOAuth: true }, error: null },
      { status: 200 }
    )
  }

  // Set lastSyncedAt ke sekarang agar UI langsung "Tersinkron"
  await supabase
    .from('profiles')
    .update({ gmail_last_synced_at: new Date().toISOString() })
    .eq('id', user.id)

  // Setup Gmail push notification watch
  try {
    await setupWatch(accessToken, supabase, user.id)
  } catch {
    // Non-blocking — cron will handle renewal if watch setup fails.
    const errorId = crypto.randomUUID()
    console.error('[gmail-reconnect] setupWatch failed', { errorId, userId: user.id })
  }

  // Forward-only: anchor cursor ke "sekarang" — TIDAK backfill email lama.
  // Reconnect = mulai tracking dari titik ini; email baru ditangkap real-time
  // oleh background sync. User bisa tarik backlog via tombol "Sync sekarang".
  try {
    await anchorGmailCursor(supabase, user.id, accessToken)
  } catch {
    // Non-blocking — user bisa sync manual nanti
    const errorId = crypto.randomUUID()
    console.error('[gmail-reconnect] anchor cursor failed', { errorId, userId: user.id })
  }

  return NextResponse.json(
    { data: { needsOAuth: false }, error: null },
    { status: 200 }
  )
}
