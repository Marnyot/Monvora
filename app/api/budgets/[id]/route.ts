import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateBudgetSchema } from '@/lib/validations/budget'
import { validateUUID } from '@/lib/validations/common'
import { checkRateLimit } from '@/lib/utils/rate-limit'

async function getOwnedBudget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  budgetId: string
) {
  const { data } = await supabase
    .from('budgets')
    .select('id')
    .eq('id', budgetId)
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

  const { data, error } = await supabase
    .from('budgets')
    .select(`
      id, name, amount, period, category_id, is_active, created_at, updated_at,
      category:categories(id, name, icon, color)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Budget tidak ditemukan' } },
      { status: 404 }
    )
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

  const owned = await getOwnedBudget(supabase, user.id, id)
  if (!owned) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Budget tidak ditemukan' } },
      { status: 404 }
    )
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body tidak valid' } },
      { status: 400 }
    )
  }

  const parsed = updateBudgetSchema.safeParse(body)
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

  const { data, error } = await supabase
    .from('budgets')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, amount, period, category_id, is_active, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } },
      { status: 500 }
    )
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

  const owned = await getOwnedBudget(supabase, user.id, id)
  if (!owned) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Budget tidak ditemukan' } },
      { status: 404 }
    )
  }

  const { error } = await supabase
    .from('budgets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } },
      { status: 500 }
    )
  }

  return new NextResponse(null, { status: 204 })
}
