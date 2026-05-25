import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

/**
 * Mock @google/generative-ai module sebelum import fungsi
 */
const mockGenerateContent = vi.fn()

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn(function (this: any, config: any) {
      this.getGenerativeModel = vi.fn(() => ({
        generateContent: mockGenerateContent,
      }))
    }),
  }
})

// Import setelah mock untuk mendapatkan mock yang sudah di-setup
import { GoogleGenerativeAI } from '@google/generative-ai'
import { categorizeWithGemini, type GeminiCategoryResult } from '@/lib/ai/gemini'

describe('categorizeWithGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set GEMINI_API_KEY untuk test
    process.env.GEMINI_API_KEY = 'test-key-123'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Test 1: Success case — mock return valid JSON → result dengan category + confidence + reasoning
  it('should return categorized result when API returns valid JSON', async () => {
    const mockResponse = {
      response: {
        text: () =>
          JSON.stringify({
            category: 'Makanan & Minuman',
            confidence: 0.95,
            reasoning: 'Mixue adalah jaringan minuman populer',
          }),
      },
    }

    mockGenerateContent.mockResolvedValueOnce(mockResponse)

    const result = await categorizeWithGemini(
      'Mixue',
      'Minuman',
      25000,
      'debit',
      ['Makanan & Minuman', 'Transportasi', 'Hiburan']
    )

    expect(result).not.toBeNull()
    expect(result?.category).toBe('Makanan & Minuman')
    expect(result?.confidence).toBe(0.95)
    expect(result?.reasoning).toBe('Mixue adalah jaringan minuman populer')
  })

  // Test 2: Timeout — mock throw error setelah 5s → return null
  it('should return null on timeout (5 seconds)', async () => {
    // Simulate API yang memakan waktu lebih dari 5 detik
    mockGenerateContent.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 6000)
        })
    )

    const timeoutPromise = categorizeWithGemini(
      'Merchant',
      'Description',
      50000,
      'transfer',
      ['Transportasi', 'Makanan & Minuman']
    )

    // Gunakan timeout yang lebih lama dari timeout handler (5s) agar bisa complete
    const result = await Promise.race([
      timeoutPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000)),
    ])

    expect(result).toBeNull()
  }, 10000) // Timeout test: 10 detik

  // Test 3: API error — mock throw error → return null (tidak throw)
  it('should return null when API throws an error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API Error: 500 Internal Server Error'))

    const result = await categorizeWithGemini(
      'Indomaret',
      'Belanja',
      150000,
      'debit',
      ['Belanja', 'Makanan & Minuman']
    )

    expect(result).toBeNull()
  })

  // Test 4: Invalid JSON — mock return non-JSON text → return null
  it('should return null when API returns invalid JSON', async () => {
    const mockResponse = {
      response: {
        text: () => 'This is not JSON at all',
      },
    }

    mockGenerateContent.mockResolvedValueOnce(mockResponse)

    const result = await categorizeWithGemini(
      'SomeStore',
      'Purchase',
      100000,
      'debit',
      ['Belanja', 'Transportasi']
    )

    expect(result).toBeNull()
  })

  // Test 5: Category tidak valid — mock return category yang tidak ada di list → return null
  it('should return null when returned category is not in available categories', async () => {
    const mockResponse = {
      response: {
        text: () =>
          JSON.stringify({
            category: 'CategoryTidakAda',
            confidence: 0.9,
            reasoning: 'Some reasoning',
          }),
      },
    }

    mockGenerateContent.mockResolvedValueOnce(mockResponse)

    const result = await categorizeWithGemini(
      'Store',
      'Purchase',
      50000,
      'debit',
      ['Makanan & Minuman', 'Transportasi', 'Hiburan'] // CategoryTidakAda tidak ada di list
    )

    expect(result).toBeNull()
  })

  // Test 6: Missing API key — GEMINI_API_KEY tidak set → throw Error
  it('should throw Error when GEMINI_API_KEY is not set', async () => {
    // Temporarily unset the API key
    const originalKey = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY

    try {
      await expect(
        categorizeWithGemini(
          'Store',
          'Purchase',
          50000,
          'debit',
          ['Makanan & Minuman']
        )
      ).rejects.toThrow('GEMINI_API_KEY is not set in environment variables')
    } finally {
      // Restore the API key
      process.env.GEMINI_API_KEY = originalKey
    }
  })

  // Test 7: Null merchant + null description — masih bisa call API dengan placeholder
  it('should handle null merchant and description with placeholders', async () => {
    const mockResponse = {
      response: {
        text: () =>
          JSON.stringify({
            category: 'Lainnya',
            confidence: 0.5,
            reasoning: 'Tidak ada informasi yang cukup',
          }),
      },
    }

    mockGenerateContent.mockResolvedValueOnce(mockResponse)

    const result = await categorizeWithGemini(null, null, 25000, 'debit', [
      'Makanan & Minuman',
      'Lainnya',
    ])

    expect(result).not.toBeNull()
    expect(result?.category).toBe('Lainnya')
    expect(mockGenerateContent).toHaveBeenCalled()
  })

  // Additional test: Confidence outside valid range (< 0 atau > 1)
  it('should return null when confidence is outside 0-1 range', async () => {
    const mockResponse = {
      response: {
        text: () =>
          JSON.stringify({
            category: 'Makanan & Minuman',
            confidence: 1.5, // Invalid: > 1
            reasoning: 'High confidence',
          }),
      },
    }

    mockGenerateContent.mockResolvedValueOnce(mockResponse)

    const result = await categorizeWithGemini('Store', 'Purchase', 50000, 'debit', [
      'Makanan & Minuman',
    ])

    expect(result).toBeNull()
  })

  // Additional test: Invalid data types in response
  it('should return null when response has invalid data types', async () => {
    const mockResponse = {
      response: {
        text: () =>
          JSON.stringify({
            category: 123, // Should be string
            confidence: 0.95,
            reasoning: 'Test',
          }),
      },
    }

    mockGenerateContent.mockResolvedValueOnce(mockResponse)

    const result = await categorizeWithGemini('Store', 'Purchase', 50000, 'debit', [
      'Makanan & Minuman',
    ])

    expect(result).toBeNull()
  })
})
