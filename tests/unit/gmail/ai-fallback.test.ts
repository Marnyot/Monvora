import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GmailMessage } from '@/types/parser'

const mockParseEmailWithAi = vi.fn()
vi.mock('@/lib/ai/email-parser', () => ({
  parseEmailWithAi: (...args: unknown[]) => mockParseEmailWithAi(...args),
}))

import { aiFallbackParse } from '@/lib/gmail/parsers/ai-fallback'

function makeSupabase(currentCount: number) {
  const upsertCalls: unknown[] = []
  const supabase = {
    from(table: string) {
      if (table === 'gmail_ai_usage_daily') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: currentCount > 0 ? { call_count: currentCount } : null,
                        error: null,
                      }),
                    }
                  },
                }
              },
            }
          },
          upsert(row: unknown) {
            upsertCalls.push(row)
            return Promise.resolve({ error: null })
          },
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  }
  return { supabase: supabase as never, upsertCalls }
}

const email: GmailMessage = {
  id: 'msg-1',
  threadId: 'thread-1',
  subject: 'Notifikasi Transaksi',
  from: 'bank@example.com',
  body: 'Anda telah melakukan transaksi sebesar Rp 50.000.',
  date: 'Fri, 13 Jun 2026 14:30:00 +0700',
  snippet: 'Anda telah melakukan transaksi',
}

beforeEach(() => {
  mockParseEmailWithAi.mockReset()
})

describe('aiFallbackParse', () => {
  it('returns null and skips Gemini when daily budget exhausted', async () => {
    const { supabase, upsertCalls } = makeSupabase(30)
    const tx = await aiFallbackParse({ supabase, userId: 'u-1', email })
    expect(tx).toBeNull()
    expect(mockParseEmailWithAi).not.toHaveBeenCalled()
    expect(upsertCalls).toHaveLength(0)
  })

  it('calls Gemini and converts result when budget available', async () => {
    const { supabase, upsertCalls } = makeSupabase(0)
    mockParseEmailWithAi.mockResolvedValue({
      ok: true,
      data: {
        amount: 50000,
        type: 'expense',
        merchantName: 'Tokopedia',
        description: null,
        paymentMethod: 'qris',
        transactedAt: '2026-06-13T14:30:00+07:00',
        referenceNumber: 'TRX99',
        bankName: 'mandiri',
        confidence: 0.85,
      },
    })

    const tx = await aiFallbackParse({ supabase, userId: 'u-1', email })
    expect(tx).not.toBeNull()
    expect(tx?.amount).toBe(50000)
    expect(tx?.bank).toBe('mandiri')
    expect(tx?.confidence).toBeCloseTo(0.85)
    expect(tx?.raw_email_id).toBe('msg-1')
    expect(upsertCalls).toHaveLength(1)
  })

  it('substitutes "unknown" for any bank_name that leaks "ai"', async () => {
    const { supabase } = makeSupabase(0)
    mockParseEmailWithAi.mockResolvedValue({
      ok: true,
      data: {
        amount: 25000,
        type: 'expense',
        merchantName: null,
        description: null,
        paymentMethod: 'other',
        transactedAt: '2026-06-13T14:30:00+07:00',
        referenceNumber: null,
        bankName: 'ai',
        confidence: 0.5,
      },
    })

    const tx = await aiFallbackParse({ supabase, userId: 'u-1', email })
    expect(tx?.bank).toBe('unknown')
  })

  it('returns null when Gemini upstream fails', async () => {
    const { supabase } = makeSupabase(0)
    mockParseEmailWithAi.mockResolvedValue({ ok: false, kind: 'upstream', errorId: 'ERR_x' })
    const tx = await aiFallbackParse({ supabase, userId: 'u-1', email })
    expect(tx).toBeNull()
  })
})
