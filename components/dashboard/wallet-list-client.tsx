'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Wallet, Target, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { WalletCard } from '@/components/dashboard/wallet-card'
import { WalletForm } from '@/components/dashboard/wallet-form'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { toast } from 'sonner'

interface WalletRow {
  id: string
  name: string
  type: string
  provider: string | null
  balance: number | null
  color: string | null
  icon: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

interface WalletListClientProps {
  wallets: WalletRow[]
}

export function WalletListClient({ wallets }: WalletListClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WalletRow | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<WalletRow | undefined>()
  const [balanceTarget, setBalanceTarget] = useState<WalletRow | undefined>()
  const [balanceRaw, setBalanceRaw] = useState('')

  function handleEdit(wallet: WalletRow) {
    setEditTarget(wallet)
    setFormOpen(true)
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) setEditTarget(undefined)
  }

  function handleDelete(wallet: WalletRow) {
    setDeleteTarget(wallet)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await fetch(`/api/wallets/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(undefined)
      router.refresh()
    })
  }

  function handleAdjustBalance(wallet: WalletRow) {
    setBalanceTarget(wallet)
    setBalanceRaw(String(wallet.balance ?? 0))
  }

  function handleBalanceInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    setBalanceRaw(raw)
  }

  function confirmAdjustBalance() {
    if (!balanceTarget) return
    const newBalance = parseInt(balanceRaw, 10)
    if (isNaN(newBalance) || newBalance < 0) return
    startTransition(async () => {
      const res = await fetch(`/api/wallets/${balanceTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? 'Terjadi kesalahan')
        return
      }
      toast.success('Saldo berhasil diperbarui')
      setBalanceTarget(undefined)
      router.refresh()
    })
  }

  return (
    <>
      {/* Gradient header card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-emerald-600/80 p-5 mb-5 text-primary-foreground shadow-lg">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-blob pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-blob-delayed pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4" />
              <h1 className="text-lg font-bold">Dompet Saya</h1>
            </div>
            <p className="text-sm opacity-80">{wallets.length} dompet terdaftar</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="bg-white/20 text-white hover:bg-white/30 border-0"
            onClick={() => { setEditTarget(undefined); setFormOpen(true) }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
        </div>
      </div>

      <Link
        href="/budgets"
        className="flex items-center justify-between rounded-xl bg-card p-4 mb-4 border border-border/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Anggaran Bulanan</p>
            <p className="text-xs text-muted-foreground">Atur batas pengeluaran per kategori</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
      </Link>

      {wallets.length === 0 ? (
        <EmptyState
          title="Belum ada wallet"
          description="Tambahkan rekening bank, e-wallet, atau tunai kamu"
          icon={<Wallet className="h-12 w-12" />}
          action={{ label: 'Tambah Wallet', onClick: () => setFormOpen(true) }}
        />
      ) : (
        <div className="space-y-2">
          {wallets.map(wallet => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdjustBalance={handleAdjustBalance}
            />
          ))}
        </div>
      )}

      <WalletForm
        key={editTarget?.id ?? 'new'}
        open={formOpen}
        onOpenChange={handleFormClose}
        wallet={editTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(undefined)}
        title="Hapus wallet?"
        description={`"${deleteTarget?.name}" akan dihapus dan tidak bisa dikembalikan.`}
        confirmLabel="Hapus"
        onConfirm={confirmDelete}
        isPending={isPending}
      />

      <Dialog open={!!balanceTarget} onOpenChange={open => !open && setBalanceTarget(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sesuaikan Saldo — {balanceTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="adjust-balance">Saldo baru (Rp)</Label>
            <Input
              id="adjust-balance"
              inputMode="numeric"
              value={balanceRaw}
              onChange={handleBalanceInput}
              placeholder="0"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceTarget(undefined)}>Batal</Button>
            <Button onClick={confirmAdjustBalance} disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
