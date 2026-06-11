'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribe ke perubahan transaksi & saldo via Supabase Realtime.
 * Saat ada INSERT/UPDATE/DELETE transaksi (atau UPDATE saldo wallet),
 * invalidasi SEMUA query yang menampilkan data tersebut agar UI ter-update
 * tanpa perlu refresh halaman.
 *
 * Catatan: dashboard & halaman lain kini client component (TanStack Query),
 * jadi router.refresh() tidak cukup — harus invalidate query cache.
 */
export function useRealtimeTransactions(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const handleChange = () => {
      // Prefix match — invalidate semua varian (dengan userId/page/filter di key)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    }

    const channel = supabase
      .channel(`transactions-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        handleChange
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        handleChange
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
