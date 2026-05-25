import { z } from 'zod'

export const parsedTransactionSchema = z.object({
  amount: z.number().int().positive(),
  type: z.enum(['expense', 'income', 'transfer']),
  merchant_name: z.string().max(100).nullable(),
  description: z.string().max(255).nullable(),
  payment_method: z.enum(['qris', 'transfer', 'cash', 'debit', 'credit', 'ewallet', 'other']),
  transacted_at: z.date(),
  reference_number: z.string().max(100).nullable(),
  raw_email_id: z.string().min(1),
  raw_snippet: z.string(),
  confidence: z.number().min(0).max(1),
  bank: z.string().min(1),
})

export type ValidatedParsedTransaction = z.infer<typeof parsedTransactionSchema>
