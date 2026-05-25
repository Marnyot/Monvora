import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { gmailSyncFunction } from '@/lib/inngest/functions/gmail-sync'
import { gmailSyncManualFunction } from '@/lib/inngest/functions/gmail-sync-manual'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [gmailSyncFunction, gmailSyncManualFunction],
})
