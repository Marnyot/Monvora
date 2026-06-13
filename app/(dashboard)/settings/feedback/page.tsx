'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Send, Bug, Sparkles, Heart, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  FEEDBACK_CATEGORIES,
  type FeedbackCategory,
} from '@/lib/validations/feedback'

const APP_VERSION = '0.3.0'

const CATEGORY_META: Record<
  FeedbackCategory,
  { label: string; description: string; icon: typeof Bug }
> = {
  bug: {
    label: 'Bug',
    description: 'Ada yang tidak berfungsi atau aneh',
    icon: Bug,
  },
  feature: {
    label: 'Ide fitur',
    description: 'Sesuatu yang ingin kamu lihat di Monvora',
    icon: Sparkles,
  },
  praise: {
    label: 'Apresiasi',
    description: 'Hal yang kamu suka',
    icon: Heart,
  },
  other: {
    label: 'Lainnya',
    description: 'Pertanyaan atau masukan umum',
    icon: HelpCircle,
  },
}

export default function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const charCount = body.trim().length
  const valid = charCount >= 5 && charCount <= 2000

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category,
          body: body.trim(),
          app_version: APP_VERSION,
          user_agent:
            typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal mengirim feedback')
        return
      }

      toast.success('Terima kasih atas feedback-nya!')
      setSubmitted(true)
      setBody('')
    } catch {
      toast.error('Gagal mengirim feedback. Coba lagi nanti.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Pengaturan
        </Link>

        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Feedback terkirim
            </h2>
            <p className="text-sm text-muted-foreground">
              Kami baca semua masukan. Terima kasih sudah bantu Monvora jadi lebih baik.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="outline" onClick={() => setSubmitted(false)}>
              Kirim lagi
            </Button>
            <Button asChild>
              <Link href="/dashboard">Kembali ke dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Pengaturan
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Kirim feedback</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bug, ide fitur, atau masukan apa pun — kami baca semuanya.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category selector */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground mb-2">
            Jenis feedback
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK_CATEGORIES.map((c) => {
              const meta = CATEGORY_META[c]
              const Icon = meta.icon
              const selected = category === c
              return (
                <label
                  key={c}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ${
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c}
                    checked={selected}
                    onChange={() => setCategory(c)}
                    className="sr-only"
                  />
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {meta.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {meta.description}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* Body */}
        <div className="space-y-2">
          <label
            htmlFor="feedback-body"
            className="text-sm font-medium text-foreground"
          >
            Pesan
          </label>
          <textarea
            id="feedback-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder={
              category === 'bug'
                ? 'Apa yang terjadi? Apa yang kamu harapkan?'
                : category === 'feature'
                ? 'Ceritakan ide-mu...'
                : 'Tulis di sini...'
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
          <p className="text-xs text-muted-foreground">
            {charCount} / 2000 karakter (minimal 5)
          </p>
        </div>

        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          Kami juga mencatat versi aplikasi dan browser untuk membantu debugging.
          Tidak ada konten transaksi atau merchant yang dikirim.
        </div>

        <Button
          type="submit"
          disabled={!valid || submitting}
          className="w-full gap-2"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitting ? 'Mengirim...' : 'Kirim feedback'}
        </Button>
      </form>
    </div>
  )
}
