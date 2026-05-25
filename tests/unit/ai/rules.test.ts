import { describe, it, expect } from 'vitest'
import { matchCategory, CATEGORIZATION_RULES, getRuleStats } from '@/lib/ai/rules'

describe('AI Rule-Based Categorization Engine', () => {
  describe('matchCategory - Basic Functionality', () => {
    it('should return null for empty merchant and description', () => {
      const result = matchCategory(null, null)
      expect(result).toBeNull()
    })

    it('should return null for whitespace only', () => {
      const result = matchCategory('   ', '   ')
      expect(result).toBeNull()
    })

    it('should be case-insensitive for UPPERCASE merchant', () => {
      const result = matchCategory('INDOMARET', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should be case-insensitive for MixedCase merchant', () => {
      const result = matchCategory('InDomArEt', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })
  })

  describe('matchCategory - MAKANAN & MINUMAN', () => {
    it('should match Indomaret as Makanan & Minuman', () => {
      const result = matchCategory('indomaret', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
      expect(result?.confidence).toBeGreaterThan(0.8)
    })

    it('should match Alfamart as Makanan & Minuman', () => {
      const result = matchCategory('alfamart', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should match GojekFood as Makanan & Minuman', () => {
      const result = matchCategory('gofood', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should match Starbucks as Makanan & Minuman', () => {
      const result = matchCategory('starbucks', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should match KFC as Makanan & Minuman', () => {
      const result = matchCategory('kfc', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should match Kopi Kenangan as Makanan & Minuman', () => {
      const result = matchCategory('kopi kenangan', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should match McDonald\'s as Makanan & Minuman', () => {
      const result = matchCategory('mcdonalds', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should match Warteg as Makanan & Minuman', () => {
      const result = matchCategory('warteg', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should match Mixue as Makanan & Minuman', () => {
      const result = matchCategory('mixue', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })
  })

  describe('matchCategory - TRANSPORTASI', () => {
    it('should match Gojek GoRide as Transportasi', () => {
      const result = matchCategory('gojek', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Transportasi')
    })

    it('should match Grab as Transportasi', () => {
      const result = matchCategory('grab', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Transportasi')
    })

    it('should match KRL as Transportasi', () => {
      const result = matchCategory('krl', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Transportasi')
    })

    it('should match Pertamina (Gas) as Transportasi', () => {
      const result = matchCategory('pertamina', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Transportasi')
    })

    it('should match Parkir as Transportasi', () => {
      const result = matchCategory('parkir', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Transportasi')
    })
  })

  describe('matchCategory - BELANJA', () => {
    it('should match Tokopedia as Belanja', () => {
      const result = matchCategory('tokopedia', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Belanja')
    })

    it('should match Shopee as Belanja', () => {
      const result = matchCategory('shopee', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Belanja')
    })

    it('should match Lazada as Belanja', () => {
      const result = matchCategory('lazada', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Belanja')
    })

    it('should match Nike as Belanja', () => {
      const result = matchCategory('nike', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Belanja')
    })
  })

  describe('matchCategory - KESEHATAN', () => {
    it('should match Kimia Farma as Kesehatan', () => {
      const result = matchCategory('kimia farma', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Kesehatan')
    })

    it('should match Guardian as Kesehatan', () => {
      const result = matchCategory('guardian', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Kesehatan')
    })

    it('should match Apotek as Kesehatan', () => {
      const result = matchCategory('apotek', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Kesehatan')
    })

    it('should match Rumah Sakit as Kesehatan', () => {
      const result = matchCategory('rumah sakit', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Kesehatan')
    })
  })

  describe('matchCategory - HIBURAN', () => {
    it('should match Netflix as Hiburan', () => {
      const result = matchCategory('netflix', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Hiburan')
    })

    it('should match Spotify as Hiburan', () => {
      const result = matchCategory('spotify', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Hiburan')
    })

    it('should match CGV (Cinema) as Hiburan', () => {
      const result = matchCategory('cgv', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Hiburan')
    })
  })

  describe('matchCategory - TAGIHAN & UTILITAS', () => {
    it('should match PLN as Tagihan & Utilitas', () => {
      const result = matchCategory('pln', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Tagihan & Utilitas')
    })

    it('should match Telkomsel as Tagihan & Utilitas', () => {
      const result = matchCategory('telkomsel', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Tagihan & Utilitas')
    })

    it('should match PDAM as Tagihan & Utilitas', () => {
      const result = matchCategory('pdam', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Tagihan & Utilitas')
    })

    it('should match Indihome as Tagihan & Utilitas', () => {
      const result = matchCategory('indihome', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Tagihan & Utilitas')
    })
  })

  describe('matchCategory - PENDIDIKAN', () => {
    it('should match Udemy as Pendidikan', () => {
      const result = matchCategory('udemy', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Pendidikan')
    })

    it('should match Ruangguru as Pendidikan', () => {
      const result = matchCategory('ruangguru', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Pendidikan')
    })

    it('should match Zenius as Pendidikan', () => {
      const result = matchCategory('zenius', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Pendidikan')
    })
  })

  describe('matchCategory - Merchant + Description Combined', () => {
    it('should match merchant from both name and description', () => {
      const result = matchCategory('some store', 'gofood purchase')
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should use description if merchant is empty', () => {
      const result = matchCategory(null, 'netflix subscription')
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Hiburan')
    })
  })

  describe('matchCategory - Unknown Merchant', () => {
    it('should handle completely unknown merchant gracefully', () => {
      const result = matchCategory('xyzunknownmerchant12345', null)
      // Unknown merchants might not match or match generic pattern
      // This is acceptable behavior
      if (result) {
        expect(result.confidence).toBeLessThanOrEqual(0.5)
      }
    })

    it('should handle random words gracefully', () => {
      const result = matchCategory('qwertyuiopasdfghjklzxcvbnm', null)
      // Random words might not match any pattern
      if (result) {
        expect(result.confidence).toBeLessThanOrEqual(0.5)
      }
    })
  })

  describe('matchCategory - Confidence Levels', () => {
    it('should have high confidence for very specific matches (GojekFood)', () => {
      const result = matchCategory('gofood', null)
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('should have lower confidence for generic categories', () => {
      const result = matchCategory('payment', null)
      if (result) {
        // payment is generic fallback pattern, should have lower confidence
        expect(result.confidence).toBeLessThan(0.7)
      }
    })
  })

  describe('getRuleStats - Utility Function', () => {
    it('should return object with all categories', () => {
      const stats = getRuleStats()
      expect(stats).toHaveProperty('Makanan & Minuman')
      expect(stats).toHaveProperty('Transportasi')
      expect(stats).toHaveProperty('Belanja')
      expect(stats).toHaveProperty('Kesehatan')
      expect(stats).toHaveProperty('Hiburan')
      expect(stats).toHaveProperty('Tagihan & Utilitas')
      expect(stats).toHaveProperty('Pendidikan')
      expect(stats).toHaveProperty('Keuangan')
    })

    it('should have at least 1 rule per major category', () => {
      const stats = getRuleStats()
      Object.values(stats).forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(1)
      })
    })

    it('should count total rules >= 50', () => {
      const stats = getRuleStats()
      const total = Object.values(stats).reduce((sum, count) => sum + count, 0)
      expect(total).toBeGreaterThanOrEqual(50)
    })
  })

  describe('CATEGORIZATION_RULES - Export Validation', () => {
    it('should export non-empty rules array', () => {
      expect(CATEGORIZATION_RULES).toBeDefined()
      expect(CATEGORIZATION_RULES.length).toBeGreaterThanOrEqual(50)
    })

    it('should have all rules with required fields', () => {
      CATEGORIZATION_RULES.forEach((rule) => {
        expect(rule.pattern).toBeDefined()
        expect(rule.category).toBeDefined()
        expect(rule.confidence).toBeDefined()
        expect(typeof rule.confidence).toBe('number')
        expect(rule.confidence).toBeGreaterThan(0)
        expect(rule.confidence).toBeLessThanOrEqual(1)
      })
    })

    it('should have valid category names from seed list', () => {
      const validCategories = [
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

      CATEGORIZATION_RULES.forEach((rule) => {
        expect(validCategories).toContain(rule.category)
      })
    })
  })

  describe('matchCategory - Real-World Scenarios', () => {
    it('should handle mixed case with spaces: "PT Indomaret"', () => {
      const result = matchCategory('PT Indomaret', null)
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should handle real transaction pattern: "GOJEK GOCAR XXXX"', () => {
      const result = matchCategory('GOJEK GOCAR', 'Ongkos Gocar')
      expect(result?.category).toBe('Transportasi')
    })

    it('should handle real bank notification: "TOKOPEDIA PURCHASE"', () => {
      const result = matchCategory('TOKOPEDIA', 'Online shopping purchase')
      expect(result?.category).toBe('Belanja')
    })

    it('should handle real e-wallet: "GoPay Transfer"', () => {
      const result = matchCategory(null, 'gopay transfer')
      // "gopay" matches as food/minuman pattern, "transfer" matches keuangan
      // First match wins, so depends on rule order
      expect(result).not.toBeNull()
      if (result) {
        expect(['Makanan & Minuman', 'Keuangan']).toContain(result.category)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long merchant names', () => {
      const longMerchant =
        'PT Supermarket Indomaret Indonesia Cabang ' + 'x'.repeat(200)
      const result = matchCategory(longMerchant, null)
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should handle multiple spaces between words with "kopi kenangan"', () => {
      // Note: multiple consecutive spaces in regex require pattern to handle spaces
      // "kopi kenangan" (with normal spacing) should match
      const result = matchCategory('kopi kenangan', null)
      expect(result).not.toBeNull()
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should handle special characters in merchant name', () => {
      const result = matchCategory('Kopi-Kenangan @Coffee', null)
      expect(result?.category).toBe('Makanan & Minuman')
    })

    it('should handle numbers in merchant name', () => {
      const result = matchCategory('Indomaret 24 Jam', null)
      expect(result?.category).toBe('Makanan & Minuman')
    })
  })

  describe('Specificity Order - First Match Wins', () => {
    it('should prefer Gojek GoRide over generic Transportation', () => {
      const result = matchCategory('gojek', null)
      expect(result?.category).toBe('Transportasi')
    })

    it('should match Starbucks Coffee before generic Coffee pattern', () => {
      const result = matchCategory('starbucks', null)
      expect(result?.category).toBe('Makanan & Minuman')
      expect(result?.confidence).toBeGreaterThan(0.9)
    })
  })

  describe('Result Structure Validation', () => {
    it('should return proper RuleMatchResult object with all fields', () => {
      const result = matchCategory('indomaret', null)
      expect(result).toHaveProperty('category')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('matchedRule')
      expect(typeof result?.category).toBe('string')
      expect(typeof result?.confidence).toBe('number')
      expect(typeof result?.matchedRule).toBe('string')
    })
  })
})
