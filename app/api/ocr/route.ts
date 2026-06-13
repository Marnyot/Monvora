import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { extractReceiptFromImage } from '@/lib/ai/ocr-vision'

// Accept up to ~6MB base64 payload (~4.5MB raw bytes after decode). Client
// resizes images to ~1024px before encoding so real usage is well under this.
const MAX_IMAGE_PAYLOAD = 6 * 1024 * 1024

const ocrInputSchema = z.object({
  image: z
    .string()
    .regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, 'Format gambar tidak didukung')
    .max(MAX_IMAGE_PAYLOAD, 'Gambar terlalu besar'),
})

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
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

  // Split data URL: "data:image/jpeg;base64,..."
  const dataUrl = parsed.data.image
  const commaIdx = dataUrl.indexOf(',')
  const header = dataUrl.slice(5, commaIdx) // "image/jpeg;base64"
  const mimeType = header.split(';')[0]
  const imageBase64 = dataUrl.slice(commaIdx + 1)

  // Fetch user's expense categories so Gemini can pick one by name.
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('type', 'expense')
    .is('deleted_at', null)
    .or(`user_id.eq.${user.id},user_id.is.null`)

  const categoryList = (categories ?? []).map((c) => ({ id: c.id, name: c.name }))

  const outcome = await extractReceiptFromImage({
    imageBase64,
    mimeType,
    categories: categoryList,
  })

  if (!outcome.ok) {
    if (outcome.error.kind === 'upstream') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'AI_UNAVAILABLE',
            message: 'Layanan AI sedang bermasalah. Coba lagi sebentar lagi atau input manual.',
          },
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'PARSE_FAILED',
          message: 'Tidak bisa membaca struk. Coba foto yang lebih jelas atau input manual.',
        },
      },
      { status: 422 }
    )
  }

  const result = outcome.data

  // Map category_name back to category_id (case-insensitive).
  let categoryId: string | null = null
  if (result.categoryName) {
    const target = normalize(result.categoryName)
    const match = categoryList.find((c) => normalize(c.name) === target)
    categoryId = match?.id ?? null
  }

  return NextResponse.json({
    data: {
      amount: result.amount,
      merchant_name: result.merchantName,
      description: result.description,
      transacted_at: result.transactedAt,
      payment_method: result.paymentMethod,
      category_id: categoryId,
      category_name: result.categoryName,
      confidence: result.confidence,
    },
    error: null,
  })
}
