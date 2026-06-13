'use client'

import { useRef, useState } from 'react'
import { ScanLine, Loader2, X, Check, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatIDR } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'

export interface OcrResult {
  amount: number
  merchantName: string | null
  description: string | null
  transactedAt: string | null  // ISO
  paymentMethod: string | null
  categoryId: string | null
  categoryName: string | null
  confidence: number
}

interface OcrUploadProps {
  onApply: (result: OcrResult) => void
  className?: string
}

type Phase = 'idle' | 'processing' | 'review' | 'error'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  qris: 'QRIS',
  transfer: 'Transfer',
  cash: 'Tunai',
  debit: 'Debit',
  credit: 'Kartu Kredit',
  ewallet: 'E-Wallet',
  topup: 'Top Up',
  other: 'Lainnya',
}

const MAX_DIM = 1280

async function resizeAndEncode(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(MAX_DIM / bitmap.width, MAX_DIM / bitmap.height, 1)
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    // OffscreenCanvas widely supported; fall back to <canvas> if not.
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(w, h)
        : Object.assign(document.createElement('canvas'), { width: w, height: h })
    const ctx = (canvas as OffscreenCanvas | HTMLCanvasElement).getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null
    if (!ctx) throw new Error('Canvas context tidak tersedia')
    ctx.drawImage(bitmap, 0, 0, w, h)

    const blob =
      'convertToBlob' in canvas
        ? await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
        : await new Promise<Blob | null>((resolve) =>
            (canvas as HTMLCanvasElement).toBlob(resolve, 'image/jpeg', 0.85)
          )
    if (!blob) throw new Error('Tidak bisa mengubah gambar ke JPEG')

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca gambar'))
      reader.readAsDataURL(blob)
    })
  } finally {
    bitmap.close?.()
  }
}

export function OcrUpload({ onApply, className }: OcrUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<OcrResult | null>(null)

  async function handleFile(file: File) {
    setErrorMessage(null)
    setResult(null)
    setPhase('processing')

    try {
      const dataUrl = await resizeAndEncode(file)
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
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
        description: json.data.description,
        transactedAt: json.data.transacted_at,
        paymentMethod: json.data.payment_method,
        categoryId: json.data.category_id,
        categoryName: json.data.category_name,
        confidence: json.data.confidence,
      }
      setResult(parsed)
      setPhase('review')
    } catch (err) {
      console.error('[ocr-upload] failed', err)
      const msg = err instanceof Error ? err.message : 'OCR gagal'
      setErrorMessage(msg)
      setPhase('error')
    }
  }

  function reset() {
    setPhase('idle')
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
        accept="image/jpeg,image/png,image/webp"
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
          <Sparkles className="h-4 w-4 mr-1.5 text-primary" />
          Scan struk dengan AI
        </Button>
      )}

      {phase === 'processing' && (
        <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Menganalisis struk dengan AI…</p>
            <p className="text-[10px] text-muted-foreground">Biasanya 3-8 detik</p>
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
            <ScanLine className="h-4 w-4 mr-1.5" />
            Coba foto lain
          </Button>
        </div>
      )}

      {phase === 'review' && result && (
        <div className="rounded-lg border bg-card p-3 space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <p className="text-xs font-semibold flex items-center gap-1 min-w-0">
              <Sparkles className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">Hasil scan AI</span>
            </p>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
              {Math.round(result.confidence * 100)}% yakin
            </span>
          </div>
          <dl className="text-xs space-y-1 min-w-0">
            <div className="flex justify-between gap-2 min-w-0">
              <dt className="text-muted-foreground shrink-0">Nominal</dt>
              <dd className="tabular-nums font-medium text-right break-words min-w-0">{formatIDR(result.amount)}</dd>
            </div>
            {result.merchantName && (
              <div className="flex justify-between gap-2 min-w-0">
                <dt className="text-muted-foreground shrink-0">Merchant</dt>
                <dd className="text-right break-words min-w-0">{result.merchantName}</dd>
              </div>
            )}
            {result.categoryName && (
              <div className="flex justify-between gap-2 min-w-0">
                <dt className="text-muted-foreground shrink-0">Kategori</dt>
                <dd className="text-right break-words min-w-0">
                  {result.categoryName}
                  {!result.categoryId && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-1">(perlu pilih)</span>
                  )}
                </dd>
              </div>
            )}
            {result.description && (
              <div className="flex justify-between gap-2 min-w-0">
                <dt className="text-muted-foreground shrink-0">Item</dt>
                <dd className="text-right break-words min-w-0">{result.description}</dd>
              </div>
            )}
            {result.transactedAt && (
              <div className="flex justify-between gap-2 min-w-0">
                <dt className="text-muted-foreground shrink-0">Tanggal</dt>
                <dd className="text-right break-words min-w-0">{formatDate(result.transactedAt)}</dd>
              </div>
            )}
            {result.paymentMethod && (
              <div className="flex justify-between gap-2 min-w-0">
                <dt className="text-muted-foreground shrink-0">Metode</dt>
                <dd className="text-right break-words min-w-0">{PAYMENT_METHOD_LABELS[result.paymentMethod] ?? result.paymentMethod}</dd>
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
