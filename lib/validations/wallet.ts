import { z } from 'zod'

export const WALLET_TYPES = ['bank', 'ewallet', 'cash', 'other'] as const

export const createWalletSchema = z.object({
  name: z.string().min(1, 'Nama wallet wajib diisi').max(50),
  type: z.enum(WALLET_TYPES),
  provider: z.string().max(50).optional(),
  balance: z.number().int('Saldo harus bilangan bulat').min(0).default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Format warna tidak valid').default('#6366f1'),
  icon: z.string().max(50).optional(),
})

export const updateWalletSchema = createWalletSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export type CreateWalletInput = z.infer<typeof createWalletSchema>
export type UpdateWalletInput = z.infer<typeof updateWalletSchema>
