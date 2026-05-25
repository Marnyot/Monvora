/**
 * Gmail sync orchestration untuk satu user.
 * Dipanggil oleh Inngest background job.
 *
 * JANGAN log nominal transaksi, nama merchant, atau email content.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { fetchNewEmails, isBankEmail, GmailTokenExpiredError } from '@/lib/gmail/client'
import { detectAndParse } from '@/lib/gmail/parsers/index'
import { categorizeTransaction } from '@/lib/ai/categorize'

// Register all bank parsers via side effects
import '@/lib/gmail/parsers/mandiri'
import '@/lib/gmail/parsers/bca'
import '@/lib/gmail/parsers/bni'
import '@/lib/gmail/parsers/bri'
import '@/lib/gmail/parsers/cimb'
import '@/lib/gmail/parsers/generic'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SyncResult {
  userId: string
  emailsProcessed: number
  transactionsCreated: number
  transactionsSkipped: number // duplikat
  errors: number
  newHistoryId: string | null
}

// ─── Main Orchestrator ─────────────────────────────────────────────────────────

/**
 * Sync Gmail untuk satu user.
 *
 * Alur:
 * 1. Ambil gmail_sync_token dari profiles
 * 2. Fetch emails baru via Gmail API
 * 3. Filter bank emails (isBankEmail)
 * 4. Untuk setiap email: check duplikat → parse → validate → categorize → insert
 * 5. Update historyId di profiles
 * 6. Log result ke gmail_sync_logs
 *
 * @param supabase - Supabase client (service role untuk background job)
 * @param userId   - User ID dari profiles table
 * @param accessToken - Google OAuth access token dari Supabase Auth
 */
export async function syncUserGmail(
  supabase: SupabaseClient<Database>,
  userId: string,
  accessToken: string
): Promise<SyncResult> {
  const result: SyncResult = {
    userId,
    emailsProcessed: 0,
    transactionsCreated: 0,
    transactionsSkipped: 0,
    errors: 0,
    newHistoryId: null,
  }

  const startedAt = new Date().toISOString()

  // 1. Ambil gmail_sync_token dari profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('gmail_sync_token, gmail_sync_enabled')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    await logSyncResult(supabase, userId, 'error', result, startedAt, 'Profile not found')
    return result
  }

  if (!profile.gmail_sync_enabled) {
    await logSyncResult(supabase, userId, 'skipped', result, startedAt, 'Gmail sync disabled')
    return result
  }

  const lastHistoryId = profile.gmail_sync_token ?? null

  // 2. Fetch emails baru
  let messages: Awaited<ReturnType<typeof fetchNewEmails>>['messages']
  let newHistoryId: string

  try {
    const fetched = await fetchNewEmails(accessToken, lastHistoryId)
    messages = fetched.messages
    newHistoryId = fetched.newHistoryId
  } catch (err) {
    const errorMsg = err instanceof GmailTokenExpiredError
      ? 'Gmail token expired'
      : 'Gmail API fetch failed'

    await logSyncResult(supabase, userId, 'error', result, startedAt, errorMsg)
    return result
  }

  result.newHistoryId = newHistoryId

  // 3. Filter bank emails
  const bankEmails = messages.filter(isBankEmail)
  result.emailsProcessed = bankEmails.length

  // 4. Proses setiap email bank
  for (const email of bankEmails) {
    try {
      // 4a. Cek duplikat berdasarkan raw_email_id
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('raw_email_id', email.id)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()

      if (existing) {
        result.transactionsSkipped++
        continue
      }

      // 4b. Parse email
      const parseResult = detectAndParse(email)

      if (!parseResult.transaction) {
        // Tidak dapat di-parse, skip tanpa error
        result.transactionsSkipped++
        continue
      }

      const tx = parseResult.transaction

      // 4c. Validate amount (harus integer positif)
      if (!Number.isInteger(tx.amount) || tx.amount <= 0) {
        result.errors++
        continue
      }

      // 4d. Categorize via AI pipeline (rules → gemini → fallback)
      const categoryResult = await categorizeTransaction(
        tx.merchant_name,
        tx.description,
        tx.amount,
        tx.payment_method ?? 'unknown'
      )

      // 4e. Ambil default wallet user (diambil dari wallets dengan is_active = true)
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()

      if (!wallet) {
        // Tidak ada wallet aktif, skip
        result.errors++
        continue
      }

      // 4f. Insert transaksi
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          wallet_id: wallet.id,
          amount: tx.amount,
          type: tx.type,
          source: 'gmail',
          merchant_name: tx.merchant_name,
          description: tx.description,
          payment_method: tx.payment_method,
          transacted_at: tx.transacted_at.toISOString(),
          reference_number: tx.reference_number,
          raw_email_id: tx.raw_email_id,
          raw_email_snippet: tx.raw_snippet,
          ai_category_raw: categoryResult.category,
          ai_category_confidence: categoryResult.category ? categoryResult.confidence : null,
          is_verified: false,
        })

      if (insertError) {
        result.errors++
        continue
      }

      result.transactionsCreated++
    } catch {
      // Jangan log detail error (bisa mengandung info transaksi)
      result.errors++
    }
  }

  // 5. Update historyId di profiles
  await supabase
    .from('profiles')
    .update({
      gmail_sync_token: newHistoryId,
      gmail_last_synced_at: new Date().toISOString(),
    })
    .eq('id', userId)

  // 6. Log result ke gmail_sync_logs
  const status =
    result.errors > 0 && result.transactionsCreated === 0 ? 'error' : 'success'

  await logSyncResult(supabase, userId, status, result, startedAt)

  return result
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function logSyncResult(
  supabase: SupabaseClient<Database>,
  userId: string,
  status: string,
  result: SyncResult,
  startedAt: string,
  errorMessage?: string
): Promise<void> {
  await supabase.from('gmail_sync_logs').insert({
    user_id: userId,
    status,
    emails_scanned: result.emailsProcessed,
    transactions_found: result.emailsProcessed,
    transactions_created: result.transactionsCreated,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    error_message: errorMessage ?? null,
  })
}
