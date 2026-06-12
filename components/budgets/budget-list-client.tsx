'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, AlertCircle, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useBudgets, type BudgetWithUtilization } from '@/lib/hooks/use-budgets'
import { BudgetCard } from './budget-card'
import { BudgetForm } from './budget-form'

function BudgetSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex justify-between gap-2">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="h-2 w-full bg-muted rounded animate-pulse" />
      <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
    </div>
  )
}

export function BudgetListClient() {
  const { data, isLoading, isError, sessionLoading } = useBudgets()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetWithUtilization | undefined>(undefined)
  const [deleting, setDeleting] = useState<BudgetWithUtilization | undefined>(undefined)
  const [deletePending, setDeletePending] = useState(false)

  async function handleDelete() {
    if (!deleting) return
    setDeletePending(true)
    try {
      const res = await fetch(`/api/budgets/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error?.message ?? 'Gagal menghapus budget')
        return
      }
      toast.success('Budget dihapus')
      await queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setDeleting(undefined)
    } finally {
      setDeletePending(false)
    }
  }

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(b: BudgetWithUtilization) {
    setEditing(b)
    setFormOpen(true)
  }

  if (sessionLoading || isLoading) {
    return (
      <div className="space-y-3">
        <BudgetSkeleton />
        <BudgetSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-10 w-10" />}
        title="Gagal memuat budget"
        description="Coba muat ulang halaman."
        action={{ label: 'Muat ulang', onClick: () => window.location.reload() }}
      />
    )
  }

  const budgets = data ?? []

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs text-muted-foreground">
          {budgets.length === 0
            ? 'Belum ada budget'
            : `${budgets.length} budget aktif`}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah
        </Button>
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          icon={<Target className="h-10 w-10" />}
          title="Belum ada budget"
          description="Atur batas pengeluaran agar lebih terkontrol."
          action={{ label: 'Tambah budget pertama', onClick: openCreate }}
        />
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => (
            <BudgetCard key={b.id} budget={b} onEdit={() => openEdit(b)} onDelete={() => setDeleting(b)} />
          ))}
        </div>
      )}

      <BudgetForm open={formOpen} onOpenChange={setFormOpen} budget={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Hapus budget?"
        description={deleting ? `Budget "${deleting.name}" akan dihapus.` : ''}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deletePending}
      />
    </>
  )
}
