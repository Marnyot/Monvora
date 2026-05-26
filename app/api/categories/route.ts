import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createCategorySchema } from '@/lib/validations/category'
import { checkRateLimit } from '@/lib/utils/rate-limit'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  const rl = checkRateLimit(user.id, '/api/categories')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  // System categories (user_id IS NULL) + user's own categories
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, icon, color, type, is_system, user_id')
    .is('deleted_at', null)
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

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

  const rl = checkRateLimit(user.id, '/api/categories')
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

  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Input tidak valid', details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({ ...parsed.data, user_id: user.id, is_system: false })
    .select('id, name, icon, color, type, is_system, user_id')
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: 'Terjadi kesalahan database' } }, { status: 500 })
  }

  revalidatePath('/settings/categories')
  return NextResponse.json({ data, error: null }, { status: 201 })
}
