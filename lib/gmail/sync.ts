/**
 * Gmail sync orchestration untuk satu user.
 * Dipanggil oleh Inngest background job.
 *
 * JANGAN log nominal transaksi, nama merchant, atau email content.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { fetchNewEmails, isBankEmail, GmailTokenExpiredError, GmailRateLimitError } from '@/lib/gmail/client'
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

type WalletRow = { id: string; name: string | null; provider: string | null; balance: number }

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

  // ── Concurrency guard ──────────────────────────────────────────
  // Cek apakah ada sync lain yang sedang berjalan untuk user ini.
  // Jika ada dan masih fresh (<30 menit), skip untuk mencegah duplikasi log & transaksi.
  // Jika sudah stale (>=30 menit, kemungkinan crash), finalize sebagai failed dan lanjut.
  const { data: runningLog } = await supabase
    .from('gmail_sync_logs')
    .select('id, started_at')
    .eq('user_id', userId)
    .eq('status', 'started')
    .maybeSingle()

  if (runningLog) {
    const elapsed = Date.now() - new Date(runningLog.started_at ?? startedAt).getTime()
    const STALE_TIMEOUT = 30 * 60 * 1000 // 30 menit

    if (elapsed < STALE_TIMEOUT) {
      return result
    }

    await supabase
      .from('gmail_sync_logs')
      .update({
        status: 'failed',
        error_message: 'Sync sebelumnya tidak selesai (timeout)',
        completed_at: startedAt,
      })
      .eq('id', runningLog.id)
  }

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
    if (err instanceof GmailTokenExpiredError) {
      await finalize('failed', 'Token Gmail kadaluarsa. Silakan login ulang.')
    } else if (err instanceof GmailRateLimitError) {
      await finalize('failed', `Gmail API batasi permintaan. Coba ${Math.ceil(err.retryAfter / 60)} menit lagi.`)
    } else {
      await finalize('failed', 'Gagal mengambil email. Coba lagi nanti.')
    }
    return result
  }

  result.newHistoryId = newHistoryId

  // 3. Filter bank emails
  const bankEmails = messages.filter(isBankEmail)
  result.emailsProcessed = bankEmails.length

  // 4. Prefetch semua wallet aktif (id, name, provider, balance) untuk matching
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name, provider, balance')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (!wallets || wallets.length === 0) {
    await finalize('failed', 'No active wallet')
    return result
  }

  // Prefer non-cash wallet as default; avoid Tunai/Cash which are rarely the right target
  const defaultWallet =
    (wallets as WalletRow[]).find(w =>
      !['tunai', 'cash'].includes(w.name?.toLowerCase() ?? '')
    ) ?? wallets[0] as WalletRow
  // Balance delta per wallet — di-update sekali setelah loop
  const balanceDeltas = new Map<string, number>()

  // 5. Proses setiap email bank secara paralel
  const emailResults = await Promise.allSettled(
    bankEmails.map(async (email) => {
      // 5a → removed: duplicate check now handled by DB unique constraint (see step 5f)
      // 5b. Parse email
      const parseResult = detectAndParse(email)

      if (!parseResult.transaction) {
        return { kind: 'skipped' as const }
      }

      const tx = parseResult.transaction

      // 5c. Validate amount (harus integer positif)
      if (!Number.isInteger(tx.amount) || tx.amount <= 0) {
        return { kind: 'error' as const }
      }

      // 5d. Match wallet by bank name — check provider AND name (case-insensitive), fallback ke default
      const bankName = parseResult.bank?.toLowerCase() ?? null
      const matchedWallet: WalletRow = bankName
        ? ((wallets as WalletRow[]).find(w =>
            w.provider?.toLowerCase().includes(bankName) ||
            w.name?.toLowerCase().includes(bankName)
          ) ?? defaultWallet)
        : defaultWallet

      // 5e. Categorize via AI pipeline (rules → gemini → fallback)
      const categoryResult = await categorizeTransaction(
        tx.merchant_name,
        tx.description,
        tx.amount,
        tx.payment_method ?? 'unknown'
      )

      // 5f. Insert transaksi — idempotent via DB unique constraint on (user_id, raw_email_id).
      //     23505 = unique_violation: email already processed by a concurrent sync (race condition).
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
        .select('id')
        .limit(1)

      if (insertError) {
        if ((insertError as { code?: string }).code === '23505') {
          return { kind: 'skipped' as const }
        }
        return { kind: 'error' as const }
      }

      // 5g. Track balance delta (expense=negatif, income=positif, transfer=0)
      const delta = tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0

      return { kind: 'created' as const, walletId: matchedWallet.id, delta }
    })
  )

  for (const settled of emailResults) {
    if (settled.status === 'rejected') {
      result.errors++
      continue
    }

    const r = settled.value

    if (r.kind === 'skipped') {
      result.transactionsSkipped++
    } else if (r.kind === 'error') {
      result.errors++
    } else if (r.kind === 'created') {
      result.transactionsCreated++
      if (r.delta !== 0) {
        balanceDeltas.set(r.walletId, (balanceDeltas.get(r.walletId) ?? 0) + r.delta)
      }
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
