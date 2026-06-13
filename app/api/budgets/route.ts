import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBudgetSchema } from '@/lib/validations/budget'
import { checkRateLimit } from '@/lib/utils/rate-limit'

// GET removed: the budgets list is now fetched client-side via the
// useBudgets() hook (RLS-protected, with explicit user_id filter), saving
// a Vercel function hop. See ADR-025 for the client-direct-Supabase rationale.

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
