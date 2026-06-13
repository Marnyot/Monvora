// Gemini Vision OCR — receipt screenshot → structured transaction fields.
// Sent directly to Gemini for inference; we never persist the image.
import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_NAME = 'gemini-2.5-flash'
const TIMEOUT_MS = 15_000

export const VISION_PAYMENT_METHODS = ['qris', 'transfer', 'cash', 'debit', 'credit', 'ewallet', 'topup', 'other'] as const
export type VisionPaymentMethod = (typeof VISION_PAYMENT_METHODS)[number]

export interface VisionOcrInput {
  /** Base64 payload (without `data:` prefix). */
  imageBase64: string
  /** MIME type of the image, e.g. `image/jpeg`. */
  mimeType: string
  /** User-visible expense categories — Gemini picks one. */
  categories: { id: string; name: string }[]
}

export interface VisionOcrResult {
  amount: number | null
  merchantName: string | null
  description: string | null
  transactedAt: string | null  // ISO 8601
  paymentMethod: VisionPaymentMethod | null
  categoryName: string | null
  confidence: number
}

function buildPrompt(categories: { name: string }[]): string {
  const catList = categories.length > 0
    ? categories.map((c) => `- ${c.name}`).join('\n')
    : '(belum ada kategori)'

  return `Kamu adalah asisten OCR untuk struk/nota transaksi pengguna Indonesia. Analisis gambar dan ekstrak data transaksi.

Kategori pengeluaran yang tersedia (pilih satu yang paling sesuai):
${catList}

Metode pembayaran yang valid: qris, transfer, cash, debit, credit, ewallet, topup, other.

Aturan:
- amount = nominal total pembayaran (integer rupiah, tanpa desimal). Pilih total akhir, bukan subtotal/biaya admin.
- merchant_name = nama toko/merchant utama (singkat, kapitalisasi rapi).
- description = ringkasan singkat item yang dibeli (mis. "Kopi susu + roti bakar"). Kosongkan kalau struk hanya menampilkan total tanpa item.
- transacted_at = ISO 8601 dengan timezone WIB +07:00 (mis. "2026-06-13T14:30:00+07:00"). Kalau jam tidak ada, pakai 12:00.
- payment_method = pilih dari daftar di atas berdasarkan konteks (mis. GoPay/OVO/DANA/ShopeePay → ewallet, QRIS → qris).
- category_name = HARUS persis sama dengan salah satu nama kategori di atas. Kalau ragu, pakai kategori paling umum yang masuk akal.
- confidence = 0..1 menyatakan keyakinan kamu pada hasil ini.

Jika ada field yang TIDAK BISA ditentukan dari gambar, gunakan null (jangan menebak).

Balasan HANYA JSON, tanpa teks lain, tanpa markdown fences:

{
  "amount": 35000,
  "merchant_name": "McDonalds Sudirman",
  "description": "Big Mac + kentang + minuman",
  "transacted_at": "2026-06-13T14:30:00+07:00",
  "payment_method": "qris",
  "category_name": "Makanan & Minuman",
  "confidence": 0.9
}`
}

export function parseVisionResponse(raw: string): Omit<VisionOcrResult, 'categoryName'> & { categoryName: string | null } | null {
  if (!raw) return null

  // Strip markdown fences if Gemini ignores instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(match[0]) as Record<string, unknown>
  } catch {
    return null
  }

  const amount = typeof parsed.amount === 'number' && Number.isInteger(parsed.amount) && parsed.amount > 0
    ? parsed.amount
    : null

  const stringOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null

  const paymentMethodValue = stringOrNull(parsed.payment_method)
  const paymentMethod = paymentMethodValue && (VISION_PAYMENT_METHODS as readonly string[]).includes(paymentMethodValue)
    ? (paymentMethodValue as VisionPaymentMethod)
    : null

  const confidence = typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
    ? parsed.confidence
    : 0.5

  return {
    amount,
    merchantName: stringOrNull(parsed.merchant_name),
    description: stringOrNull(parsed.description),
    transactedAt: stringOrNull(parsed.transacted_at),
    paymentMethod,
    categoryName: stringOrNull(parsed.category_name),
    confidence,
  }
}

export type VisionOcrError =
  | { kind: 'upstream'; errorId: string }
  | { kind: 'no_amount' }

export type VisionOcrOutcome =
  | { ok: true; data: VisionOcrResult }
  | { ok: false; error: VisionOcrError }

export async function extractReceiptFromImage(
  input: VisionOcrInput
): Promise<VisionOcrOutcome> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = client.getGenerativeModel({ model: MODEL_NAME })
  const prompt = buildPrompt(input.categories)

  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), TIMEOUT_MS)
  })

  try {
    const response = await Promise.race([
      model.generateContent([
        { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
        { text: prompt },
      ]),
      timeoutPromise,
    ])

    const text = response.response.text()
    const parsed = parseVisionResponse(text)
    if (!parsed || !parsed.amount) {
      return { ok: false, error: { kind: 'no_amount' } }
    }
    return { ok: true, data: parsed }
  } catch (error) {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const message = error instanceof Error ? error.message : 'unknown'
    console.error(`[ocr-vision] ID: ${errorId}, Message: ${message}`)
    return { ok: false, error: { kind: 'upstream', errorId } }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
