'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function AutoRefresh({ interval = 15_000 }: { interval?: number }) {
  const router = useRouter()
  const ref = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    ref.current = setInterval(() => router.refresh(), interval)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [router, interval])

  return null
}
