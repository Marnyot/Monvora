import { z } from 'zod'

export const TRANSACTION_TYPES = ['expense', 'income', 'transfer'] as const

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi').max(50),
  icon: z.string().min(1, 'Icon wajib dipilih').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Format warna tidak valid'),
  type: z.enum(TRANSACTION_TYPES),
})

export const updateCategorySchema = createCategorySchema.partial()

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
