import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createTransactionSchema, listTransactionSchema } from '@/lib/validations/transaction'
import { checkRateLimit } from '@/lib/utils/rate-limit'

export async function GET(request: Request) {
  const supabase = await createClient()

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

  const { searchParams } = new URL(request.url)
  const parsed = listTransactionSchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Parameter tidak valid', details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    )
  }

  const { page, limit, type, category_id, wallet_id, payment_method, source, is_verified, start_date, end_date, search, sort_by, sort_order } = parsed.data
  const offset = (page - 1) * limit

  let query = supabase
    .from('transactions')
    .select(`
      id, amount, type, description, merchant_name, payment_method,
      source, is_verified, is_recurring, transacted_at, created_at,
      wallet:wallets!wallet_id(id, name, color),
      category:categories(id, name, icon, color)
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (type) query = query.eq('type', type)
  if (category_id) query = query.eq('category_id', category_id)
  if (wallet_id) query = query.eq('wallet_id', wallet_id)
  if (payment_method) query = query.eq('payment_method', payment_method)
  if (source) query = query.eq('source', source)
  if (is_verified !== undefined) query = query.eq('is_verified', is_verified)
  if (start_date) query = query.gte('transacted_at', start_date)
  if (end_date) query = query.lte('transacted_at', end_date)
  if (search) query = query.or(`merchant_name.ilike.%${search}%,description.ilike.%${search}%`)

  const { data, count, error } = await query
    .order(sort_by, { ascending: sort_order === 'asc' })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } }, { status: 500 })
  }

  return NextResponse.json({
    data,
    error: null,
    meta: { page, limit, total: count ?? 0, total_pages: Math.ceil((count ?? 0) / limit), has_next: page * limit < (count ?? 0), has_prev: page > 1 },
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()

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

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ data: null, error: { code: 'INVALID_JSON', message: 'Request body tidak valid' } }, { status: 400 })
  }

  const parsed = createTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Input tidak valid', details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    )
  }

  // Transfer requires to_wallet_id (different from source)
  if (parsed.data.type === 'transfer') {
    if (!parsed.data.to_wallet_id) {
      return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Wallet tujuan wajib diisi untuk transfer', details: { to_wallet_id: ['Wajib diisi'] } } }, { status: 422 })
    }
    if (parsed.data.to_wallet_id === parsed.data.wallet_id) {
      return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Wallet sumber dan tujuan tidak boleh sama', details: { to_wallet_id: ['Tidak boleh sama dengan wallet sumber'] } } }, { status: 422 })
    }
  }

  // Verify source wallet belongs to user
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('id', parsed.data.wallet_id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!wallet) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Wallet tidak ditemukan' } }, { status: 404 })
  }

  // Verify destination wallet for transfers
  let toWallet: { id: string; balance: number | null } | null = null
  if (parsed.data.to_wallet_id) {
    const { data } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('id', parsed.data.to_wallet_id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()
    if (!data) {
      return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Wallet tujuan tidak ditemukan' } }, { status: 404 })
    }
    toWallet = data
  }

  // Insert transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({ ...parsed.data, user_id: user.id })
    .select('id, amount, type, description, merchant_name, payment_method, transacted_at, created_at')
    .single()

  if (txError) {
    return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } }, { status: 500 })
  }

  // Update wallet balance(s)
  if (parsed.data.type === 'transfer' && toWallet) {
    await Promise.all([
      supabase.from('wallets').update({ balance: (wallet.balance ?? 0) - parsed.data.amount }).eq('id', parsed.data.wallet_id).eq('user_id', user.id),
      supabase.from('wallets').update({ balance: (toWallet.balance ?? 0) + parsed.data.amount }).eq('id', toWallet.id).eq('user_id', user.id),
    ])
  } else {
    const balanceDelta = parsed.data.type === 'income' ? parsed.data.amount : -parsed.data.amount
    await supabase
      .from('wallets')
      .update({ balance: (wallet.balance ?? 0) + balanceDelta })
      .eq('id', parsed.data.wallet_id)
      .eq('user_id', user.id)
  }

  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  return NextResponse.json({ data: transaction, error: null }, { status: 201 })
}
