import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { parseReceiptText } from '@/lib/ocr/parser'

const ocrInputSchema = z.object({
  text: z.string().trim().min(1, 'Teks wajib diisi').max(20_000, 'Teks terlalu panjang'),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const rl = checkRateLimit(user.id, '/api/ocr')
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

  const parsed = ocrInputSchema.safeParse(body)
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

  const result = parseReceiptText(parsed.data.text)
  if (!result) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'PARSE_FAILED',
          message: 'Tidak menemukan nominal di teks. Pastikan screenshot menunjukkan nominal "Rp ...".',
        },
      },
      { status: 422 }
    )
  }

  return NextResponse.json({
    data: {
      amount: result.amount,
      merchant_name: result.merchantName ?? null,
      transacted_at: result.transactedAt ? result.transactedAt.toISOString() : null,
      payment_method: result.paymentMethod ?? null,
      confidence: result.confidence,
    },
    error: null,
  })
}
