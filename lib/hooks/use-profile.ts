import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/hooks/use-session'

const THIRTY_SEC = 30 * 1000

export function useProfile() {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    staleTime: THIRTY_SEC,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, gmail_sync_enabled, is_guest, onboarding_completed')
        .eq('id', user!.id)
        .single()
      if (error) throw new Error(error.message)
      return data
    },
  })

  return { ...query, sessionLoading }
}
