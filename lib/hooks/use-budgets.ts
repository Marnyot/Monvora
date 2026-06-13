import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/hooks/use-session'
import {
  computeBudgetStatus,
  periodWindow,
  type BudgetInput,
  type BudgetPeriod,
  type BudgetStatusResult,
  type BudgetTxn,
} from '@/lib/budgets/utilization'

export interface BudgetWithUtilization {
  id: string
  name: string
  amount: number
  period: BudgetPeriod
  category_id: string | null
  category: { id: string; name: string; icon: string; color: string } | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  utilization: BudgetStatusResult
}

const STALE = 60_000 // 1 minute — utilization changes with every transaction

export function useBudgets() {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['budgets', { userId: user?.id }],
    enabled: !!user?.id,
    staleTime: STALE,
    gcTime: STALE * 5,
    queryFn: async (): Promise<BudgetWithUtilization[]> => {
      const supabase = createClient()
      const now = new Date()

      const { data: budgets, error: budgetErr } = await supabase
        .from('budgets')
        .select(`
          id, name, amount, period, category_id, is_active, created_at, updated_at,
          category:categories(id, name, icon, color)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (budgetErr) throw new Error(budgetErr.message || 'Gagal memuat budget')
      if (!budgets || budgets.length === 0) return []

      // Fetch transactions covering the longest active period window.
      const periods = new Set<BudgetPeriod>(budgets.map((b) => b.period as BudgetPeriod))
      const earliest = periods.has('yearly')
        ? periodWindow('yearly', now).start
        : periods.has('monthly')
        ? periodWindow('monthly', now).start
        : periodWindow('weekly', now).start

      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select('amount, type, transacted_at, category_id')
        .is('deleted_at', null)
        .eq('type', 'expense')
        .gte('transacted_at', earliest.toISOString())

      if (txErr) throw new Error(txErr.message || 'Gagal memuat transaksi')

      const allTxs: BudgetTxn[] = (txs ?? []).map((t) => ({
        amount: t.amount as number,
        type: t.type as BudgetTxn['type'],
        transacted_at: t.transacted_at as string,
        category_id: t.category_id as string | null,
      }))

      return budgets.map((b) => {
        const input: BudgetInput = {
          id: b.id as string,
          amount: b.amount as number,
          period: b.period as BudgetPeriod,
          category_id: b.category_id as string | null,
        }
        const status = computeBudgetStatus(input, allTxs, now)
        const cat = Array.isArray(b.category) ? b.category[0] : b.category
        return {
          id: b.id as string,
          name: b.name as string,
          amount: b.amount as number,
          period: b.period as BudgetPeriod,
          category_id: b.category_id as string | null,
          category: (cat as BudgetWithUtilization['category']) ?? null,
          is_active: b.is_active as boolean | null,
          created_at: b.created_at as string | null,
          updated_at: b.updated_at as string | null,
          utilization: status,
        }
      })
    },
  })

  return { ...query, sessionLoading }
}
