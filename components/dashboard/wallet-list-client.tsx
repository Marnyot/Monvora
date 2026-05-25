'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WalletCard } from '@/components/dashboard/wallet-card'
import { WalletForm } from '@/components/dashboard/wallet-form'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'

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

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Wallet Saya</h2>
        <Button size="sm" onClick={() => { setEditTarget(undefined); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah
        </Button>
      </div>

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
            />
          ))}
        </div>
      )}

      <WalletForm
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
    </>
  )
}
