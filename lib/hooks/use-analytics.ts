import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/hooks/use-session'
import { aggregate, type AnalyticsInput, type AnalyticsResult } from '@/lib/analytics/aggregate'

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000
const FIVE_MIN = 5 * 60 * 1000

// 6-month trend window: start of (current month - 5) at 00:00 WIB.
function trendWindowStart(now: Date): string {
  const j = new Date(now.getTime() + JAKARTA_OFFSET_MS)
  const startWib = new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth() - 5, 1, 0, 0, 0))
  return new Date(startWib.getTime() - JAKARTA_OFFSET_MS).toISOString()
}

export function useAnalytics() {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['analytics', { userId: user?.id }],
    enabled: !!user?.id,
    staleTime: FIVE_MIN,
    gcTime: FIVE_MIN * 2,
    queryFn: async (): Promise<AnalyticsResult> => {
      const supabase = createClient()
      const now = new Date()

      // Defense in depth: RLS already restricts rows to the session user,
      // but the explicit user_id filter survives any RLS policy refactor
      // and makes the intent obvious to reviewers (per security.md §4).
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, amount, type, transacted_at, merchant_name, description,
          is_recurring, recurring_group_id,
          category:categories(id, name, icon, color)
        `)
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .gte('transacted_at', trendWindowStart(now))
        .order('transacted_at', { ascending: false })

      if (error) throw new Error(error.message || 'Gagal memuat analytics')

      const rows = (data ?? []) as Array<{
        id: string
        amount: number
        type: 'income' | 'expense' | 'transfer'
        transacted_at: string
        merchant_name: string | null
        description: string | null
        is_recurring: boolean | null
        recurring_group_id: string | null
        category:
          | { id: string; name: string; icon: string; color: string }
          | Array<{ id: string; name: string; icon: string; color: string }>
          | null
      }>

      const input: AnalyticsInput[] = rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        type: r.type,
        transacted_at: r.transacted_at,
        merchant_name: r.merchant_name,
        description: r.description,
        is_recurring: r.is_recurring,
        recurring_group_id: r.recurring_group_id,
        category: Array.isArray(r.category) ? (r.category[0] ?? null) : r.category,
      }))

      return aggregate(input, now)
    },
  })

  return { ...query, sessionLoading }
}
