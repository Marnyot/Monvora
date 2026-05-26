'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f97316',
  '#ec4899', '#8b5cf6', '#ef4444', '#64748b',
  '#0ea5e9', '#84cc16', '#f59e0b', '#10b981',
]

const EMOJI_PRESETS = [
  '🍔', '🍕', '☕', '🛒', '⛽', '🚗', '🏠', '💡',
  '👕', '💊', '🏥', '🎓', '📚', '🎮', '🎬', '✈️',
  '📱', '💼', '🏋️', '💇', '🐾', '🎁', '🌿', '🎸',
  '💰', '📈', '🏢', '⭐', '💎', '🎉', '💵', '🤝',
  '💳', '🔑', '🏪', '🎯', '📦', '🌟', '💻', '🍜',
]

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: string
  is_system: boolean | null
}

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category
}

export function CategoryForm({ open, onOpenChange, category }: CategoryFormProps) {
  const isEdit = !!category
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: category?.name ?? '',
    type: (category?.type !== 'transfer' ? category?.type ?? 'expense' : 'expense') as 'expense' | 'income',
    icon: category?.icon ?? '🎯',
    color: category?.color ?? '#6366f1',
  })

  function handleChange(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: [] }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    if (!form.name.trim()) {
      setErrors({ name: ['Nama kategori wajib diisi'] })
      return
    }
    if (!form.icon.trim()) {
      setErrors({ icon: ['Pilih icon untuk kategori'] })
      return
    }

    startTransition(async () => {
      const url = isEdit ? `/api/categories/${category.id}` : '/api/categories'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        const details = json.error?.details
        if (details) setErrors(details)
        toast.error(json.error?.message ?? 'Terjadi kesalahan, coba lagi')
        setServerError(json.error?.message ?? 'Terjadi kesalahan, coba lagi')
        return
      }

      toast.success(isEdit ? 'Kategori berhasil diupdate' : 'Kategori berhasil ditambahkan')
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>{isEdit ? 'Ubah Kategori' : 'Tambah Kategori'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Ubah nama, icon, atau warna kategori' : 'Buat kategori kustom untuk transaksi kamu'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pb-4">
          {/* Type — only shown on create */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Tipe</Label>
              <Tabs value={form.type} onValueChange={v => handleChange('type', v)}>
                <TabsList className="w-full">
                  <TabsTrigger value="expense" className="flex-1">Pengeluaran</TabsTrigger>
                  <TabsTrigger value="income" className="flex-1">Pemasukan</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Nama Kategori</Label>
            <Input
              id="cat-name"
              placeholder="cth: Olahraga, Kopi, Langganan"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name[0]}</p>}
          </div>

          {/* Emoji picker */}
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
                style={{ backgroundColor: `${form.color}20` }}
              >
                {form.icon || '?'}
              </div>
              <Input
                value={form.icon}
                onChange={e => handleChange('icon', e.target.value.trim())}
                placeholder="Ketik emoji"
                className="w-28 text-center text-lg"
                maxLength={4}
              />
            </div>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_PRESETS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleChange('icon', emoji)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                    form.icon === emoji
                      ? 'ring-2 ring-primary ring-offset-1 ring-offset-background bg-accent'
                      : 'hover:bg-accent'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {errors.icon && <p className="text-xs text-destructive">{errors.icon[0]}</p>}
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Warna</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full transition-all"
                  style={{
                    backgroundColor: c,
                    outline: form.color === c ? `2px solid ${c}` : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                  onClick={() => handleChange('color', c)}
                  aria-label={`Pilih warna ${c}`}
                />
              ))}
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Kategori'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
