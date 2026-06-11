import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from './use-session'

export interface WalletItem {
  id: string
  name: string
  type: string
  provider: string | null
  balance: number | null
  color: string | null
  icon: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export function useWallets() {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['wallets', user?.id],
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('wallets')
        .select('id, name, type, provider, balance, color, icon, is_active, created_at, updated_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      return (data ?? []) as WalletItem[]
    },
  })

  return { ...query, sessionLoading }
}
