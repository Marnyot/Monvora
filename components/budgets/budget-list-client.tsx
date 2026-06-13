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
import { formatIDR } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'

function BudgetSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
          <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="h-1.5 w-full bg-muted rounded animate-pulse" />
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

  const budgets = data ?? []
  const totalRemaining = budgets.reduce((sum, b) => sum + b.utilization.remaining, 0)
  const remainingColor = totalRemaining < 0
    ? 'text-red-600 dark:text-red-400'
    : 'text-emerald-600 dark:text-emerald-400'

  return (
    <>
      <header className="flex items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Anggaran</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {budgets.length === 0 ? 'Belum ada budget' : `${budgets.length} budget aktif`}
          </p>
        </div>
        {budgets.length > 0 && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {totalRemaining < 0 ? 'Lebih anggaran' : 'Total tersisa'}
            </p>
            <p className={cn('text-lg font-bold tabular-nums', remainingColor)}>
              {totalRemaining < 0
                ? `-${formatIDR(Math.abs(totalRemaining))}`
                : formatIDR(totalRemaining)}
            </p>
          </div>
        )}
      </header>

      {sessionLoading || isLoading ? (
        <div className="space-y-3">
          <BudgetSkeleton />
          <BudgetSkeleton />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<AlertCircle className="h-10 w-10" />}
          title="Gagal memuat budget"
          description="Coba muat ulang halaman."
          action={{ label: 'Muat ulang', onClick: () => window.location.reload() }}
        />
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={<Target className="h-10 w-10" />}
          title="Belum ada budget"
          description="Atur batas pengeluaran agar lebih terkontrol."
          action={{ label: 'Tambah budget pertama', onClick: openCreate }}
        />
      ) : (
        <>
          <div className="space-y-3">
            {budgets.map((b) => (
              <BudgetCard
                key={b.id}
                budget={b}
                onEdit={() => openEdit(b)}
                onDelete={() => setDeleting(b)}
              />
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah budget
            </Button>
          </div>
        </>
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
