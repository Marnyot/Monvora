'use client'

import { useRef, useState } from 'react'
import { ScanLine, Loader2, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatIDR } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'

export interface OcrResult {
  amount: number
  merchantName: string | null
  transactedAt: string | null  // ISO
  paymentMethod: 'qris' | 'ewallet' | 'transfer' | null
  confidence: number
}

interface OcrUploadProps {
  onApply: (result: OcrResult) => void
  className?: string
}

type Phase = 'idle' | 'recognizing' | 'parsing' | 'review' | 'error'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  qris: 'QRIS',
  ewallet: 'E-Wallet',
  transfer: 'Transfer',
}

export function OcrUpload({ onApply, className }: OcrUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<OcrResult | null>(null)

  async function handleFile(file: File) {
    setErrorMessage(null)
    setResult(null)
    setProgress(0)
    setPhase('recognizing')

    try {
      // Lazy-load tesseract.js to avoid pulling 2MB+ into the initial bundle
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })

      const url = URL.createObjectURL(file)
      try {
        const { data } = await worker.recognize(url)
        const text = data.text ?? ''

        setPhase('parsing')
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        const json = await res.json()

        if (!res.ok || json.error) {
          const msg = json.error?.message ?? 'Tidak bisa membaca struk'
          setErrorMessage(msg)
          setPhase('error')
          return
        }

        const parsed: OcrResult = {
          amount: json.data.amount,
          merchantName: json.data.merchant_name,
          transactedAt: json.data.transacted_at,
          paymentMethod: json.data.payment_method,
          confidence: json.data.confidence,
        }
        setResult(parsed)
        setPhase('review')
      } finally {
        URL.revokeObjectURL(url)
        await worker.terminate()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OCR gagal'
      setErrorMessage(msg)
      setPhase('error')
    }
  }

  function reset() {
    setPhase('idle')
    setProgress(0)
    setErrorMessage(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function apply() {
    if (!result) return
    onApply(result)
    toast.success('Hasil scan diisikan ke form')
    reset()
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />

      {phase === 'idle' && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          <ScanLine className="h-4 w-4 mr-1.5" />
          Scan struk dari foto
        </Button>
      )}

      {(phase === 'recognizing' || phase === 'parsing') && (
        <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">
              {phase === 'recognizing' ? 'Membaca teks dari gambar…' : 'Menganalisis hasil…'}
            </p>
            {phase === 'recognizing' && (
              <div className="h-1 mt-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="Batalkan"
            onClick={reset}
            className="p-1 rounded text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
          <p className="text-xs text-destructive">{errorMessage}</p>
          <Button type="button" size="sm" variant="outline" onClick={reset}>
            Coba lagi
          </Button>
        </div>
      )}

      {phase === 'review' && result && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Hasil scan</p>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {Math.round(result.confidence * 100)}% yakin
            </span>
          </div>
          <dl className="text-xs space-y-1">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Nominal</dt>
              <dd className="tabular-nums font-medium">{formatIDR(result.amount)}</dd>
            </div>
            {result.merchantName && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground shrink-0">Merchant</dt>
                <dd className="truncate max-w-[60%] text-right">{result.merchantName}</dd>
              </div>
            )}
            {result.transactedAt && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Tanggal</dt>
                <dd className="text-right">{formatDate(result.transactedAt)}</dd>
              </div>
            )}
            {result.paymentMethod && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Metode</dt>
                <dd className="text-right">{PAYMENT_METHOD_LABELS[result.paymentMethod] ?? result.paymentMethod}</dd>
              </div>
            )}
          </dl>
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" className="flex-1" onClick={reset}>
              Ulangi
            </Button>
            <Button type="button" size="sm" className="flex-1" onClick={apply}>
              <Check className="h-4 w-4 mr-1" />
              Gunakan
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
