'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function RealtimeSync() {
  const router = useRouter()
  const ref = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        () => router.refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
