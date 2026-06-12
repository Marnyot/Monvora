import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/hooks/use-session'
import type { AnalyticsResult } from '@/lib/analytics/aggregate'

interface AnalyticsEnvelope {
  data: AnalyticsResult | null
  error: { code: string; message: string } | null
}

const FIVE_MIN = 5 * 60 * 1000

export function useAnalytics() {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['analytics', { userId: user?.id }],
    enabled: !!user?.id,
    staleTime: FIVE_MIN,
    gcTime: FIVE_MIN * 2,
    queryFn: async (): Promise<AnalyticsResult> => {
      const res = await fetch('/api/analytics', { credentials: 'same-origin' })
      const json: AnalyticsEnvelope = await res.json()
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? 'Gagal memuat analytics')
      }
      return json.data
    },
  })

  return { ...query, sessionLoading }
}
