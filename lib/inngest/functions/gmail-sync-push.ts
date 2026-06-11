/**
 * Inngest Event Handler — Gmail Sync from Push Notification
 * Dipanggil dari webhook Pub/Sub saat ada email baru.
 *
 * JANGAN log nominal transaksi, nama merchant, atau data PII apapun.
 */

import { inngest } from '@/lib/inngest/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncUserGmail } from '@/lib/gmail/sync'

export const gmailSyncPushFunction = inngest.createFunction(
  {
    id: 'gmail-sync-push',
    name: 'Gmail Sync — Push Trigger',
    retries: 1,
    concurrency: { limit: 5 },
    triggers: [{ event: 'gmail/sync.push' }],
  },
  async ({ event, logger }) => {
    const { userId } = event.data as { userId: string }

    logger.info('Push-triggered gmail sync started', { userId })

    const adminSupabase = createAdminClient()

    const { data: userData, error: userError } =
      await adminSupabase.auth.admin.getUserById(userId)

    if (userError || !userData.user) {
      logger.warn('Failed to get auth user for push sync', { userId })
      return { userId, transactionsCreated: 0, errors: 1 }
    }

    const identities = userData.user.identities ?? []
    const googleIdentity = identities.find(
      (identity) => identity.provider === 'google'
    )

    if (!googleIdentity) {
      logger.warn('No Google identity found for push sync', { userId })
      return { userId, transactionsCreated: 0, errors: 1 }
    }

    const accessToken =
      (googleIdentity.identity_data as Record<string, string> | null)
        ?.access_token ?? null

    if (!accessToken) {
      logger.warn('No access token for push sync', { userId })
      return { userId, transactionsCreated: 0, errors: 1 }
    }

    const result = await syncUserGmail(adminSupabase, userId, accessToken)

    logger.info('Push-triggered gmail sync complete', {
      transactionsCreated: result.transactionsCreated,
      errors: result.errors,
    })

    return result
  }
)
