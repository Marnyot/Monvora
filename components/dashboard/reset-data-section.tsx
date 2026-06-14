'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CONFIRM_WORD = 'RESET'

export function ResetDataSection() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isPending, setIsPending] = useState(false)

  function closeAndReset() {
    setOpen(false)
    setConfirmText('')
  }

  async function handleReset() {
    if (confirmText !== CONFIRM_WORD) return
    setIsPending(true)
    try {
      const res = await fetch('/api/transactions/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error?.message ?? 'Gagal mereset data')
      }
      const deleted = json?.data?.transactions_deleted ?? 0
      toast.success('Data berhasil direset', {
        description:
          deleted > 0
            ? `${deleted} transaksi dihapus, saldo wallet kembali ke 0.`
            : 'Tidak ada transaksi yang perlu dihapus.',
      })
      await queryClient.invalidateQueries()
      closeAndReset()
    } catch (err) {
      toast.error('Reset gagal', {
        description: err instanceof Error ? err.message : 'Coba lagi nanti.',
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground px-1">Zona berbahaya</h2>
      <div className="rounded-xl border border-destructive/30 bg-card overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-destructive/5 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-full p-2 bg-destructive/10 shrink-0">
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-destructive">Reset semua transaksi</p>
              <p className="text-xs text-muted-foreground">
                Hapus seluruh transaksi & kembalikan saldo wallet ke 0
              </p>
            </div>
          </div>
        </button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (isPending) return
          if (!next) closeAndReset()
          else setOpen(true)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-center">Reset semua transaksi?</DialogTitle>
            <DialogDescription className="text-center">
              Semua transaksi akan dihapus dan saldo wallet kembali ke 0. Wallet, kategori,
              dan budget tetap utuh. Aksi ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="reset-confirm" className="text-xs text-muted-foreground">
              Ketik <span className="font-mono font-semibold text-foreground">RESET</span> untuk lanjut
            </label>
            <Input
              id="reset-confirm"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="RESET"
              disabled={isPending}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeAndReset}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isPending || confirmText !== CONFIRM_WORD}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mereset...
                </>
              ) : (
                'Reset sekarang'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
