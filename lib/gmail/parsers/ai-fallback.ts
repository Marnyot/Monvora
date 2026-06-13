// AI fallback for emails that no specific or generic parser handled.
//
// Design notes:
// - Gated by per-user daily budget (gmail_ai_usage_daily table). Budget is
//   counted in WIB calendar days.
// - The resulting ParsedTransaction is deliberately indistinguishable from a
//   rule-based one: the `bank` field is the bank Gemini inferred (e.g.
//   'mandiri'), never the literal string 'ai'. UI never learns AI was used.
// - Caller (sync.ts) decides when to invoke this — typically when the
//   registry chain returned null or a low-confidence result.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseEmailWithAi } from '@/lib/ai/email-parser'

const DAILY_BUDGET = 30
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

function jakartaDateKey(now: Date): string {
  const j = new Date(now.getTime() + JAKARTA_OFFSET_MS)
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, '0')}-${String(j.getUTCDate()).padStart(2, '0')}`
}

async function reserveDailyBudget(
  supabase: SupabaseClient<Database>,
  userId: string,
  now: Date
): Promise<boolean> {
  // Atomic increment-with-cap via Postgres RPC. The previous read-then-upsert
  // raced under parallel email processing (Promise.allSettled in sync.ts) —
  // two concurrent calls could both observe count=29 and both write 30,
  // burning extra Gemini calls. The RPC's UPDATE...WHERE call_count < cap
  // makes it impossible to exceed the budget.
  const { data, error } = await supabase.rpc('gmail_ai_reserve_call', {
    p_user_id: userId,
    p_usage_date: jakartaDateKey(now),
    p_max_count: DAILY_BUDGET,
  })

  if (error) return false
  // RPC returns NULL when the cap was already hit.
  return typeof data === 'number'
}

export interface AiFallbackOptions {
  supabase: SupabaseClient<Database>
  userId: string
  email: GmailMessage
  now?: Date
}

export async function aiFallbackParse(
  opts: AiFallbackOptions
): Promise<ParsedTransaction | null> {
  const now = opts.now ?? new Date()

  const budgetOk = await reserveDailyBudget(opts.supabase, opts.userId, now)
  if (!budgetOk) return null

  const outcome = await parseEmailWithAi({
    subject: opts.email.subject,
    from: opts.email.from,
    body: opts.email.body,
    emailDate: opts.email.date,
  })

  if (!outcome.ok) return null

  const r = outcome.data

  // Keep raw_snippet short and free of formatting characters.
  const rawSnippet = opts.email.body
    .substring(0, 200)
    .replace(/\s+/g, ' ')
    .trim()

  // bank field carries Gemini's best guess at the actual bank, never the
  // string 'ai'. 'unknown' is the explicit unknown sentinel — same vocabulary
  // a hand-written parser would emit.
  const bankName = r.bankName && r.bankName !== 'ai' ? r.bankName : 'unknown'

  let transactedAt: Date
  const parsedDate = new Date(r.transactedAt)
  transactedAt = Number.isNaN(parsedDate.getTime()) ? new Date(opts.email.date) : parsedDate

  return {
    amount: r.amount,
    type: r.type,
    merchant_name: r.merchantName,
    description: r.description,
    payment_method: r.paymentMethod,
    transacted_at: transactedAt,
    reference_number: r.referenceNumber,
    raw_email_id: opts.email.id,
    raw_snippet: rawSnippet,
    confidence: r.confidence,
    bank: bankName,
  }
}
