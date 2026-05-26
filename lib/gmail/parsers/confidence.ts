import type { ParsedTransaction } from '@/types/parser'

export function calculateConfidence(result: Partial<ParsedTransaction>): number {
  const criticalFields = [
    result.amount != null && result.amount > 0,
    result.transacted_at != null,
    result.type != null,
  ]

  const importantFields = [
    result.merchant_name != null && result.merchant_name.length > 0,
    result.payment_method != null && result.payment_method !== 'other',
    result.reference_number != null,
  ]

  const criticalScore = criticalFields.filter(Boolean).length / criticalFields.length
  const importantScore = importantFields.filter(Boolean).length / importantFields.length

  const score = criticalScore * 0.7 + importantScore * 0.3
  return Math.round(score * 100) / 100
}
