import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from './use-session'

export function useTransactionDetail(id: string) {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['transaction', id, user?.id],
    enabled: !!user?.id && !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const supabase = createClient()

      const { data: transaction } = await supabase
        .from('transactions')
        .select(`
          id, amount, type, description, merchant_name, payment_method,
          source, is_verified, transacted_at, created_at,
          wallet:wallets!wallet_id(id, name, color),
          category:categories(id, name, icon, color)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      return { transaction }
    },
  })

  return { ...query, sessionLoading }
}
