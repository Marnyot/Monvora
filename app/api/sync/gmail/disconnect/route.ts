import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'

export async function POST() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const rl = checkRateLimit(user.id, '/api/sync/gmail/disconnect')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan. Coba beberapa menit lagi.' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 30) } }
    )
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      gmail_sync_enabled: false,
      gmail_sync_token: null,
      gmail_last_synced_at: null,
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Gagal memutuskan Gmail' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: null, error: null }, { status: 200 })
}
