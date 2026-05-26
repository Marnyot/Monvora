'use client'

import { useSession } from '@/lib/hooks/use-session'
import { useRealtimeTransactions } from '@/lib/hooks/use-realtime-transactions'

export function RealtimeProvider() {
  const { user } = useSession()
  useRealtimeTransactions(user?.id ?? '')
  return null
}
