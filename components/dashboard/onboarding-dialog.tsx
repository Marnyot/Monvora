'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, Plus, Mail, ChartPie } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Slide {
  icon: typeof Sparkles
  title: string
  body: string
  accent: string
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    title: 'Selamat datang di Monvora',
    body: 'Pencatat keuangan ringan yang merangkum pemasukan, pengeluaran, dan kebiasaan finansialmu — tanpa repot.',
    accent: 'bg-primary/10 text-primary',
  },
  {
    icon: Plus,
    title: 'Catat transaksi dalam hitungan detik',
    body: 'Tekan tombol + untuk input manual, atau unggah screenshot — OCR akan baca nominal & merchant otomatis.',
    accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: Mail,
    title: 'Hubungkan Gmail untuk auto-sync',
    body: 'Email notifikasi dari bank & e-wallet akan diubah jadi transaksi otomatis. Kamu cukup review & kategorikan.',
    accent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    icon: ChartPie,
    title: 'Pahami ke mana uangmu pergi',
    body: 'Lihat tren bulanan, kategori paling boros, dan langganan berulang — semua dalam satu dashboard.',
    accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
]

export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [isPending, setIsPending] = useState(false)

  const isLast = step === SLIDES.length - 1
  const slide = SLIDES[step]
  const Icon = slide.icon

  async function complete() {
    setIsPending(true)
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      router.refresh()
    } finally {
      onOpenChange(false)
      setIsPending(false)
    }
  }

  function handleNext() {
    if (isLast) {
      complete()
    } else {
      setStep((s) => s + 1)
    }
  }

  function handlePrev() {
    setStep((s) => Math.max(0, s - 1))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) complete()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        <div className="p-6 pb-4">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl mb-4',
              slide.accent,
            )}
            aria-hidden
          >
            <Icon className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg mb-1.5">{slide.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{slide.body}</DialogDescription>
        </div>

        <div className="px-6 pb-2 flex items-center justify-center gap-1.5" aria-hidden>
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>

        <div className="px-6 py-4 flex items-center justify-between gap-2 bg-muted/30 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={step === 0 ? complete : handlePrev}
            disabled={isPending}
          >
            {step === 0 ? 'Lewati' : 'Kembali'}
          </Button>
          <Button type="button" onClick={handleNext} disabled={isPending}>
            {isLast ? (isPending ? 'Menyimpan...' : 'Mulai sekarang') : 'Lanjut'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
