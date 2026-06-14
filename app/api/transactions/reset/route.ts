import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/utils/rate-limit'

/**
 * POST /api/transactions/reset
 *
 * Soft delete semua transaksi user + reset saldo semua wallet ke 0.
 * Wallet, kategori, dan budget tetap utuh — hanya transaksi yang dibersihkan.
 *
 * Aksi destruktif: client wajib mengirim { confirm: 'RESET' } supaya tidak
 * terpicu tanpa sengaja.
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const rl = checkRateLimit(user.id, '/api/transactions/reset')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    )
  }

  const body = await request.json().catch(() => null)
  if (body?.confirm !== 'RESET') {
    return NextResponse.json(
      { data: null, error: { code: 'CONFIRM_REQUIRED', message: 'Ketik RESET untuk mengonfirmasi' } },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()

  const { error: txError, count: txCount } = await supabase
    .from('transactions')
    .update({ deleted_at: now }, { count: 'exact' })
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (txError) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Gagal menghapus transaksi' } },
      { status: 500 }
    )
  }

  const { error: walletError } = await supabase
    .from('wallets')
    .update({ balance: 0 })
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (walletError) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Gagal mereset saldo wallet' } },
      { status: 500 }
    )
  }

  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  revalidatePath('/wallets')
  revalidatePath('/analytics')

  return NextResponse.json({
    data: { transactions_deleted: txCount ?? 0 },
    error: null,
  })
}
