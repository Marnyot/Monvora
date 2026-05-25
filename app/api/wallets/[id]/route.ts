import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { updateWalletSchema } from '@/lib/validations/wallet'
import { validateUUID } from '@/lib/validations/common'
import { checkRateLimit } from '@/lib/utils/rate-limit'

async function getOwnedWallet(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, walletId: string) {
  const { data } = await supabase
    .from('wallets')
    .select('id')
    .eq('id', walletId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()
  return data
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idError = validateUUID(id)
  if (idError) return idError

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
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Wallet tidak ditemukan' } }, { status: 404 })
  }

  return NextResponse.json({ data, error: null })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idError = validateUUID(id)
  if (idError) return idError

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

  const wallet = await getOwnedWallet(supabase, user.id, id)
  if (!wallet) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Wallet tidak ditemukan' } }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ data: null, error: { code: 'INVALID_JSON', message: 'Request body tidak valid' } }, { status: 400 })
  }

  const parsed = updateWalletSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Input tidak valid', details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('wallets')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, type, provider, balance, color, icon, is_active, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idError = validateUUID(id)
  if (idError) return idError

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

  const wallet = await getOwnedWallet(supabase, user.id, id)
  if (!wallet) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Wallet tidak ditemukan' } }, { status: 404 })
  }

  const { error } = await supabase
    .from('wallets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
