import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mockMatchCategory = vi.fn()
const mockCategorizeWithGemini = vi.fn()

vi.mock('@/lib/ai/rules', () => ({
  matchCategory: (...args: unknown[]) => mockMatchCategory(...args),
}))

vi.mock('@/lib/ai/gemini', () => ({
  categorizeWithGemini: (...args: unknown[]) => mockCategorizeWithGemini(...args),
}))

// Import setelah mock
import { categorizeTransaction, AVAILABLE_CATEGORIES } from '@/lib/ai/categorize'

describe('categorizeTransaction — AI Pipeline Orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── Test 1: Rules match confidence >= 0.9 → return rules, skip Gemini ──────
  it('should return rules result when confidence >= 0.9 without calling Gemini', async () => {
    mockMatchCategory.mockReturnValue({
      category: 'Makanan & Minuman',
      confidence: 0.95,
      matchedRule: '/starbucks/i',
    })

    const result = await categorizeTransaction('Starbucks', 'Coffee', 45000, 'debit')

    expect(result.category).toBe('Makanan & Minuman')
    expect(result.confidence).toBe(0.95)
    expect(result.source).toBe('rules')
    // Gemini tidak dipanggil karena confidence sudah cukup tinggi
    expect(mockCategorizeWithGemini).not.toHaveBeenCalled()
  })

  // ── Test 2: Rules confidence < 0.9 → call Gemini ───────────────────────────
  it('should call Gemini when rules confidence < 0.9', async () => {
    mockMatchCategory.mockReturnValue({
      category: 'Belanja',
      confidence: 0.85,
      matchedRule: '/toko online/i',
    })

    mockCategorizeWithGemini.mockResolvedValue({
      category: 'Makanan & Minuman',
      confidence: 0.92,
      reasoning: 'Deteksi lebih akurat via Gemini',
    })

    const result = await categorizeTransaction('Toko Online XYZ', null, 150000, 'transfer')

    expect(mockCategorizeWithGemini).toHaveBeenCalled()
    expect(result.category).toBe('Makanan & Minuman')
    expect(result.confidence).toBe(0.92)
    expect(result.source).toBe('gemini')
  })

  // ── Test 3: Rules no match + Gemini success → return Gemini result ──────────
  it('should return Gemini result when rules does not match', async () => {
    mockMatchCategory.mockReturnValue(null)

    mockCategorizeWithGemini.mockResolvedValue({
      category: 'Kesehatan',
      confidence: 0.88,
      reasoning: 'Merchant berkaitan dengan layanan kesehatan',
    })

    const result = await categorizeTransaction('Klinik Sehat Sentosa', 'Pemeriksaan', 250000, 'debit')

    expect(mockCategorizeWithGemini).toHaveBeenCalled()
    expect(result.category).toBe('Kesehatan')
    expect(result.confidence).toBe(0.88)
    expect(result.source).toBe('gemini')
  })

  // ── Test 4: Rules no match + Gemini fails → return fallback 'Lainnya' ───────
  it('should return fallback when both rules and Gemini fail', async () => {
    mockMatchCategory.mockReturnValue(null)
    mockCategorizeWithGemini.mockResolvedValue(null) // Gemini gagal (return null)

    const result = await categorizeTransaction(null, null, 50000, 'cash')

    expect(result.category).toBe('Lainnya')
    expect(result.confidence).toBe(0.3)
    expect(result.source).toBe('fallback')
  })

  // ── Test 5: Rules match + Gemini gagal (throw) → return rules result ────────
  it('should return rules result when Gemini throws an error', async () => {
    mockMatchCategory.mockReturnValue({
      category: 'Transportasi',
      confidence: 0.85,
      matchedRule: '/taxi/i',
    })

    mockCategorizeWithGemini.mockRejectedValue(new Error('GEMINI_API_KEY is not set'))

    const result = await categorizeTransaction('Blue Bird Taxi', 'Perjalanan', 75000, 'debit')

    // Gemini gagal → gunakan rules result (meski confidence rendah)
    expect(result.category).toBe('Transportasi')
    expect(result.confidence).toBe(0.85)
    expect(result.source).toBe('rules')
  })

  // ── Test 6: Rules no match + Gemini throws → return fallback ────────────────
  it('should return fallback when rules has no match and Gemini throws', async () => {
    mockMatchCategory.mockReturnValue(null)
    mockCategorizeWithGemini.mockRejectedValue(new Error('Network error'))

    const result = await categorizeTransaction('Unknown Merchant XYZ', 'Transaksi', 99000, 'transfer')

    expect(result.category).toBe('Lainnya')
    expect(result.confidence).toBe(0.3)
    expect(result.source).toBe('fallback')
  })

  // ── Test 7: Rules confidence exactly 0.9 (boundary) → return rules ──────────
  it('should return rules result when confidence is exactly 0.9 (inclusive boundary)', async () => {
    mockMatchCategory.mockReturnValue({
      category: 'Hiburan',
      confidence: 0.9,
      matchedRule: '/netflix/i',
    })

    const result = await categorizeTransaction('Netflix', 'Subscription', 54000, 'debit')

    expect(result.source).toBe('rules')
    expect(result.category).toBe('Hiburan')
    expect(mockCategorizeWithGemini).not.toHaveBeenCalled()
  })

  // ── Test 8: Gemini dipanggil dengan AVAILABLE_CATEGORIES ────────────────────
  it('should pass AVAILABLE_CATEGORIES to Gemini', async () => {
    mockMatchCategory.mockReturnValue(null)
    mockCategorizeWithGemini.mockResolvedValue({
      category: 'Pendidikan',
      confidence: 0.91,
      reasoning: 'Platform pendidikan online',
    })

    await categorizeTransaction('Ruangguru', 'Berlangganan', 180000, 'debit')

    expect(mockCategorizeWithGemini).toHaveBeenCalledWith(
      'Ruangguru',
      'Berlangganan',
      180000,
      'debit',
      AVAILABLE_CATEGORIES
    )
  })

  // ── Test 9: Verify AVAILABLE_CATEGORIES contents ─────────────────────────────
  it('should have all required categories in AVAILABLE_CATEGORIES', () => {
    expect(AVAILABLE_CATEGORIES).toContain('Makanan & Minuman')
    expect(AVAILABLE_CATEGORIES).toContain('Transportasi')
    expect(AVAILABLE_CATEGORIES).toContain('Belanja')
    expect(AVAILABLE_CATEGORIES).toContain('Kesehatan')
    expect(AVAILABLE_CATEGORIES).toContain('Hiburan')
    expect(AVAILABLE_CATEGORIES).toContain('Tagihan & Utilitas')
    expect(AVAILABLE_CATEGORIES).toContain('Pendidikan')
    expect(AVAILABLE_CATEGORIES).toContain('Keuangan')
    expect(AVAILABLE_CATEGORIES).toContain('Lainnya')
    expect(AVAILABLE_CATEGORIES).toHaveLength(9)
  })
})
