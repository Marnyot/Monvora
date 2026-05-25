import { z } from 'zod'

export const PAYMENT_METHODS = ['qris', 'transfer', 'cash', 'debit', 'credit', 'ewallet', 'other'] as const
export const TRANSACTION_TYPES = ['expense', 'income', 'transfer'] as const
export const TRANSACTION_SOURCES = ['manual', 'gmail', 'ocr'] as const

export const createTransactionSchema = z.object({
  wallet_id: z.string().uuid('Wallet ID tidak valid'),
  category_id: z.string().uuid('Category ID tidak valid').optional(),
  amount: z.number().int('Amount harus bilangan bulat').positive('Amount harus lebih dari 0'),
  type: z.enum(TRANSACTION_TYPES),
  description: z.string().max(255).optional(),
  merchant_name: z.string().max(100).optional(),
  payment_method: z.enum(PAYMENT_METHODS).optional(),
  transacted_at: z.string().datetime({ offset: true }),
})

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  is_verified: z.boolean().optional(),
})

export const listTransactionSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(TRANSACTION_TYPES).optional(),
  category_id: z.string().uuid().optional(),
  wallet_id: z.string().uuid().optional(),
  payment_method: z.enum(PAYMENT_METHODS).optional(),
  source: z.enum(TRANSACTION_SOURCES).optional(),
  is_verified: z.coerce.boolean().optional(),
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date: z.string().datetime({ offset: true }).optional(),
  search: z.string().max(100).optional(),
  sort_by: z.enum(['transacted_at', 'amount', 'created_at']).default('transacted_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type ListTransactionInput = z.infer<typeof listTransactionSchema>
