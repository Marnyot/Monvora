import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { inngest } from '@/lib/inngest/client'

/**
 * POST /api/sync/gmail
 * Trigger manual Gmail sync untuk user yang sedang login.
 *
 * Auth required: Yes (session check)
 * Rate limit: 1 request per 5 menit per user (300 detik)
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

  // ─── 2. CHECK GMAIL SYNC ENABLED ───────────────────────────
  // Check before rate limit so unenabled attempts don't consume quota
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('gmail_sync_enabled')
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
  // Rate limit lebih ketat untuk Gmail sync: 1 per 5 menit (300 detik)
  const rl = checkRateLimit(user.id, '/api/sync/gmail')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan. Coba beberapa menit lagi.' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 300) } }
    )
  }

  // ─── 4. GET GOOGLE OAUTH ACCESS TOKEN ─────────────────────
  // provider_token hanya ada di session (bukan di identity_data dari getUser)
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.provider_token ?? null

  if (!accessToken) {
    return NextResponse.json(
      { data: null, error: { code: 'NO_GOOGLE_TOKEN', message: 'Akun Google belum terhubung' } },
      { status: 400 }
    )
  }

  // ─── 5. FIRE BACKGROUND JOB ───────────────────────────────
  try {
    await inngest.send({
      name: 'gmail/sync.manual',
      data: { userId: user.id, accessToken },
    })
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'SYNC_ERROR', message: 'Sync gagal. Coba lagi nanti.' } },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data: { message: 'Sync dimulai' }, error: null },
    { status: 202 }
  )
}
