import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { aggregate, type AnalyticsInput } from '@/lib/analytics/aggregate'

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

// Fetch window: 6 months back to now, in WIB calendar.
function trendWindowStart(now: Date): string {
  const j = new Date(now.getTime() + JAKARTA_OFFSET_MS)
  // First day of (currentMonth - 5) at 00:00 WIB
  const startWib = new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth() - 5, 1, 0, 0, 0))
  // Convert back to UTC instant
  return new Date(startWib.getTime() - JAKARTA_OFFSET_MS).toISOString()
}

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const rl = checkRateLimit(user.id, '/api/analytics')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    )
  }

  // Ignore any client-supplied user_id — always filter by session user.
  void new URL(request.url)

  const now = new Date()
  const since = trendWindowStart(now)

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id, amount, type, transacted_at, merchant_name, description,
      is_recurring, recurring_group_id,
      category:categories(id, name, icon, color)
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('transacted_at', since)
    .order('transacted_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } },
      { status: 500 }
    )
  }

  // Supabase types nested relations as arrays in joins; coerce shape for aggregator.
  const rows = (data ?? []) as Array<{
    id: string
    amount: number
    type: 'income' | 'expense' | 'transfer'
    transacted_at: string
    merchant_name: string | null
    description: string | null
    is_recurring: boolean | null
    recurring_group_id: string | null
    category: { id: string; name: string; icon: string; color: string } | null
      | Array<{ id: string; name: string; icon: string; color: string }>
  }>

  const input: AnalyticsInput[] = rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    type: r.type,
    transacted_at: r.transacted_at,
    merchant_name: r.merchant_name,
    description: r.description,
    is_recurring: r.is_recurring,
    recurring_group_id: r.recurring_group_id,
    category: Array.isArray(r.category) ? (r.category[0] ?? null) : r.category,
  }))

  const result = aggregate(input, now)

  return NextResponse.json({ data: result, error: null })
}
