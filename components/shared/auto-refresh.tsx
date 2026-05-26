'use client'

import { useEffect } from 'react'

export function AutoRefresh({ interval = 10_000 }: { interval?: number }) {
  useEffect(() => {
    const id = setInterval(() => window.location.reload(), interval)
    return () => clearInterval(id)
  }, [interval])

  return null
}
