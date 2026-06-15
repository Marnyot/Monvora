'use client'

import { useEffect, useRef } from 'react'
import { useSession } from '@/lib/hooks/use-session'

/**
 * Deteksi sesi Gmail (refresh token) sudah tidak valid.
 *
 * Logout TIDAK dipicu oleh satu kegagalan tunggal — supaya network blip
 * di PWA mobile tidak nyasar bikin user ke-logout. Butuh 2 strike beruntun
 * (dari mount terpisah, jeda min 60 detik) sebelum baru force logout.
 *
 * Strike disimpan di localStorage agar persisten antar cold-start PWA.
 */

const STRIKE_KEY = 'monvora:gmail_expired_strikes'
const LAST_STRIKE_KEY = 'monvora:gmail_expired_last_at'
const MIN_INTERVAL_MS = 60 * 1000 // 1 menit jeda antar strike
const STRIKES_TO_LOGOUT = 2

function readStrikes(): { count: number; lastAt: number } {
  try {
    const count = Number(localStorage.getItem(STRIKE_KEY) ?? '0') || 0
    const lastAt = Number(localStorage.getItem(LAST_STRIKE_KEY) ?? '0') || 0
    return { count, lastAt }
  } catch {
    return { count: 0, lastAt: 0 }
  }
}

function writeStrikes(count: number, lastAt: number) {
  try {
    localStorage.setItem(STRIKE_KEY, String(count))
    localStorage.setItem(LAST_STRIKE_KEY, String(lastAt))
  } catch {
    /* storage tidak tersedia — abaikan */
  }
}

function clearStrikes() {
  try {
    localStorage.removeItem(STRIKE_KEY)
    localStorage.removeItem(LAST_STRIKE_KEY)
  } catch {
    /* storage tidak tersedia — abaikan */
  }
}

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

        if (!data?.gmail_expired) {
          clearStrikes()
          return
        }

        const now = Date.now()
        const { count, lastAt } = readStrikes()

        // Strike pertama (atau jeda dari strike sebelumnya cukup lama)
        if (count === 0 || now - lastAt < MIN_INTERVAL_MS) {
          // count==0 → strike pertama; jeda terlalu pendek → jangan count
          // dua kali strike yang asalnya sama (mis. user buka tutup app cepat)
          const nextCount = count === 0 ? 1 : count
          writeStrikes(nextCount, now)
          return
        }

        // Strike kedua+ dengan jeda yang cukup — confirmed expiration
        const nextCount = count + 1
        writeStrikes(nextCount, now)

        if (nextCount < STRIKES_TO_LOGOUT || handledRef.current) return

        handledRef.current = true
        clearStrikes()
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
