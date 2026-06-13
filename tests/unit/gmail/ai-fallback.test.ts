import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GmailMessage } from '@/types/parser'

const mockParseEmailWithAi = vi.fn()
vi.mock('@/lib/ai/email-parser', () => ({
  parseEmailWithAi: (...args: unknown[]) => mockParseEmailWithAi(...args),
}))

import { aiFallbackParse } from '@/lib/gmail/parsers/ai-fallback'

function makeSupabase(reservedCount: number | null) {
  // reservedCount === null simulates the RPC returning NULL (cap exhausted).
  // A positive integer simulates a successful atomic reservation.
  const rpcCalls: Array<{ fn: string; args: unknown }> = []
  const supabase = {
    rpc(fn: string, args: unknown) {
      rpcCalls.push({ fn, args })
      return Promise.resolve({ data: reservedCount, error: null })
    },
  }
  return { supabase: supabase as never, rpcCalls }
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
    const { supabase, rpcCalls } = makeSupabase(null)
    const tx = await aiFallbackParse({ supabase, userId: 'u-1', email })
    expect(tx).toBeNull()
    expect(mockParseEmailWithAi).not.toHaveBeenCalled()
    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].fn).toBe('gmail_ai_reserve_call')
  })

  it('calls Gemini and converts result when budget available', async () => {
    const { supabase, rpcCalls } = makeSupabase(1)
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
    expect(rpcCalls).toHaveLength(1)
  })

  it('substitutes "unknown" for any bank_name that leaks "ai"', async () => {
    const { supabase } = makeSupabase(1)
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
    const { supabase } = makeSupabase(1)
    mockParseEmailWithAi.mockResolvedValue({ ok: false, kind: 'upstream', errorId: 'ERR_x' })
    const tx = await aiFallbackParse({ supabase, userId: 'u-1', email })
    expect(tx).toBeNull()
  })
})
