'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { createWalletSchema, updateWalletSchema, WALLET_TYPES } from '@/lib/validations/wallet'

const TYPE_LABELS: Record<string, string> = {
  bank: 'Bank',
  ewallet: 'E-Wallet',
  cash: 'Tunai',
  other: 'Lainnya',
}

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f97316',
  '#ec4899', '#8b5cf6', '#ef4444', '#64748b',
]

interface Wallet {
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

interface WalletFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet?: Wallet
}

export function WalletForm({ open, onOpenChange, wallet }: WalletFormProps) {
  const isEdit = !!wallet
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: wallet?.name ?? '',
    type: (wallet?.type ?? 'bank') as typeof WALLET_TYPES[number],
    provider: wallet?.provider ?? '',
    balance: wallet?.balance ?? 0,
    color: wallet?.color ?? '#6366f1',
  })

  function handleChange(field: keyof typeof form, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: [] }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    const schema = isEdit ? updateWalletSchema : createWalletSchema
    const parsed = schema.safeParse({
      ...form,
      provider: form.provider || undefined,
    })

    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors)
      return
    }

    startTransition(async () => {
      const url = isEdit ? `/api/wallets/${wallet.id}` : '/api/wallets'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        setServerError(json.error?.message ?? 'Terjadi kesalahan, coba lagi')
        return
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>{isEdit ? 'Edit Wallet' : 'Tambah Wallet'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Ubah detail wallet kamu' : 'Tambahkan rekening, e-wallet, atau tunai'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pb-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="wallet-name">Nama Wallet</Label>
            <Input
              id="wallet-name"
              placeholder="cth: BCA Utama, GoPay"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name[0]}</p>}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Tipe</Label>
            <Select value={form.type} onValueChange={v => handleChange('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WALLET_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="wallet-provider">
              Provider <span className="text-muted-foreground">(opsional)</span>
            </Label>
            <Input
              id="wallet-provider"
              placeholder="cth: BCA, Mandiri, GoPay"
              value={form.provider}
              onChange={e => handleChange('provider', e.target.value)}
            />
          </div>

          {/* Balance */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="wallet-balance">Saldo Awal</Label>
              <Input
                id="wallet-balance"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                placeholder="0"
                value={form.balance || ''}
                onChange={e => handleChange('balance', parseInt(e.target.value, 10) || 0)}
              />
              {errors.balance && <p className="text-xs text-destructive">{errors.balance[0]}</p>}
            </div>
          )}

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Warna</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all"
                  style={{
                    backgroundColor: c,
                    ringColor: form.color === c ? c : 'transparent',
                    outline: form.color === c ? `2px solid ${c}` : '2px solid transparent',
                  }}
                  onClick={() => handleChange('color', c)}
                  aria-label={`Pilih warna ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Server error */}
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Wallet'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
