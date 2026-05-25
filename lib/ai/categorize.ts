/**
 * AI Categorization Pipeline Orchestration
 * Rules → Gemini → Fallback
 *
 * Pipeline:
 * 1. Coba rule-based dulu — jika confidence >= 0.9, return langsung
 * 2. Jika rules confidence < 0.9 atau tidak match, coba Gemini
 * 3. Jika Gemini gagal/null, gunakan rules result (meski confidence rendah)
 * 4. Jika semua gagal, return fallback { category: 'Lainnya', confidence: 0.3, source: 'fallback' }
 */

import { matchCategory } from './rules'
import { categorizeWithGemini } from './gemini'

export interface CategoryResult {
  category: string | null // null jika tidak bisa kategorisasi
  confidence: number
  source: 'rules' | 'gemini' | 'fallback'
}

/**
 * Kategori default yang tersedia (harus sync dengan seed DB)
 */
export const AVAILABLE_CATEGORIES = [
  'Makanan & Minuman',
  'Transportasi',
  'Belanja',
  'Kesehatan',
  'Hiburan',
  'Tagihan & Utilitas',
  'Pendidikan',
  'Keuangan',
  'Lainnya',
]

/**
 * Kategorisasi transaksi via pipeline: rules → gemini → fallback
 *
 * @param merchantName  - Nama merchant dari notifikasi bank
 * @param description   - Deskripsi transaksi
 * @param amount        - Nominal transaksi dalam IDR (integer)
 * @param paymentMethod - Metode pembayaran (debit, transfer, dll)
 * @returns CategoryResult dengan category, confidence, dan source
 */
export async function categorizeTransaction(
  merchantName: string | null,
  description: string | null,
  amount: number,
  paymentMethod: string
): Promise<CategoryResult> {
  // ── Step 1: Rule-based matching ────────────────────────────────────────────
  const rulesResult = matchCategory(merchantName, description)

  if (rulesResult && rulesResult.confidence >= 0.9) {
    // Rules match dengan confidence tinggi — tidak perlu Gemini
    return {
      category: rulesResult.category,
      confidence: rulesResult.confidence,
      source: 'rules',
    }
  }

  // ── Step 2: Gemini API ─────────────────────────────────────────────────────
  try {
    const geminiResult = await categorizeWithGemini(
      merchantName,
      description,
      amount,
      paymentMethod,
      AVAILABLE_CATEGORIES
    )

    if (geminiResult) {
      return {
        category: geminiResult.category,
        confidence: geminiResult.confidence,
        source: 'gemini',
      }
    }
  } catch {
    // Gemini gagal (mis: API key tidak ada) — lanjut ke fallback
  }

  // ── Step 3: Gunakan rules result meski confidence rendah ──────────────────
  if (rulesResult) {
    return {
      category: rulesResult.category,
      confidence: rulesResult.confidence,
      source: 'rules',
    }
  }

  // ── Step 4: Fallback total ─────────────────────────────────────────────────
  return {
    category: 'Lainnya',
    confidence: 0.3,
    source: 'fallback',
  }
}
