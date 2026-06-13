'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface GuestBannerProps {
  isGuest: boolean
}

export function GuestBanner({ isGuest }: GuestBannerProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isGuest) return null

  async function handleUpgrade() {
    setError(null)
    setIsPending(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) {
        setError('Tidak bisa menghubungkan akun Google. Coba lagi.')
        setIsPending(false)
        return
      }
      if (data?.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
      setIsPending(false)
    }
  }

  return (
    <section
      className="mx-4 mb-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
      aria-label="Upgrade dari mode tamu"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Kamu lagi di mode tamu</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Daftar dengan Google untuk menyimpan transaksimu permanen dan menyalakan auto-sync Gmail. Datamu yang sudah dicatat sekarang akan ikut tertaut, tidak hilang.
          </p>
          {error && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}
          <Button
            type="button"
            size="sm"
            className="mt-3"
            onClick={handleUpgrade}
            disabled={isPending}
          >
            {isPending ? 'Mengarahkan...' : 'Daftar & simpan data'}
          </Button>
        </div>
      </div>
    </section>
  )
}
