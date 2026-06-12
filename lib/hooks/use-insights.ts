import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/hooks/use-session'

export interface InsightsResult {
  insights: string[]
  generatedAt: string
  periodKey: string
}

interface InsightsEnvelope {
  data: InsightsResult | null
  error: { code: string; message: string } | null
}

const ONE_HOUR = 60 * 60 * 1000

export function useInsights() {
  const { user, loading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['insights', { userId: user?.id }],
    enabled: !!user?.id,
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR * 4,
    queryFn: async (): Promise<InsightsResult | null> => {
      const res = await fetch('/api/insights', { credentials: 'same-origin' })
      const json: InsightsEnvelope = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Gagal memuat wawasan')
      }
      return json.data
    },
  })

  return { ...query, sessionLoading }
}
