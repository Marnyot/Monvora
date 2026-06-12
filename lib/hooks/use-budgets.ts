import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/hooks/use-session'
import type { BudgetPeriod, BudgetStatusResult } from '@/lib/budgets/utilization'

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

interface BudgetsEnvelope {
  data: BudgetWithUtilization[] | null
  error: { code: string; message: string } | null
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
      const res = await fetch('/api/budgets', { credentials: 'same-origin' })
      const json: BudgetsEnvelope = await res.json()
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? 'Gagal memuat budget')
      }
      return json.data
    },
  })

  return { ...query, sessionLoading }
}
