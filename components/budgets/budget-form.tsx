'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createBudgetSchema, updateBudgetSchema, BUDGET_PERIODS } from '@/lib/validations/budget'
import { useCategories } from '@/lib/hooks/use-categories'
import { parseAmountToInteger } from '@/lib/utils/currency'
import type { BudgetWithUtilization } from '@/lib/hooks/use-budgets'

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Mingguan',
  monthly: 'Bulanan',
  yearly: 'Tahunan',
}

const NO_CATEGORY = '__all__'

interface BudgetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget?: BudgetWithUtilization
}

export function BudgetForm({ open, onOpenChange, budget }: BudgetFormProps) {
  const isEdit = !!budget
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: categories } = useCategories()
  const expenseCategories = (categories ?? []).filter((c) => c.type === 'expense')

  const [form, setForm] = useState({
    name: budget?.name ?? '',
    amountText: budget ? String(budget.amount) : '',
    period: (budget?.period ?? 'monthly') as typeof BUDGET_PERIODS[number],
    category_id: budget?.category_id ?? '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    setErrors({})

    const amount = parseAmountToInteger(form.amountText)
    if (!amount || amount <= 0) {
      setErrors({ amount: ['Nominal harus lebih dari 0'] })
      return
    }

    const payload = {
      name: form.name.trim(),
      amount,
      period: form.period,
      category_id: form.category_id || null,
    }

    const schema = isEdit ? updateBudgetSchema : createBudgetSchema
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>)
      return
    }

    startTransition(async () => {
      const url = isEdit ? `/api/budgets/${budget.id}` : '/api/budgets'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        const msg = json.error?.message ?? 'Terjadi kesalahan, coba lagi'
        toast.error(msg)
        setServerError(msg)
        return
      }
      toast.success(isEdit ? 'Budget berhasil diperbarui' : 'Budget berhasil ditambahkan')
      await queryClient.invalidateQueries({ queryKey: ['budgets'] })
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>{isEdit ? 'Ubah Budget' : 'Tambah Budget'}</SheetTitle>
          <SheetDescription>
            Tentukan batas pengeluaran agar lebih terkendali.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="budget-name">Nama Budget</Label>
            <Input
              id="budget-name"
              placeholder="cth: Makan bulan ini"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Nominal Maksimal</Label>
            <Input
              id="budget-amount"
              inputMode="numeric"
              placeholder="cth: 1.000.000"
              value={form.amountText}
              onChange={(e) => setForm((f) => ({ ...f, amountText: e.target.value }))}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Periode</Label>
            <Select
              value={form.period}
              onValueChange={(v) => setForm((f) => ({ ...f, period: v as typeof BUDGET_PERIODS[number] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select
              value={form.category_id || NO_CATEGORY}
              onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === NO_CATEGORY ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>Semua pengeluaran</SelectItem>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Budget'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
