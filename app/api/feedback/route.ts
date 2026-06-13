import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFeedbackSchema } from '@/lib/validations/feedback'
import { checkRateLimit } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const rl = checkRateLimit(user.id, '/api/feedback')
  if (!rl.allowed) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'RATE_LIMIT',
          message: 'Terlalu banyak feedback dalam waktu singkat. Coba lagi sebentar.',
        },
      },
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

  const parsed = createFeedbackSchema.safeParse(body)
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
    .from('feedback')
    .insert({
      ...parsed.data,
      user_id: user.id,
    })
    .select('id, created_at')
    .single()

  if (error) {
    const errorId = crypto.randomUUID()
    console.error('[feedback] insert failed', { errorId, userId: user.id })
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: 'Gagal menyimpan feedback', errorId } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}
