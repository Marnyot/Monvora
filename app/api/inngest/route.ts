import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { gmailSyncFunction } from '@/lib/inngest/functions/gmail-sync'
import { gmailSyncManualFunction } from '@/lib/inngest/functions/gmail-sync-manual'
import { gmailSyncPushFunction } from '@/lib/inngest/functions/gmail-sync-push'
import { gmailWatchRenewalFunction } from '@/lib/inngest/functions/gmail-watch-renewal'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    gmailSyncFunction,
    gmailSyncManualFunction,
    gmailSyncPushFunction,
    gmailWatchRenewalFunction,
  ],
})
