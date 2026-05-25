import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createWalletSchema } from '@/lib/validations/wallet'
import { checkRateLimit } from '@/lib/utils/rate-limit'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  const rl = checkRateLimit(user.id, '/api/wallets')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const { data, error } = await supabase
    .from('wallets')
    .select('id, name, type, provider, balance, color, icon, is_active, created_at, updated_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  const rl = checkRateLimit(user.id, '/api/wallets')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ data: null, error: { code: 'INVALID_JSON', message: 'Request body tidak valid' } }, { status: 400 })
  }

  const parsed = createWalletSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Input tidak valid', details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('wallets')
    .insert({ ...parsed.data, user_id: user.id })
    .select('id, name, type, provider, balance, color, icon, is_active, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } }, { status: 500 })
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}
