'use client'

import { useEffect, useRef } from 'react'
import { useSession } from '@/lib/hooks/use-session'

/**
 * Deteksi proaktif jika sesi Gmail (refresh token) sudah tidak valid.
 * Saat user benar-benar harus login ulang, langsung sign out + redirect
 * ke /login?reason=gmail_expired tanpa menunggu user menekan "Sync".
 */
export function GmailSessionGuard() {
  const { user, loading } = useSession()
  const handledRef = useRef(false)

  useEffect(() => {
    if (loading || !user?.id || handledRef.current) return

    let cancelled = false

    async function check() {
      try {
        const res = await fetch('/api/sync/status', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const { data } = await res.json()
        if (!data?.gmail_expired || handledRef.current) return

        handledRef.current = true
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
        window.location.href = '/login?reason=gmail_expired'
      } catch {
        // Network error — abaikan, akan dicek lagi di mount berikutnya.
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [user?.id, loading])

  return null
}
