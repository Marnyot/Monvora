import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Result dari categorization dengan Gemini API
 */
export interface GeminiCategoryResult {
  category: string
  confidence: number
  reasoning: string
}

/**
 * Inisialisasi Gemini API client dari environment variable
 * Asumsi: GEMINI_API_KEY sudah divalidasi sebelum memanggil function ini
 */
function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY!
  return new GoogleGenerativeAI(apiKey)
}

/**
 * Kategorisasi transaksi menggunakan Gemini API
 *
 * @param merchantName - Nama merchant dari notifikasi bank
 * @param description - Deskripsi transaksi
 * @param amount - Nominal transaksi dalam IDR (integer)
 * @param paymentMethod - Metode pembayaran (debit, transfer, dll)
 * @param availableCategories - Daftar kategori yang tersedia
 * @returns Result kategorisasi atau null jika error/timeout
 * @throws Error jika GEMINI_API_KEY tidak di-set
 */
export async function categorizeWithGemini(
  merchantName: string | null,
  description: string | null,
  amount: number,
  paymentMethod: string,
  availableCategories: string[]
): Promise<GeminiCategoryResult | null> {
  // Validasi API key — ini adalah configuration error, harus throw
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables')
  }

  try {
    const client = getGeminiClient()
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = buildPrompt(
      merchantName,
      description,
      amount,
      paymentMethod,
      availableCategories
    )

    // Gunakan AbortController dengan timeout 5 detik
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await model.generateContent(prompt)

      // If kita sampai sini, API respond sebelum timeout
      clearTimeout(timeoutId)

      // Extract dan parse JSON dari response
      const responseText = response.response.text()
      const result = parseJsonResponse(responseText, availableCategories)

      if (!result) {
        // JSON invalid atau category tidak valid
        return null
      }

      return result
    } finally {
      clearTimeout(timeoutId)
      if (controller.signal.aborted) {
        // Timeout terjadi
        return null
      }
    }
  } catch (error) {
    // Log error ID + timestamp (JANGAN log nominal atau merchant name untuk security)
    const errorId = generateErrorId()
    const timestamp = new Date().toISOString()

    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('abort')) {
        console.error(`[Gemini Timeout] ID: ${errorId}, Time: ${timestamp}`)
      } else {
        console.error(`[Gemini Error] ID: ${errorId}, Time: ${timestamp}, Message: ${error.message}`)
      }
    } else {
      console.error(`[Gemini Error] ID: ${errorId}, Time: ${timestamp}`)
    }

    return null
  }
}

/**
 * Build prompt template untuk Gemini
 */
function buildPrompt(
  merchantName: string | null,
  description: string | null,
  amount: number,
  paymentMethod: string,
  availableCategories: string[]
): string {
  const merchantDisplay = merchantName || '[Tidak tersedia]'
  const descriptionDisplay = description || '[Tidak tersedia]'
  const categoriesDisplay = availableCategories.join(', ')

  return `Kamu adalah sistem kategorisasi transaksi keuangan untuk pengguna Indonesia.
Berikan respons HANYA dalam format JSON, tanpa teks lain.

Data transaksi:
- Merchant: ${merchantDisplay}
- Deskripsi: ${descriptionDisplay}
- Nominal: Rp ${formatCurrency(amount)}
- Metode: ${paymentMethod}

Kategori yang tersedia: ${categoriesDisplay}

Format respons (JSON saja, tidak ada teks lain):
{
  "category": "Makanan & Minuman",
  "confidence": 0.95,
  "reasoning": "Mixue adalah jaringan minuman populer"
}`
}

/**
 * Parse JSON response dari Gemini
 */
function parseJsonResponse(
  text: string,
  availableCategories: string[]
): GeminiCategoryResult | null {
  try {
    // Extract JSON dari response (mungkin ada teks di sekitarnya)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validasi structure
    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }

    const { category, confidence, reasoning } = parsed

    // Validasi tipe data
    if (typeof category !== 'string' || typeof confidence !== 'number' || typeof reasoning !== 'string') {
      return null
    }

    // Validasi category ada di list
    if (!availableCategories.includes(category)) {
      return null
    }

    // Validasi confidence antara 0-1
    if (confidence < 0 || confidence > 1) {
      return null
    }

    return {
      category,
      confidence,
      reasoning,
    }
  } catch {
    // JSON parse error atau validation error
    return null
  }
}

/**
 * Format currency untuk display (Rp X.XXX.XXX)
 */
function formatCurrency(amount: number): string {
  return amount.toLocaleString('id-ID')
}

/**
 * Generate unique error ID untuk logging
 */
function generateErrorId(): string {
  return `ERR_${Date.now()}_${Math.random().toString(36).substring(7)}`
}
