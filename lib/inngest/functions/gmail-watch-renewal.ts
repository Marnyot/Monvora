/**
 * Inngest Cron Job — Gmail Watch Renewal
 * Berjalan setiap 6 jam, renew watch untuk user yang akan expired dalam 24 jam.
 *
 * JANGAN log email address, userId, atau data sensitif.
 */

import { inngest } from '@/lib/inngest/client'
import { createClient } from '@supabase/supabase-js'
import { setupWatch } from '@/lib/gmail/watch'
import type { Database } from '@/types/database'

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const gmailWatchRenewalFunction = inngest.createFunction(
  {
    id: 'gmail-watch-renewal',
    name: 'Gmail Watch — Renew Expiring',
    retries: 0,
    triggers: [{ cron: '0 */6 * * *' }],
  },
  async ({ step, logger }) => {
    const adminSupabase = createAdminClient()

    // Cari user yang watch-nya akan expired dalam 24 jam
    const limit = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('gmail_sync_enabled', true)
      .lt('gmail_watch_expiration', limit)

    if (profilesError) {
      logger.error('Failed to fetch profiles for watch renewal', { error: profilesError.message })
      return { usersProcessed: 0 }
    }

    const users = profiles ?? []
    logger.info('Watch renewal needed for users', { count: users.length })

    let processed = 0
    for (const profile of users) {
      const result = await step.run(`renew-${profile.id}`, async () => {
        try {
          const { data: userData } = await adminSupabase.auth.admin.getUserById(profile.id)
          if (!userData?.user) return false

          const identities = userData.user.identities ?? []
          const googleIdentity = identities.find(i => i.provider === 'google')
          const accessToken =
            (googleIdentity?.identity_data as Record<string, string> | null)
              ?.access_token ?? null
          if (!accessToken) return false

          await setupWatch(accessToken, adminSupabase, profile.id)
          return true
        } catch {
          return false
        }
      })

      if (result) processed++
    }

    logger.info('Watch renewal complete', { processed, total: users.length })

    return { usersProcessed: processed }
  }
)
