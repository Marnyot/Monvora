'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/hooks/use-session'
import type { Database } from '@/types/database'

type TransactionRow = Database['public']['Tables']['transactions']['Row']

interface TransactionWithRelations extends TransactionRow {
  wallet: { id: string; name: string; color: string } | null
  category: { id: string; name: string; icon: string; color: string } | null
}

interface WalletSummary {
  id: string
  name: string
  balance: number
  color: string
}

interface DashboardData {
  wallets: WalletSummary[]
  totalBalance: number
  monthIncome: number
  monthExpense: number
  recentTransactions: TransactionWithRelations[]
  firstName: string
}

export function useDashboardData() {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['dashboard', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<DashboardData> => {
      const supabase = createClient()
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [{ data: wallets }, { data: txThisMonth }, { data: recentTx }] = await Promise.all([
        supabase
          .from('wallets')
          .select('id, name, balance, color')
          .eq('user_id', user!.id)
          .is('deleted_at', null)
          .eq('is_active', true),
        supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', user!.id)
          .is('deleted_at', null)
          .gte('transacted_at', firstOfMonth),
        supabase
          .from('transactions')
          .select(`
            id, amount, type, description, merchant_name, payment_method, transacted_at,
            wallet:wallets!wallet_id(id, name, color),
            category:categories(id, name, icon, color)
          `)
          .eq('user_id', user!.id)
          .is('deleted_at', null)
          .order('transacted_at', { ascending: false })
          .limit(10),
      ])

      const totalBalance = (wallets ?? []).reduce((sum, w) => sum + (w.balance ?? 0), 0)
      const monthIncome = (txThisMonth ?? []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const monthExpense = (txThisMonth ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const firstName = user!.user_metadata?.full_name?.split(' ')[0] ?? 'Kamu'

      return {
        wallets: (wallets ?? []) as WalletSummary[],
        totalBalance,
        monthIncome,
        monthExpense,
        recentTransactions: (recentTx ?? []) as unknown as TransactionWithRelations[],
        firstName,
      }
    },
    staleTime: 30_000,
  })

  return { ...query, sessionLoading }
}
