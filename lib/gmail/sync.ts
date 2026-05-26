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

type WalletRow = { id: string; provider: string | null; balance: number }

// ─── Main Orchestrator ─────────────────────────────────────────────────────────

/**
 * Sync Gmail untuk satu user.
 *
 * Alur:
 * 1. Ambil gmail_sync_token dari profiles
 * 2. Fetch emails baru via Gmail API
 * 3. Filter bank emails (isBankEmail)
 * 4. Prefetch semua wallets aktif (untuk matching + balance)
 * 5. Untuk setiap email: check duplikat → parse → match wallet → categorize → insert
 * 6. Update wallet balances
 * 7. Update historyId di profiles
 * 8. Log result ke gmail_sync_logs
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

  // Insert 'started' log dulu — UI polling butuh ini untuk tahu job sedang berjalan
  const { data: logRow } = await supabase
    .from('gmail_sync_logs')
    .insert({ user_id: userId, status: 'started', started_at: startedAt })
    .select('id')
    .single()
  const logId = logRow?.id ?? null

  // Helper: UPDATE log yang sudah ada (tidak insert baru)
  async function finalize(status: 'completed' | 'partial' | 'failed', errorMessage?: string) {
    if (!logId) return
    await supabase
      .from('gmail_sync_logs')
      .update({
        status,
        emails_scanned: result.emailsProcessed,
        transactions_found: result.transactionsCreated + result.transactionsSkipped,
        transactions_created: result.transactionsCreated,
        completed_at: new Date().toISOString(),
        error_message: errorMessage ?? null,
      })
      .eq('id', logId)
  }

  // 1. Ambil gmail_sync_token dari profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('gmail_sync_token, gmail_sync_enabled')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    await finalize('failed', 'Profile not found')
    return result
  }

  if (!profile.gmail_sync_enabled) {
    await finalize('failed', 'Gmail sync disabled')
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

    await finalize('failed', errorMsg)
    return result
  }

  result.newHistoryId = newHistoryId

  // 3. Filter bank emails
  const bankEmails = messages.filter(isBankEmail)
  result.emailsProcessed = bankEmails.length

  // 4. Prefetch semua wallet aktif (id, provider, balance) untuk matching
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, provider, balance')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (!wallets || wallets.length === 0) {
    await finalize('failed', 'No active wallet')
    return result
  }

  const defaultWallet = wallets[0] as WalletRow
  // Balance delta per wallet — di-update sekali setelah loop
  const balanceDeltas = new Map<string, number>()

  // 5. Proses setiap email bank
  for (const email of bankEmails) {
    try {
      // 5a. Cek duplikat berdasarkan raw_email_id
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

      // 5b. Parse email
      const parseResult = detectAndParse(email)

      if (!parseResult.transaction) {
        result.transactionsSkipped++
        continue
      }

      const tx = parseResult.transaction

      // 5c. Validate amount (harus integer positif)
      if (!Number.isInteger(tx.amount) || tx.amount <= 0) {
        result.errors++
        continue
      }

      // 5d. Match wallet by bank name (provider ILIKE bankName), fallback ke default
      const bankName = parseResult.bank?.toLowerCase() ?? null
      const matchedWallet: WalletRow = bankName
        ? ((wallets as WalletRow[]).find(w => w.provider?.toLowerCase().includes(bankName)) ?? defaultWallet)
        : defaultWallet

      // 5e. Categorize via AI pipeline (rules → gemini → fallback)
      const categoryResult = await categorizeTransaction(
        tx.merchant_name,
        tx.description,
        tx.amount,
        tx.payment_method ?? 'unknown'
      )

      // 5f. Insert transaksi
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          wallet_id: matchedWallet.id,
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

      // 5g. Track balance delta (expense=negatif, income=positif, transfer=0)
      const delta = tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0
      if (delta !== 0) {
        balanceDeltas.set(matchedWallet.id, (balanceDeltas.get(matchedWallet.id) ?? 0) + delta)
      }

      result.transactionsCreated++
    } catch {
      result.errors++
    }
  }

  // 6. Update wallet balances (satu UPDATE per wallet yang berubah)
  for (const [walletId, delta] of balanceDeltas) {
    const w = (wallets as WalletRow[]).find(w => w.id === walletId)
    if (w) {
      await supabase
        .from('wallets')
        .update({ balance: w.balance + delta })
        .eq('id', walletId)
        .eq('user_id', userId)
    }
  }

  // 7. Update historyId di profiles
  await supabase
    .from('profiles')
    .update({
      gmail_sync_token: newHistoryId,
      gmail_last_synced_at: new Date().toISOString(),
    })
    .eq('id', userId)

  // 8. Update sync log dengan hasil akhir
  const status: 'completed' | 'partial' | 'failed' =
    result.errors > 0 && result.transactionsCreated === 0 ? 'failed'
    : result.errors > 0 ? 'partial'
    : 'completed'

  await finalize(status)

  return result
}
