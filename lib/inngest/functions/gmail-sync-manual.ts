/**
 * Inngest Event Handler — Gmail Sync Manual Trigger
 * Dipanggil dari POST /api/sync/gmail, berjalan di background.
 *
 * JANGAN log nominal transaksi, nama merchant, atau data PII apapun.
 */

import { inngest } from '@/lib/inngest/client'
import { createClient } from '@supabase/supabase-js'
import { syncUserGmail } from '@/lib/gmail/sync'
import type { Database } from '@/types/database'

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for admin client')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const gmailSyncManualFunction = inngest.createFunction(
  {
    id: 'gmail-sync-manual',
    name: 'Gmail Sync — Manual Trigger',
    retries: 1,
  },
  { event: 'gmail/sync.manual' },
  async ({ event, logger }) => {
    const { userId, accessToken } = event.data as { userId: string; accessToken: string }

    logger.info('Manual gmail sync started', { userId })

    const adminSupabase = createAdminClient()
    const result = await syncUserGmail(adminSupabase, userId, accessToken)

    logger.info('Manual gmail sync complete', {
      transactionsCreated: result.transactionsCreated,
      errors: result.errors,
    })

    return result
  }
)
