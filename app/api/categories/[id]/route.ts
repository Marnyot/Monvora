import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { updateCategorySchema } from '@/lib/validations/category'
import { checkRateLimit } from '@/lib/utils/rate-limit'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  // Only allow editing own (non-system) categories
  const { data: existing } = await supabase
    .from('categories')
    .select('id, is_system')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' } }, { status: 404 })
  }

  if (existing.is_system) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Kategori sistem tidak bisa diubah' } }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ data: null, error: { code: 'INVALID_JSON', message: 'Request body tidak valid' } }, { status: 400 })
  }

  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Input tidak valid', details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('categories')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, icon, color, type, is_system, user_id')
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: existing } = await supabase
    .from('categories')
    .select('id, is_system')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' } }, { status: 404 })
  }

  if (existing.is_system) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Kategori sistem tidak bisa dihapus' } }, { status: 403 })
  }

  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
