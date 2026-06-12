import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBudgetSchema } from '@/lib/validations/budget'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import {
  computeBudgetStatus,
  periodWindow,
  type BudgetInput,
  type BudgetPeriod,
  type BudgetTxn,
} from '@/lib/budgets/utilization'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const rl = checkRateLimit(user.id, '/api/budgets')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    )
  }

  const { data: budgets, error: budgetErr } = await supabase
    .from('budgets')
    .select(`
      id, name, amount, period, category_id, is_active, created_at, updated_at,
      category:categories(id, name, icon, color)
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (budgetErr) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } },
      { status: 500 }
    )
  }

  if (!budgets || budgets.length === 0) {
    return NextResponse.json({ data: [], error: null })
  }

  const now = new Date()
  // Single transactions fetch covering the earliest active period window.
  // Yearly is the longest; fetch from start of current yearly window if any budget is yearly,
  // otherwise the longest needed.
  const periods = new Set<BudgetPeriod>(budgets.map((b) => b.period as BudgetPeriod))
  const earliest = periods.has('yearly')
    ? periodWindow('yearly', now).start
    : periods.has('monthly')
    ? periodWindow('monthly', now).start
    : periodWindow('weekly', now).start

  const { data: txs, error: txErr } = await supabase
    .from('transactions')
    .select('amount, type, transacted_at, category_id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .eq('type', 'expense')
    .gte('transacted_at', earliest.toISOString())

  if (txErr) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } },
      { status: 500 }
    )
  }

  const allTxs: BudgetTxn[] = (txs ?? []).map((t) => ({
    amount: t.amount,
    type: t.type as BudgetTxn['type'],
    transacted_at: t.transacted_at,
    category_id: t.category_id,
  }))

  const result = budgets.map((b) => {
    const input: BudgetInput = {
      id: b.id,
      amount: b.amount,
      period: b.period as BudgetPeriod,
      category_id: b.category_id,
    }
    const status = computeBudgetStatus(input, allTxs, now)
    const cat = Array.isArray(b.category) ? b.category[0] : b.category
    return {
      id: b.id,
      name: b.name,
      amount: b.amount,
      period: b.period,
      category_id: b.category_id,
      category: cat ?? null,
      is_active: b.is_active,
      created_at: b.created_at,
      updated_at: b.updated_at,
      utilization: status,
    }
  })

  return NextResponse.json({ data: result, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const rl = checkRateLimit(user.id, '/api/budgets')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    )
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body tidak valid' } },
      { status: 400 }
    )
  }

  const parsed = createBudgetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input tidak valid',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 }
    )
  }

  // Validate category ownership if provided
  if (parsed.data.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', parsed.data.category_id)
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .is('deleted_at', null)
      .maybeSingle()
    if (!cat) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' } },
        { status: 404 }
      )
    }
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      ...parsed.data,
      category_id: parsed.data.category_id ?? null,
      user_id: user.id,
    })
    .select('id, name, amount, period, category_id, is_active, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}
