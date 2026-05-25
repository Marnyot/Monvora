'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAYMENT_METHODS } from '@/lib/validations/transaction'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  qris: 'QRIS',
  transfer: 'Transfer',
  cash: 'Tunai',
  debit: 'Debit',
  credit: 'Kartu Kredit',
  ewallet: 'E-Wallet',
  other: 'Lainnya',
}

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: string
  is_system: boolean | null
}

interface Wallet {
  id: string
  name: string
  color: string | null
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  merchant_name: string | null
  payment_method: string | null
  transacted_at: string
  wallet: Wallet | null
  category: Category | null
}

interface TransactionEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction
  wallets: Wallet[]
  categories: Category[]
}

export function TransactionEditSheet({
  open,
  onOpenChange,
  transaction,
  wallets,
  categories,
}: TransactionEditSheetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [merchantName, setMerchantName] = useState(transaction.merchant_name ?? '')
  const [description, setDescription] = useState(transaction.description ?? '')
  const [categoryId, setCategoryId] = useState(transaction.category?.id ?? '')
  const [paymentMethod, setPaymentMethod] = useState(transaction.payment_method ?? '')
  const [transactedAt, setTransactedAt] = useState(
    new Date(transaction.transacted_at).toISOString().slice(0, 16)
  )

  const filteredCategories = categories.filter(c => c.type === transaction.type)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_name: merchantName || undefined,
          description: description || undefined,
          category_id: categoryId || undefined,
          payment_method: paymentMethod || undefined,
          transacted_at: new Date(transactedAt).toISOString(),
        }),
      })

      const json = await res.json()
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? 'Terjadi kesalahan')
        return
      }

      toast.success('Transaksi berhasil diupdate')
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle>Edit Transaksi</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 py-4">
              {/* Merchant */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-merchant">Merchant / Toko</Label>
                <Input
                  id="edit-merchant"
                  value={merchantName}
                  onChange={e => setMerchantName(e.target.value)}
                  placeholder="cth: Indomaret, Grab"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <div className="flex flex-wrap gap-2">
                  {filteredCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        categoryId === cat.id
                          ? 'text-white border-transparent'
                          : 'text-foreground border-border bg-background hover:bg-accent'
                      }`}
                      style={categoryId === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-1.5">
                <Label>Metode Bayar</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih metode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m] ?? m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-date">Tanggal & Waktu</Label>
                <Input
                  id="edit-date"
                  type="datetime-local"
                  value={transactedAt}
                  onChange={e => setTransactedAt(e.target.value)}
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-note">Catatan</Label>
                <Input
                  id="edit-note"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Catatan tambahan"
                />
              </div>
            </div>
          </ScrollArea>

          <div className="px-4 py-4 border-t bg-background">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
