import { z } from 'zod'

export const BUDGET_PERIODS = ['weekly', 'monthly', 'yearly'] as const

export const createBudgetSchema = z.object({
  name: z.string().min(1, 'Nama budget wajib diisi').max(50),
  amount: z.number().int('Nominal harus bilangan bulat').positive('Nominal harus lebih dari 0').max(999_999_999_999),
  period: z.enum(BUDGET_PERIODS),
  category_id: z.string().uuid().nullable().optional(),
})

export const updateBudgetSchema = createBudgetSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>
