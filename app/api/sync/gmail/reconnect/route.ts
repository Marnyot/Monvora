import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { getValidGoogleToken } from '@/lib/utils/google-token'
import { setupWatch } from '@/lib/gmail/watch'
import { syncUserGmail } from '@/lib/gmail/sync'

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

  await supabase
    .from('profiles')
    .update({
      gmail_last_synced_at: new Date().toISOString(),
      gmail_sync_token: null,
    })
    .eq('id', user.id)

  try {
    await setupWatch(accessToken, supabase, user.id)
  } catch {
    // Watch gagal — tidak fatal, cron akan coba lagi nanti
  }

  try {
    await syncUserGmail(supabase, user.id, accessToken)
  } catch {
    // Sync awal gagal — user bisa sync manual nanti
  }

  return NextResponse.json(
    { data: { needsOAuth: false }, error: null },
    { status: 200 }
  )
}
