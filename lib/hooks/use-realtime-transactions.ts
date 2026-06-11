'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeTransactions(userId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      router.refresh()
    }
    const channel = supabase
      .channel(`transactions-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        handleRefresh
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        handleRefresh
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient, router])
}
