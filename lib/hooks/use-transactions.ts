import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/hooks/use-session'
import type { Database } from '@/types/database'

type TransactionRow = Database['public']['Tables']['transactions']['Row']

interface TransactionWithRelations extends TransactionRow {
  wallet: { id: string; name: string; color: string } | null
  category: { id: string; name: string; icon: string; color: string } | null
}

interface UseTransactionsParams {
  page?: number
  type?: string | null
  q?: string | null
}

const PAGE_SIZE = 20

export function useTransactions({ page = 1, type, q }: UseTransactionsParams = {}) {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['transactions', { userId: user?.id, page, type, q }],
    enabled: !!user?.id,
    queryFn: async () => {
      const supabase = createClient()

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let q_ = supabase
        .from('transactions')
        .select(`
          id, amount, type, description, merchant_name, payment_method, transacted_at,
          wallet:wallets!wallet_id(id, name, color),
          category:categories(id, name, icon, color)
        `, { count: 'exact' })
        .is('deleted_at', null)
        .order('transacted_at', { ascending: false })
        .range(from, to)

      if (type && ['expense', 'income', 'transfer'].includes(type)) {
        q_ = q_.eq('type', type)
      }

      if (q) {
        q_ = q_.or(`merchant_name.ilike.%${q}%,description.ilike.%${q}%`)
      }

      const { data: transactions, count } = await q_
      const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

      return {
        transactions: (transactions ?? []) as unknown as TransactionWithRelations[],
        count: count ?? 0,
        totalPages,
      }
    },
    staleTime: 30_000,
  })

  return { ...query, sessionLoading }
}
