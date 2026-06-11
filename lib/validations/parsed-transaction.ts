import { z } from 'zod'

export const parsedTransactionSchema = z.object({
  amount: z.number().int().positive().max(999_999_999),
  type: z.enum(['expense', 'income', 'transfer']),
  merchant_name: z.string().max(100).nullable()
    .transform(val => val?.replace(/<[^>]*>/g, '').trim() ?? null),
  description: z.string().max(255).nullable()
    .transform(val => val?.replace(/<[^>]*>/g, '').trim() ?? null),
  payment_method: z.enum(['qris', 'transfer', 'cash', 'debit', 'credit', 'ewallet', 'topup', 'other']),
  transacted_at: z.date(),
  reference_number: z.string().max(100).nullable(),
  raw_email_id: z.string().min(1),
  raw_snippet: z.string().max(1000),
  confidence: z.number().min(0).max(1),
  bank: z.string().min(1),
})

export type ValidatedParsedTransaction = z.infer<typeof parsedTransactionSchema>
