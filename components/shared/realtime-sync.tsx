'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function RealtimeSync() {
  const unsubscribe = useRef<() => void>()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        () => window.location.reload()
      )
      .subscribe()

    unsubscribe.current = () => { supabase.removeChannel(channel) }
    return () => unsubscribe.current?.()
  }, [])

  return null
}
