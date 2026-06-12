import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

function jakartaDateKey(now: Date): string {
  const j = new Date(now.getTime() + JAKARTA_OFFSET_MS)
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, '0')}-${String(j.getUTCDate()).padStart(2, '0')}`
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const rl = checkRateLimit(user.id, '/api/insights')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    )
  }

  const periodKey = jakartaDateKey(new Date())

  // Look back up to 2 days — daily cron at 07:00 WIB; users opening at 06:30
  // should still see yesterday's insights instead of empty state.
  const { data, error } = await supabase
    .from('ai_insights')
    .select('insights, generated_at, period_key')
    .eq('user_id', user.id)
    .lte('period_key', periodKey)
    .order('period_key', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: data
      ? {
          insights: (data.insights as string[]) ?? [],
          generatedAt: data.generated_at as string,
          periodKey: data.period_key as string,
        }
      : null,
    error: null,
  })
}
