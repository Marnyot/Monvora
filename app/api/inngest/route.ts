import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { gmailSyncFunction } from '@/lib/inngest/functions/gmail-sync'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [gmailSyncFunction],
})
