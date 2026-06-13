'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { UserRound } from 'lucide-react'

export function GuestLoginButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        setError('Tidak bisa memulai mode tamu. Coba lagi sebentar.')
        return
      }
      router.replace('/dashboard')
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="w-full gap-2 text-muted-foreground"
        onClick={handleClick}
        disabled={isPending}
      >
        <UserRound className="h-4 w-4" />
        {isPending ? 'Memulai mode tamu...' : 'Coba dulu sebagai tamu'}
      </Button>
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  )
}
