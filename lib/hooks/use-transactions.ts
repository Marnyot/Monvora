import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type TransactionRow = Database['public']['Tables']['transactions']['Row']

interface TransactionWithRelations extends TransactionRow {
  wallet: { id: string; name: string; color: string } | null
  category: { id: string; name: string; icon: string; color: string } | null
}

interface UseTransactionsParams {
  userId: string
  page?: number
  type?: string | null
  q?: string | null
}

const PAGE_SIZE = 20

export function useTransactions({ userId, page = 1, type, q }: UseTransactionsParams) {
  return useQuery({
    queryKey: ['transactions', { userId, page, type, q }],
    queryFn: async () => {
      const supabase = createClient()

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('transactions')
        .select(`
          id, amount, type, description, merchant_name, payment_method, transacted_at,
          wallet:wallets!wallet_id(id, name, color),
          category:categories(id, name, icon, color)
        `, { count: 'exact' })
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('transacted_at', { ascending: false })
        .range(from, to)

      if (type && ['expense', 'income', 'transfer'].includes(type)) {
        query = query.eq('type', type)
      }

      if (q) {
        query = query.or(`merchant_name.ilike.%${q}%,description.ilike.%${q}%`)
      }

      const { data: transactions, count } = await query
      const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

      return {
        transactions: (transactions ?? []) as unknown as TransactionWithRelations[],
        count: count ?? 0,
        totalPages,
      }
    },
    staleTime: 30_000,
  })
}
