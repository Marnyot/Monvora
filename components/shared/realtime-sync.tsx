'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function RealtimeSync() {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        () => window.location.reload()
      )
      .subscribe()

    // Fallback: polling setiap 10 detik kalau Realtime gak konek
    const fallback = setInterval(() => window.location.reload(), 10_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(fallback)
    }
  }, [])

  return null
}
