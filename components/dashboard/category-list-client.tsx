'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CategoryForm } from '@/components/dashboard/category-form'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: string
  is_system: boolean | null
  user_id: string | null
}

interface CategoryListClientProps {
  categories: Category[]
}

const TYPE_LABEL: Record<string, string> = {
  expense: 'Pengeluaran',
  income: 'Pemasukan',
  transfer: 'Transfer',
}

export function CategoryListClient({ categories }: CategoryListClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Category | undefined>()

  function handleEdit(cat: Category) {
    setEditTarget(cat)
    setFormOpen(true)
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) setEditTarget(undefined)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        toast.error('Gagal menghapus kategori')
        return
      }
      toast.success('Kategori berhasil dihapus')
      setDeleteTarget(undefined)
      router.refresh()
    })
  }

  const userCategories = categories.filter(c => !c.is_system)
  const systemCategories = categories.filter(c => c.is_system)

  const groups: Array<{ label: string; type: string; items: Category[] }> = [
    { label: 'Pengeluaran', type: 'expense', items: [] },
    { label: 'Pemasukan', type: 'income', items: [] },
  ]

  for (const cat of userCategories) {
    const group = groups.find(g => g.type === cat.type)
    if (group) group.items.push(cat)
  }

  const hasCustom = userCategories.length > 0

  return (
    <>
      {/* Custom categories */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Kategori Kustom</h2>
        <Button size="sm" onClick={() => { setEditTarget(undefined); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah
        </Button>
      </div>

      {!hasCustom ? (
        <EmptyState
          title="Belum ada kategori kustom"
          description="Tambahkan kategori sendiri sesuai kebutuhan kamu"
          icon={<Plus className="h-12 w-12" />}
          action={{ label: 'Tambah Kategori', onClick: () => setFormOpen(true) }}
        />
      ) : (
        <div className="space-y-4 mb-6">
          {groups.filter(g => g.items.length > 0).map(group => (
            <div key={group.type}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
                {group.label}
              </p>
              <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {group.items.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 p-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>
                    <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(cat)}
                        aria-label={`Ubah ${cat.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(cat)}
                        aria-label={`Hapus ${cat.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System categories */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-foreground">Kategori Bawaan</h2>
          <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </div>
        <div className="space-y-4">
          {(['expense', 'income', 'transfer'] as const).map(type => {
            const items = systemCategories.filter(c => c.type === type)
            if (!items.length) return null
            return (
              <div key={type}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
                  {TYPE_LABEL[type]}
                </p>
                <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                  {items.map(cat => (
                    <div key={cat.id} className="flex items-center gap-3 p-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        {cat.icon.length <= 2 ? cat.icon : (
                          <span className="text-xs font-bold" style={{ color: cat.color }}>
                            {cat.name.slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">Bawaan</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <CategoryForm
        open={formOpen}
        onOpenChange={handleFormClose}
        category={editTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(undefined)}
        title="Hapus kategori?"
        description={`"${deleteTarget?.name}" akan dihapus. Transaksi yang menggunakan kategori ini tidak terpengaruh.`}
        confirmLabel="Hapus"
        onConfirm={confirmDelete}
        isPending={isPending}
      />
    </>
  )
}
