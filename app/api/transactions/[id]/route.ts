import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { updateTransactionSchema } from '@/lib/validations/transaction'
import { checkRateLimit } from '@/lib/utils/rate-limit'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  const rl = checkRateLimit(user.id, '/api/transactions')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id, amount, type, description, merchant_name, payment_method,
      source, is_verified, transacted_at, created_at, updated_at,
      wallet:wallets(id, name, color),
      category:categories(id, name, icon, color)
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan' } }, { status: 404 })
  }

  return NextResponse.json({ data, error: null })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  const rl = checkRateLimit(user.id, '/api/transactions')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const { data: existing } = await supabase
    .from('transactions')
    .select('id, amount, type, wallet_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan' } }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ data: null, error: { code: 'INVALID_JSON', message: 'Request body tidak valid' } }, { status: 400 })
  }

  const parsed = updateTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Input tidak valid', details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    )
  }

  const { data: updated, error: updateError } = await supabase
    .from('transactions')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('id, amount, type, description, merchant_name, transacted_at, updated_at')
    .single()

  if (updateError) {
    return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: updateError.message } }, { status: 500 })
  }

  // Sync wallet balance if amount or type changed
  const amountChanged = parsed.data.amount !== undefined && parsed.data.amount !== existing.amount
  const typeChanged = parsed.data.type !== undefined && parsed.data.type !== existing.type

  if ((amountChanged || typeChanged) && existing.type !== 'transfer') {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', existing.wallet_id)
      .single()

    if (wallet) {
      const oldDelta = existing.type === 'income' ? existing.amount : -existing.amount
      const newType = parsed.data.type ?? existing.type
      const newAmount = parsed.data.amount ?? existing.amount
      const newDelta = newType === 'income' ? newAmount : -newAmount

      await supabase
        .from('wallets')
        .update({ balance: (wallet.balance ?? 0) - oldDelta + newDelta })
        .eq('id', existing.wallet_id)
        .eq('user_id', user.id)
    }
  }

  return NextResponse.json({ data: updated, error: null })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  const rl = checkRateLimit(user.id, '/api/transactions')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const { data: existing } = await supabase
    .from('transactions')
    .select('id, amount, type, wallet_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan' } }, { status: 404 })
  }

  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  // Reverse balance impact
  if (existing.type !== 'transfer') {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', existing.wallet_id)
      .single()

    if (wallet) {
      const delta = existing.type === 'income' ? existing.amount : -existing.amount
      await supabase
        .from('wallets')
        .update({ balance: (wallet.balance ?? 0) - delta })
        .eq('id', existing.wallet_id)
        .eq('user_id', user.id)
    }
  }

  return new NextResponse(null, { status: 204 })
}
