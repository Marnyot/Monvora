/**
 * Inngest Cron Job — Gmail Sync All Active Users
 * Berjalan setiap 15 menit, memproses semua users dengan gmail_sync_enabled = true
 *
 * JANGAN log nominal transaksi, nama merchant, atau data PII apapun.
 */

import { inngest } from '@/lib/inngest/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncUserGmail } from '@/lib/gmail/sync'

const BATCH_SIZE = 50

export const gmailSyncFunction = inngest.createFunction(
  {
    id: 'gmail-sync',
    name: 'Gmail Sync — All Active Users',
    concurrency: { limit: 5 },
    retries: 0,
    triggers: [{ cron: '*/15 * * * *' }],
  },
  async ({ step, logger }) => {
    // ── 1. Buat admin client ─────────────────────────────────────────────────
    const adminSupabase = createAdminClient()

    // ── 2. Fetch semua users dengan gmail_sync_enabled = true ────────────────
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('gmail_sync_enabled', true)

    if (profilesError) {
      logger.error('Failed to fetch active profiles', { error: profilesError.message })
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    const users = profiles ?? []
    logger.info(`Starting gmail sync`, { userCount: users.length })

    if (users.length === 0) {
      return {
        usersProcessed: 0,
        totalTransactions: 0,
        errors: 0,
      }
    }

    // ── 3. Process in batches of BATCH_SIZE ──────────────────────────────────
    let usersProcessed = 0
    let totalTransactions = 0
    let totalErrors = 0

    // Batching: jika lebih dari 50 users, proses per batch
    const batches: Array<typeof users> = []
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      batches.push(users.slice(i, i + BATCH_SIZE))
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]

      // ── 4. Jalankan step.run() per user agar Inngest track per-user ────────
      const batchResults = await Promise.allSettled(
        batch.map((profile) =>
          step.run(`sync-user-${profile.id}`, async () => {
            // Ambil OAuth access token dari Supabase Auth
            const { data: userData, error: userError } =
              await adminSupabase.auth.admin.getUserById(profile.id)

            if (userError || !userData.user) {
              logger.warn(`Failed to get auth user`, { userId: profile.id })
              return { userId: profile.id, transactionsCreated: 0, errors: 1 }
            }

            // Extract Google OAuth access token
            const identities = userData.user.identities ?? []
            const googleIdentity = identities.find(
              (identity) => identity.provider === 'google'
            )

            if (!googleIdentity) {
              logger.warn(`No Google identity found for user`, { userId: profile.id })
              return { userId: profile.id, transactionsCreated: 0, errors: 1 }
            }

            // Access token tersimpan di identity_data atau via session
            const accessToken =
              (googleIdentity.identity_data as Record<string, string> | null)
                ?.access_token ?? null

            if (!accessToken) {
              logger.warn(`No access token for user`, { userId: profile.id })
              return { userId: profile.id, transactionsCreated: 0, errors: 1 }
            }

            // ── Jalankan sync untuk user ini ─────────────────────────────────
            const syncResult = await syncUserGmail(adminSupabase, profile.id, accessToken)

            return {
              userId: profile.id,
              transactionsCreated: syncResult.transactionsCreated,
              errors: syncResult.errors,
            }
          })
        )
      )

      // ── 5. Hitung summary ─────────────────────────────────────────────────
      for (const settledResult of batchResults) {
        usersProcessed++
        if (settledResult.status === 'fulfilled') {
          totalTransactions += settledResult.value.transactionsCreated
          totalErrors += settledResult.value.errors
        } else {
          totalErrors++
          // Jika satu user gagal, lanjut ke user berikutnya (sudah handled oleh allSettled)
        }
      }

      logger.info(`Batch ${batchIndex + 1}/${batches.length} complete`, {
        batchSize: batch.length,
      })
    }

    // ── 6. Log summary (JANGAN log data sensitif) ────────────────────────────
    logger.info('Gmail sync complete', {
      usersProcessed,
      totalTransactions,
      errors: totalErrors,
    })

    return {
      usersProcessed,
      totalTransactions,
      errors: totalErrors,
    }
  }
)
