import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from './use-session'

export function useDashboard() {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['dashboard', user?.id],
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const supabase = createClient()

      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // Defense in depth: explicit user_id on every row-scoped query
      // (security.md §4). RLS is still the authoritative gate.
      const uid = user!.id
      const [
        { data: wallets },
        { data: txThisMonth },
        { data: recentTx },
        { data: profile },
      ] = await Promise.all([
        supabase
          .from('wallets')
          .select('id, name, balance, color')
          .eq('user_id', uid)
          .is('deleted_at', null)
          .eq('is_active', true),
        supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', uid)
          .is('deleted_at', null)
          .gte('transacted_at', firstOfMonth),
        supabase
          .from('transactions')
          .select(`
            id, amount, type, description, merchant_name, payment_method, transacted_at, is_recurring,
            wallet:wallets!wallet_id(id, name, color),
            category:categories(id, name, icon, color)
          `)
          .eq('user_id', uid)
          .is('deleted_at', null)
          .order('transacted_at', { ascending: false })
          .limit(10),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', uid)
          .single(),
      ])

      return { wallets: wallets ?? [], txThisMonth: txThisMonth ?? [], recentTx: recentTx ?? [], profile }
    },
  })

  return { ...query, sessionLoading }
}
