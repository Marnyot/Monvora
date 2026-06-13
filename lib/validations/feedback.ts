import { z } from 'zod'

export const FEEDBACK_CATEGORIES = ['bug', 'feature', 'praise', 'other'] as const
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

export const createFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  body: z
    .string()
    .trim()
    .min(5, 'Minimal 5 karakter')
    .max(2000, 'Maksimal 2000 karakter'),
  app_version: z.string().max(50).optional(),
  user_agent: z.string().max(500).optional(),
})

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>
