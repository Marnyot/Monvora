// Gemini fallback for Gmail bank-notification parsing.
//
// IMPORTANT: This module is intentionally not surfaced to the UI. End users
// see Gmail sync as rule-based — AI involvement is a backend optimization
// only. Naming, sync logs, and the resulting transaction.bank field must
// stay generic (no "ai" string leaks).
//
// Privacy: we never log raw email bodies, merchant names, or amounts.
import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_NAME = 'gemini-2.5-flash-lite'
const TIMEOUT_MS = 12_000
const MAX_BODY_CHARS = 4_000

export const PAYMENT_METHODS = [
  'qris',
  'transfer',
  'cash',
  'debit',
  'credit',
  'ewallet',
  'topup',
  'other',
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const TRANSACTION_TYPES = ['expense', 'income', 'transfer'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export interface EmailParserInput {
  subject: string
  from: string
  body: string
  emailDate: string  // RFC 2822 from email header (used as fallback)
}

export interface EmailParserResult {
  amount: number
  type: TransactionType
  merchantName: string | null
  description: string | null
  paymentMethod: PaymentMethod
  transactedAt: string  // ISO 8601 with WIB offset
  referenceNumber: string | null
  bankName: string | null  // Detected bank name (e.g. 'mandiri'); 'unknown' if undeterminable
  confidence: number
}

export type EmailParserOutcome =
  | { ok: true; data: EmailParserResult }
  | { ok: false; kind: 'upstream' | 'no_amount'; errorId?: string }

function buildPrompt(input: EmailParserInput): string {
  const body = input.body.slice(0, MAX_BODY_CHARS)

  return `Kamu adalah parser notifikasi transaksi bank Indonesia. Ekstrak data transaksi dari email di bawah.

From: ${input.from}
Subject: ${input.subject}
Email date (header, fallback only): ${input.emailDate}

Body:
${body}

Aturan:
- amount = nominal transaksi dalam rupiah, integer positif tanpa desimal. Pilih nominal transaksi utama, bukan saldo, bukan biaya admin, bukan limit.
- type = "expense" (pembelian/pembayaran/transfer keluar/tarik tunai), "income" (transfer masuk/setoran/refund), atau "transfer" (kalau betul-betul antar dompet sendiri).
- merchant_name = nama merchant/penerima/pengirim. Singkat & rapi. null kalau tidak jelas.
- description = item/keterangan singkat. null kalau tidak ada info bermanfaat.
- payment_method = pilih satu: qris, transfer, cash, debit, credit, ewallet, topup, other.
- transacted_at = ISO 8601 dengan timezone WIB +07:00. Pakai waktu transaksi dari body. Kalau tidak ada, pakai email date header dikonversi ke WIB.
- reference_number = nomor referensi transaksi kalau ada (TRX-/REF-/dll). null kalau tidak ada.
- bank_name = nama bank pengirim email (mis. "mandiri", "bca", "bni", "bri", "cimb", "ocbc", "permata", "danamon", "btn", "jenius"). Lowercase. "unknown" kalau benar-benar tidak bisa ditebak.
- confidence = 0..1 keyakinan kamu pada hasil ini.

Kalau email ini BUKAN notifikasi transaksi (mis. promo, OTP, statement bulanan), kembalikan amount = 0 dan confidence = 0.

Balasan HANYA JSON, tanpa markdown fences, tanpa teks lain:

{
  "amount": 150000,
  "type": "expense",
  "merchant_name": "Tokopedia",
  "description": "Pembelian online",
  "payment_method": "qris",
  "transacted_at": "2026-06-13T14:30:00+07:00",
  "reference_number": "TRX12345",
  "bank_name": "mandiri",
  "confidence": 0.9
}`
}

export function parseEmailResponse(raw: string): EmailParserResult | null {
  if (!raw) return null

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

  const amount =
    typeof parsed.amount === 'number' && Number.isInteger(parsed.amount) && parsed.amount > 0
      ? parsed.amount
      : null
  if (!amount) return null

  const typeValue = typeof parsed.type === 'string' ? parsed.type : null
  const type = typeValue && (TRANSACTION_TYPES as readonly string[]).includes(typeValue)
    ? (typeValue as TransactionType)
    : 'expense'

  const methodValue = typeof parsed.payment_method === 'string' ? parsed.payment_method : null
  const paymentMethod =
    methodValue && (PAYMENT_METHODS as readonly string[]).includes(methodValue)
      ? (methodValue as PaymentMethod)
      : 'other'

  const stringOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null

  const transactedAt = stringOrNull(parsed.transacted_at)
  if (!transactedAt) return null

  const confidence =
    typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
      ? parsed.confidence
      : 0.5

  return {
    amount,
    type,
    merchantName: stringOrNull(parsed.merchant_name),
    description: stringOrNull(parsed.description),
    paymentMethod,
    transactedAt,
    referenceNumber: stringOrNull(parsed.reference_number),
    bankName: stringOrNull(parsed.bank_name)?.toLowerCase() ?? null,
    confidence,
  }
}

export async function parseEmailWithAi(
  input: EmailParserInput
): Promise<EmailParserOutcome> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = client.getGenerativeModel({ model: MODEL_NAME })
  const prompt = buildPrompt(input)

  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), TIMEOUT_MS)
  })

  try {
    const response = await Promise.race([model.generateContent(prompt), timeoutPromise])
    const text = response.response.text()
    const parsed = parseEmailResponse(text)
    if (!parsed) return { ok: false, kind: 'no_amount' }
    return { ok: true, data: parsed }
  } catch (error) {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const message = error instanceof Error ? error.message : 'unknown'
    // Intentionally generic log prefix — no "ai" or "gemini" string leaks into
    // sync logs or anything user-facing.
    console.error(`[email-parser] ID: ${errorId}, Message: ${message}`)
    return { ok: false, kind: 'upstream', errorId }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
