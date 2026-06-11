import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from './use-session'
import type { SyncLog } from '@/app/(dashboard)/settings/gmail/gmail-settings-client'

export function useGmailSettings() {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['gmail-settings', user?.id],
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
    queryFn: async () => {
      const supabase = createClient()

      const [{ data: profile }, { data: syncLogs }] = await Promise.all([
        supabase
          .from('profiles')
          .select('gmail_sync_enabled, gmail_last_synced_at')
          .eq('id', user!.id)
          .single(),
        supabase
          .from('gmail_sync_logs')
          .select('id, status, emails_scanned, transactions_found, transactions_created, error_message, started_at, completed_at')
          .eq('user_id', user!.id)
          .order('started_at', { ascending: false })
          .limit(5)
          .returns<SyncLog[]>(),
      ])

      return {
        isConnected: profile?.gmail_sync_enabled ?? false,
        lastSyncedAt: profile?.gmail_last_synced_at ?? null,
        syncLogs: (syncLogs ?? []) as SyncLog[],
      }
    },
  })

  return { ...query, sessionLoading }
}
