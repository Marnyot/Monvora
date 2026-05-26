'use client'

import { useEffect } from 'react'

export function RealtimeSync() {
  useEffect(() => {
    const id = setInterval(() => location.reload(), 10_000)
    return () => clearInterval(id)
  }, [])

  return null
}
